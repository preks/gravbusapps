import React from 'react'
import {
  DataTable,
  Checkbox,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { PackageIcon, ShoppingCartIcon } from '@phosphor-icons/react'
import { RecommendedProduct } from '../types'

const DATA_TEST_ID_PREFIX = 'FinalListStep'

interface FinalListStepProps {
  products: RecommendedProduct[]
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
      {product.source && (
        <Badge variant={product.source === 'recommended' ? 'default' : 'secondary'} className="gba:mt-1 gba:w-fit">
          {product.source === 'recommended' ? 'AI Recommended' : 'Manual'}
        </Badge>
      )}
    </div>
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

// Cell Component: Total Price
interface TotalPriceCellProps {
  product: RecommendedProduct
}

const TotalPriceCell: React.FC<TotalPriceCellProps> = ({ product }) => {
  const totalPrice = product.pricePerUnit * product.quantity
  return (
    <div className="gba:text-right gba:font-semibold gba:text-primary">
      {totalPrice.toFixed(2)} {product.currency}
    </div>
  )
}

export const FinalListStep: React.FC<FinalListStepProps> = ({
  products,
  onSelectionChange,
  onQuantityChange,
  onPriceChange,
  onMount
}) => {
  // Combine products when component mounts
  React.useEffect(() => {
    if (onMount) {
      onMount()
    }
  }, [onMount])

  // Check for products with quantity exceeding stock
  const productsExceedingStock = React.useMemo(() => {
    return products.filter(p => {
      if (!p.isSelected) return false
      const stock = p.stock ?? 0 // Treat undefined/null stock as 0
      return stock >= 0 && p.quantity > stock
    })
  }, [products])

  const hasStockExceeded = productsExceedingStock.length > 0

  // Calculate totals
  const totals = React.useMemo(() => {
    const selectedProducts = products.filter(p => p.isSelected)
    const totalItems = selectedProducts.length
    const totalValue = selectedProducts.reduce((sum, p) => sum + p.pricePerUnit * p.quantity, 0)
    // Get currency from first product or default to EUR
    const currency = selectedProducts[0]?.currency || 'EUR'
    return { totalItems, totalValue, currency }
  }, [products])

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
        header: 'Price per Unit',
        size: 150,
        cell: ({ row }) => <PriceInputCell product={row.original} onPriceChange={onPriceChange} />
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Quantity Desired',
        size: 180,
        cell: ({ row }) => <QuantityDesiredCell product={row.original} onQuantityChange={onQuantityChange} />
      },
      {
        id: 'total',
        header: () => <div className="gba:text-right">Total</div>,
        size: 130,
        cell: ({ row }) => <TotalPriceCell product={row.original} />
      }
    ],
    [products, onSelectionChange, onQuantityChange, onPriceChange]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-[556px]" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Header */}
      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Final Product List</h2>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
          Review and adjust your final selection before generating the document.
        </p>
      </div>

      {/* Summary */}
      <div className="gba:mb-4 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-6">
            <div className="gba:flex gba:items-center gba:gap-2">
              <ShoppingCartIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:text-muted-foreground">
                <span className="gba:font-semibold gba:text-foreground">{totals.totalItems}</span> products selected
              </span>
            </div>
            <div className="gba:text-sm">
              <span className="gba:text-muted-foreground">Total Value: </span>
              <span className="gba:font-bold gba:text-lg gba:text-primary">
                {totals.totalValue.toFixed(2)} {totals.currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Exceeded Warning */}
      {hasStockExceeded && (
        <Alert
          variant="destructive"
          className="gba:mb-4 gba:w-full gba:shrink-0"
          data-testid={`${DATA_TEST_ID_PREFIX}-stock-warning`}
        >
          <AlertTitle>Stock exceeded</AlertTitle>
          <AlertDescription className="gba:mt-2 gba:w-full gba:min-w-0">
            {productsExceedingStock.length === 1
              ? `The selected product "${productsExceedingStock[0].name}" has a quantity greater than available stock (${productsExceedingStock[0].stock}).`
              : `${productsExceedingStock.length} selected products have quantities greater than available stock.`}
            <span className="gba:block gba:mt-1">
              Please deselect these products or reduce their quantities to match available stock.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <div
        className="gba:flex-1 gba:h-[556px] gba:overflow-y-auto"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <DataTable<RecommendedProduct>
          data={products}
          columns={columns}
          enablePagination
          enableSorting
          enableSelection={false}
          rowsPerPageOptions={[10, 20, 50]}
          emptyMessage="No products in final list. Please go back and select products."
          data-testid={`${DATA_TEST_ID_PREFIX}-table`}
        />
      </div>
    </div>
  )
}
