import React from 'react'
import {
  DataTable,
  Checkbox,
  Badge,
  Input,
  Spinner,
  Button,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowSquareOutIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { AlternativesModal } from './AlternativesModal'
import { ProductAlternative, RecommendedProduct } from '../types'

const DATA_TEST_ID_PREFIX = 'RecommendedProductsStep'

interface RecommendedProductsStepProps {
  products: RecommendedProduct[]
  isLoading: boolean
  loadingStepIndex: number
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelectionChange: (productId: string, isSelected: boolean) => void
  onQuantityChange: (productId: string, quantity: number) => void
  onFetchAlternatives: (category: string, currentSku: string) => Promise<ProductAlternative[]>
  onSelectAlternative: (productId: string, alternative: ProductAlternative) => void
}

const AI_LOADING_STEPS = [
  'Analyzing restaurant menu…',
  'Mapping dishes to ingredients…',
  'Matching ingredients to Selgros SKUs…',
  'Estimating demand and order quantities…',
  'Generating recommendations…'
] as const

// Cell Component: Product Name
interface ProductNameCellProps {
  product: RecommendedProduct
}

const ProductNameCell: React.FC<ProductNameCellProps> = ({ product }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2"
    data-testid={`${DATA_TEST_ID_PREFIX}-product-name-${product.id}`}
  >
    <div className="gba:flex gba:flex-col gba:min-w-0">
      <span className="gba:font-medium gba:truncate" title={product.name}>
        {product.name}
      </span>
      <span className="gba:text-xs gba:text-muted-foreground">{product.sku}</span>
    </div>
  </div>
)

// Cell Component: Quantity
interface QuantityCellProps {
  product: RecommendedProduct
  onQuantityChange: (productId: string, quantity: number) => void
}

const QuantityCell: React.FC<QuantityCellProps> = ({ product, onQuantityChange }) => (
  <div
    className="gba:flex gba:items-center gba:gap-2"
    onClick={e => e.stopPropagation()}
    onMouseDown={e => e.stopPropagation()}
  >
    <Input
      type="number"
      min={1}
      value={product.quantity}
      onChange={e => onQuantityChange(product.id, parseInt(e.target.value) || 1)}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      className="gba:w-20 gba:text-center"
      data-testid={`${DATA_TEST_ID_PREFIX}-quantity-input-${product.id}`}
    />
    <span className="gba:text-sm gba:text-muted-foreground">{product.unitOfMeasure}</span>
  </div>
)

// Cell Component: Stock (read-only)
interface StockCellProps {
  product: RecommendedProduct
}

const StockCell: React.FC<StockCellProps> = ({ product }) => (
  <div className="gba:text-center" data-testid={`${DATA_TEST_ID_PREFIX}-stock-${product.id}`}>
    <span className="gba:font-medium">{product.stock ?? '-'}</span>
  </div>
)

// Cell Component: Price
interface PriceCellProps {
  product: RecommendedProduct
}

const PriceCell: React.FC<PriceCellProps> = ({ product }) => {
  const totalPrice = product.pricePerUnit * product.quantity
  return (
    <div className="gba:text-right" data-testid={`${DATA_TEST_ID_PREFIX}-price-${product.id}`}>
      <div className="gba:font-semibold gba:text-primary">
        {totalPrice.toFixed(2)} {product.currency}
      </div>
      <div className="gba:text-xs gba:text-muted-foreground">
        {product.pricePerUnit.toFixed(2)} / {product.unitOfMeasure}
      </div>
    </div>
  )
}

export const RecommendedProductsStep: React.FC<RecommendedProductsStepProps> = ({
  products,
  isLoading,
  loadingStepIndex,
  searchTerm,
  onSearchChange,
  onSelectionChange,
  onQuantityChange,
  onFetchAlternatives,
  onSelectAlternative
}) => {
  const [alternativesModalOpen, setAlternativesModalOpen] = React.useState(false)
  const [activeProduct, setActiveProduct] = React.useState<RecommendedProduct | null>(null)
  const [alternatives, setAlternatives] = React.useState<ProductAlternative[]>([])
  const [isLoadingAlternatives, setIsLoadingAlternatives] = React.useState(false)

  const handleOpenAlternatives = async (product: RecommendedProduct) => {
    setActiveProduct(product)
    setAlternativesModalOpen(true)
    setIsLoadingAlternatives(true)
    try {
      const results = await onFetchAlternatives(product.category, product.sku)
      setAlternatives(results)
    } catch {
      setAlternatives([])
    } finally {
      setIsLoadingAlternatives(false)
    }
  }

  const handleSelectAlternative = (alternative: ProductAlternative) => {
    if (!activeProduct) return
    onSelectAlternative(activeProduct.id, alternative)
    setAlternativesModalOpen(false)
  }

  // Filtered products based on search
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm) return products
    const term = searchTerm.toLowerCase()
    return products.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    )
  }, [products, searchTerm])

  console.log(' filteredProducts', filteredProducts)

  // Check for products with quantity exceeding stock
  const productsExceedingStock = React.useMemo(() => {
    return products.filter(p => p.isSelected && p.stock !== undefined && p.quantity > p.stock)
  }, [products])

  const hasStockExceeded = productsExceedingStock.length > 0

  // Column definitions
  const columns = React.useMemo<ColumnDef<RecommendedProduct>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={value => {
                table.toggleAllPageRowsSelected(!!value)
                products.forEach(p => onSelectionChange(p.id, !!value))
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <Checkbox
              checked={row.original.isSelected}
              onCheckedChange={value => onSelectionChange(row.original.id, !!value)}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              aria-label="Select row"
              data-testid={`${DATA_TEST_ID_PREFIX}-checkbox-${row.original.id}`}
            />
          </div>
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Product',
        size: 280,
        cell: ({ row }) => <ProductNameCell product={row.original} />
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        size: 140,
        cell: ({ row }) => (
          <Badge variant="outline" className="gba:whitespace-nowrap">
            {row.original.category}
          </Badge>
        )
      },
      {
        id: 'brand',
        accessorKey: 'brand',
        header: 'Brand',
        size: 120,
        cell: ({ row }) => <span className="gba:text-sm">{row.original.brand}</span>
      },
      {
        id: 'stock',
        accessorKey: 'stock',
        header: () => <div className="gba:text-center">Stock</div>,
        size: 100,
        cell: ({ row }) => <StockCell product={row.original} />
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 150,
        cell: ({ row }) => <QuantityCell product={row.original} onQuantityChange={onQuantityChange} />
      },
      {
        id: 'price',
        accessorKey: 'pricePerUnit',
        header: () => <div className="gba:text-right">Price</div>,
        size: 130,
        cell: ({ row }) => <PriceCell product={row.original} />
      },
      {
        id: 'actions',
        header: () => <div className="gba:text-center">Alternatives</div>,
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className="gba:flex gba:justify-center"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={e => {
                e.stopPropagation()
                handleOpenAlternatives(row.original)
              }}
              disabled={isLoadingAlternatives || !row.original.category}
              title={row.original.category ? 'View alternatives' : 'No category available'}
              data-testid={`${DATA_TEST_ID_PREFIX}-alternatives-btn-${row.original.id}`}
            >
              <ArrowSquareOutIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              View
            </Button>
          </div>
        )
      }
    ],
    [products, onSelectionChange, onQuantityChange, onFetchAlternatives, isLoadingAlternatives]
  )

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:min-h-0"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="gba:mb-4 gba:shrink-0">
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">AI Recommended Products</h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          Review and select the products recommended by AI based on the restaurant menu.
        </p>
      </div>

      {/* AI Loading / Status */}
      {isLoading && (
        <div className="gba:mb-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4 gba:shrink-0">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted">
              <Spinner size="sm" />
            </div>
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <p className="gba:text-sm gba:font-semibold">AI recommendation engine</p>
                <Badge variant="secondary" className="gba:whitespace-nowrap">
                  Generating
                </Badge>
              </div>
              <p className="gba:text-base gba:mt-2">{AI_LOADING_STEPS[loadingStepIndex]}</p>
              <div className="gba:mt-3 gba:grid gba:grid-cols-1 gba:gap-2 md:gba:grid-cols-2">
                {AI_LOADING_STEPS.map((step, index) => (
                  <div key={step} className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <div
                      className={`gba:h-2 gba:w-2 gba:rounded-full ${
                        index <= loadingStepIndex ? 'gba:bg-primary' : 'gba:bg-muted'
                      }`}
                    />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Exceeded Warning */}
      {!isLoading && hasStockExceeded && (
        <Alert
          variant="destructive"
          className="gba:mb-4 gba:shrink-0 gba:w-full"
          data-testid={`${DATA_TEST_ID_PREFIX}-stock-warning`}
        >
          <AlertTitle>Stock exceeded</AlertTitle>
          <AlertDescription className="gba:mt-2">
            {productsExceedingStock.length === 1
              ? `The selected product "${productsExceedingStock[0].name}" has a quantity greater than available stock (${productsExceedingStock[0].stock}).`
              : `${productsExceedingStock.length} selected products have quantities greater than available stock.`}
            <span className="gba:block gba:mt">
              Please deselect these products or reduce their quantities to match available stock.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      {!isLoading && (
        <div className="gba:mb-4 gba:relative gba:max-w-sm gba:shrink-0">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="gba:pl-10"
            data-testid={`${DATA_TEST_ID_PREFIX}-search-input`}
          />
        </div>
      )}

      {/* Data Table */}
      <div
        className="gba:flex-1 gba:overflow-y-auto gba:min-h-0"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
            AI is preparing your recommendations…
          </div>
        ) : (
          <div onClick={e => e.stopPropagation()}>
            <DataTable<RecommendedProduct>
              data={filteredProducts}
              columns={columns}
              enablePagination
              enableSorting
              enableSelection={false}
              rowsPerPageOptions={[10, 20, 50]}
              emptyMessage="No recommended products found"
              data-testid={`${DATA_TEST_ID_PREFIX}-table`}
            />
          </div>
        )}
      </div>
      <AlternativesModal
        open={alternativesModalOpen}
        onOpenChange={setAlternativesModalOpen}
        productName={activeProduct?.name || ''}
        alternatives={alternatives}
        isLoading={isLoadingAlternatives}
        onSelectAlternative={handleSelectAlternative}
      />
    </div>
  )
}
