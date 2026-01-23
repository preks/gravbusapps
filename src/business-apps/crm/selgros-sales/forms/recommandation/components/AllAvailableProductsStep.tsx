import React from 'react'
import {
  DataTable,
  Checkbox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Badge,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { PackageIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { RecommendedProduct } from '../types'

const DATA_TEST_ID_PREFIX = 'AllAvailableProductsStep'

interface AllAvailableProductsStepProps {
  products: RecommendedProduct[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelectionChange: (productId: string, isSelected: boolean) => void
  onQuantityChange: (productId: string, quantity: number) => void
  onPriceChange: (productId: string, price: number) => void
  onMount?: () => void // Callback when component mounts
}

// Cell Component: Product Name with Image
interface ProductNameCellProps {
  product: RecommendedProduct
}

const ProductNameCell: React.FC<ProductNameCellProps> = ({ product }) => (
  <div
    className="gba:flex gba:items-center gba:gap-3"
    data-testid={`${DATA_TEST_ID_PREFIX}-product-name-${product.id}`}
  >
    <Avatar className="gba:h-10 gba:w-10 gba:rounded-md">
      <AvatarImage src={product.imageUrl} alt={product.name} className="gba:object-cover" />
      <AvatarFallback className="gba:rounded-md">
        <PackageIcon className="gba:w-4 gba:h-4" />
      </AvatarFallback>
    </Avatar>
    <div className="gba:flex gba:flex-col gba:min-w-0">
      <span className="gba:font-medium gba:truncate" title={product.name}>
        {product.name}
      </span>
      <span className="gba:text-xs gba:text-muted-foreground">{product.sku}</span>
    </div>
  </div>
)

// Cell Component: Stock (read-only)
interface StockCellProps {
  product: RecommendedProduct
}

const StockCell: React.FC<StockCellProps> = ({ product }) => (
  <div className="gba:text-center" data-testid={`${DATA_TEST_ID_PREFIX}-stock-${product.id}`}>
    <span className="gba:font-medium">{product.stock ?? 0}</span>
  </div>
)

// Cell Component: Unit
interface UnitCellProps {
  product: RecommendedProduct
}

const UnitCell: React.FC<UnitCellProps> = ({ product }) => (
  <div className="gba:text-center">
    <Badge variant="outline">{product.unitOfMeasure}</Badge>
  </div>
)

// Cell Component: Price (editable)
interface PriceInputCellProps {
  product: RecommendedProduct
  onPriceChange: (productId: string, price: number) => void
}

const PriceInputCell: React.FC<PriceInputCellProps> = ({ product, onPriceChange }) => (
  <div
    className="gba:flex gba:items-center gba:gap-1"
    onClick={e => e.stopPropagation()}
    onMouseDown={e => e.stopPropagation()}
  >
    <Input
      type="number"
      min={0}
      step={0.01}
      value={product.pricePerUnit}
      onChange={e => onPriceChange(product.id, parseFloat(e.target.value) || 0)}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      className="gba:w-24 gba:text-right"
      data-testid={`${DATA_TEST_ID_PREFIX}-price-input-${product.id}`}
    />
    <span className="gba:text-sm gba:text-muted-foreground">{product.currency}</span>
  </div>
)

// Cell Component: Quantity Desired (editable)
interface QuantityDesiredCellProps {
  product: RecommendedProduct
  onQuantityChange: (productId: string, quantity: number) => void
}

const QuantityDesiredCell: React.FC<QuantityDesiredCellProps> = ({ product, onQuantityChange }) => (
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

export const AllAvailableProductsStep: React.FC<AllAvailableProductsStepProps> = ({
  products,
  isLoading,
  searchTerm,
  onSearchChange,
  onSelectionChange,
  onQuantityChange,
  onPriceChange,
  onMount
}) => {
  const hasTriggeredInitialLoad = React.useRef(false)

  // Load data when component mounts
  React.useEffect(() => {
    if (onMount && products.length === 0 && !isLoading && !hasTriggeredInitialLoad.current) {
      hasTriggeredInitialLoad.current = true
      onMount()
    }
  }, [onMount, products.length, isLoading])
  const displayedProducts = products

  // Check for products with quantity exceeding stock
  const productsExceedingStock = React.useMemo(() => {
    return products.filter(p => {
      if (!p.isSelected) return false
      const stock = p.stock ?? 0
      return stock >= 0 && p.quantity > stock
    })
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
        header: 'Product Name',
        size: 300,
        cell: ({ row }) => <ProductNameCell product={row.original} />
      },
      {
        id: 'stock',
        accessorKey: 'stock',
        header: () => <div className="gba:text-center">Stock</div>,
        size: 100,
        cell: ({ row }) => <StockCell product={row.original} />
      },
      {
        id: 'unit',
        accessorKey: 'unitOfMeasure',
        header: () => <div className="gba:text-center">Unit</div>,
        size: 100,
        cell: ({ row }) => <UnitCell product={row.original} />
      },
      {
        id: 'price',
        accessorKey: 'pricePerUnit',
        header: 'Price',
        size: 150,
        cell: ({ row }) => <PriceInputCell product={row.original} onPriceChange={onPriceChange} />
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Quantity Desired',
        size: 180,
        cell: ({ row }) => <QuantityDesiredCell product={row.original} onQuantityChange={onQuantityChange} />
      }
    ],
    [products, onSelectionChange, onQuantityChange, onPriceChange]
  )

  return (
    <div
      className="gba:flex gba:flex-col gba:h-[556px]"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">All Available Products</h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          Browse and select additional products from the complete inventory.
        </p>
      </div>

      {/* Stock Exceeded Warning */}
      {hasStockExceeded && (
        <Alert
          variant="destructive"
          className="gba:mb-4 gba:w-full"
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
      <div className="gba:mb-4 gba:relative gba:max-w-sm">
        <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:pl-10"
          data-testid={`${DATA_TEST_ID_PREFIX}-search-input`}
        />
      </div>

      {/* Data Table */}
      <div
        className="gba:flex-1 gba:overflow-y-auto"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="gba:flex gba:h-full gba:items-center gba:justify-center">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Spinner size="lg" />
              <p className="gba:text-sm gba:text-muted-foreground">Loading products from inventory...</p>
            </div>
          </div>
        ) : (
          <div onClick={e => e.stopPropagation()}>
            <DataTable<RecommendedProduct>
              data={displayedProducts}
              columns={columns}
              enablePagination
              enableSorting
              enableSelection={false}
              rowsPerPageOptions={[10, 20, 50, 100]}
              emptyMessage="No products found"
              data-testid={`${DATA_TEST_ID_PREFIX}-table`}
              className="gba:overflow-y-auto"
            />
          </div>
        )}
      </div>
    </div>
  )
}
