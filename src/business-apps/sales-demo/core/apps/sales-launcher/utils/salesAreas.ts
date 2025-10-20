import { SalesArea, SalesQuickAction } from '../types'
import { ShoppingCart, Package, ChartBar, TreeStructure, Plus, TrendUp, FunnelSimple } from '@phosphor-icons/react'

export const salesAreas: SalesArea[] = [
  {
    id: 'sales-orders',
    title: 'Sales Order Management',
    description: 'Manage sales orders, track order status, and handle order fulfillment processes',
    icon: ShoppingCart,
    category: 'orders',
    buttonLabel: 'Manage Orders',
    links: [
      {
        label: 'Active Orders',
        action: '/platform/sales-demo/sales-order-overview'
      },
      {
        label: 'Order Analytics',
        action: '/platform/sales-demo/sales-order-overview'
      }
    ]
  },
  {
    id: 'sales-performance',
    title: 'Sales Performance Reports',
    description: 'Analyze sales performance, track metrics, and generate comprehensive sales reports',
    icon: ChartBar,
    category: 'analytics',
    buttonLabel: 'View Reports',
    links: [
      {
        label: 'Performance Overview',
        action: '/platform/sales-demo/sales-performance-report'
      },
      {
        label: 'Sales Pipeline',
        action: '/platform/sales-demo/sales-performance-report'
      }
    ]
  },
  {
    id: 'product-management',
    title: 'Product Management',
    description: 'Manage product catalog, inventory, pricing, and product lifecycle management',
    icon: Package,
    category: 'products',
    buttonLabel: 'Manage Products',
    links: [
      {
        label: 'Product Catalog',
        action: '/platform/sales-demo/product-management-overview'
      },
      {
        label: 'Inventory Status',
        action: '/platform/sales-demo/product-management-overview'
      }
    ]
  },
  {
    id: 'bom-management',
    title: 'Bill of Materials',
    description: 'Manage bill of materials, component structures, and manufacturing specifications',
    icon: TreeStructure,
    category: 'manufacturing',
    buttonLabel: 'Manage BOMs',
    links: [
      {
        label: 'Active BOMs',
        action: '/platform/sales-demo/bom-management-overview'
      },
      {
        label: 'Component Analysis',
        action: '/platform/sales-demo/bom-management-overview'
      }
    ]
  }
]

export const salesQuickActions: SalesQuickAction[] = [
  {
    id: 'create-order',
    label: 'Create Sales Order',
    icon: Plus,
    action: 'create-sales-order'
  },
  {
    id: 'add-product',
    label: 'Add Product',
    icon: Package,
    action: 'add-product'
  },
  {
    id: 'view-analytics',
    label: 'View Analytics',
    icon: TrendUp,
    action: 'view-analytics'
  },
  {
    id: 'manage-pipeline',
    label: 'Manage Pipeline',
    icon: FunnelSimple,
    action: 'manage-pipeline'
  }
]

export const categoryLabels: Record<string, string> = {
  orders: 'Order Management',
  analytics: 'Analytics & Reports',
  products: 'Product Management',
  manufacturing: 'Manufacturing'
}
