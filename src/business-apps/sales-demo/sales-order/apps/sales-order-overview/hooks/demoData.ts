import { SalesOrder, KPIData } from '../types'

/**
 * Generates realistic demo data for sales order overview
 * This data structure matches the expected GraphQL response format
 */

export const generateDemoSalesOrders = (
  page: number = 1,
  pageSize: number = 20
): { orders: SalesOrder[]; total: number } => {
  const allDemoOrders: SalesOrder[] = [
    {
      id: 'demo-order-1',
      orderNumber: 'SO-2024-001234',
      orderDate: '2024-01-15T09:00:00Z',
      customer: {
        id: 'demo-customer-1',
        name: 'Acme Corporation',
        email: 'orders@acmecorp.com'
      },
      totalValue: 15750.0,
      currency: 'EUR',
      status: 'Released',
      salesperson: {
        id: 'demo-sales-1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com'
      },
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      items: 4
    },
    {
      id: 'demo-order-2',
      orderNumber: 'SO-2024-001235',
      orderDate: '2024-01-16T10:30:00Z',
      customer: {
        id: 'demo-customer-2',
        name: 'TechStart Solutions',
        email: 'procurement@techstart.com'
      },
      totalValue: 8920.5,
      currency: 'EUR',
      status: 'Draft',
      salesperson: {
        id: 'demo-sales-2',
        name: 'Michael Chen',
        email: 'michael.chen@company.com'
      },
      createdAt: '2024-01-16T10:30:00Z',
      updatedAt: '2024-01-16T15:45:00Z',
      items: 2
    },
    {
      id: 'demo-order-3',
      orderNumber: 'SO-2024-001236',
      orderDate: '2024-01-17T14:15:00Z',
      customer: {
        id: 'demo-customer-3',
        name: 'Global Industries Ltd',
        email: 'orders@globalind.com'
      },
      totalValue: 23450.75,
      currency: 'EUR',
      status: 'Invoiced',
      salesperson: {
        id: 'demo-sales-1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com'
      },
      createdAt: '2024-01-17T14:15:00Z',
      updatedAt: '2024-01-18T09:20:00Z',
      items: 6
    },
    {
      id: 'demo-order-4',
      orderNumber: 'SO-2024-001237',
      orderDate: '2024-01-18T11:45:00Z',
      customer: {
        id: 'demo-customer-4',
        name: 'Innovation Hub Inc',
        email: 'purchasing@innovhub.com'
      },
      totalValue: 12300.0,
      currency: 'EUR',
      status: 'Released',
      salesperson: {
        id: 'demo-sales-3',
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@company.com'
      },
      createdAt: '2024-01-18T11:45:00Z',
      updatedAt: '2024-01-18T16:30:00Z',
      items: 3
    },
    {
      id: 'demo-order-5',
      orderNumber: 'SO-2024-001238',
      orderDate: '2024-01-19T08:30:00Z',
      customer: {
        id: 'demo-customer-5',
        name: 'Future Systems AG',
        email: 'orders@futuresys.de'
      },
      totalValue: 18750.25,
      currency: 'EUR',
      status: 'Draft',
      salesperson: {
        id: 'demo-sales-2',
        name: 'Michael Chen',
        email: 'michael.chen@company.com'
      },
      createdAt: '2024-01-19T08:30:00Z',
      updatedAt: '2024-01-19T13:15:00Z',
      items: 5
    },
    {
      id: 'demo-order-6',
      orderNumber: 'SO-2024-001239',
      orderDate: '2024-01-20T13:20:00Z',
      customer: {
        id: 'demo-customer-6',
        name: 'Digital Dynamics',
        email: 'procurement@digitaldyn.com'
      },
      totalValue: 9875.5,
      currency: 'EUR',
      status: 'Released',
      salesperson: {
        id: 'demo-sales-4',
        name: 'David Wilson',
        email: 'david.wilson@company.com'
      },
      createdAt: '2024-01-20T13:20:00Z',
      updatedAt: '2024-01-20T17:45:00Z',
      items: 2
    },
    {
      id: 'demo-order-7',
      orderNumber: 'SO-2024-001240',
      orderDate: '2024-01-21T09:15:00Z',
      customer: {
        id: 'demo-customer-7',
        name: 'Enterprise Solutions Co',
        email: 'orders@enterprisesol.com'
      },
      totalValue: 31200.0,
      currency: 'EUR',
      status: 'Invoiced',
      salesperson: {
        id: 'demo-sales-1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com'
      },
      createdAt: '2024-01-21T09:15:00Z',
      updatedAt: '2024-01-22T11:30:00Z',
      items: 8
    },
    {
      id: 'demo-order-8',
      orderNumber: 'SO-2024-001241',
      orderDate: '2024-01-22T15:45:00Z',
      customer: {
        id: 'demo-customer-8',
        name: 'Smart Tech Ventures',
        email: 'purchasing@smarttech.com'
      },
      totalValue: 14650.75,
      currency: 'EUR',
      status: 'Draft',
      salesperson: {
        id: 'demo-sales-3',
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@company.com'
      },
      createdAt: '2024-01-22T15:45:00Z',
      updatedAt: '2024-01-22T18:20:00Z',
      items: 4
    }
  ]

  // Add more orders to reach a realistic total
  const additionalOrders = Array.from({ length: 40 }, (_, index) => ({
    id: `demo-order-${index + 9}`,
    orderNumber: `SO-2024-${String(1242 + index).padStart(6, '0')}`,
    orderDate: new Date(2024, 0, 23 + (index % 30)).toISOString(),
    customer: {
      id: `demo-customer-${(index % 8) + 1}`,
      name: [
        'Acme Corporation',
        'TechStart Solutions',
        'Global Industries Ltd',
        'Innovation Hub Inc',
        'Future Systems AG',
        'Digital Dynamics',
        'Enterprise Solutions Co',
        'Smart Tech Ventures'
      ][index % 8],
      email: [
        'orders@acmecorp.com',
        'procurement@techstart.com',
        'orders@globalind.com',
        'purchasing@innovhub.com',
        'orders@futuresys.de',
        'procurement@digitaldyn.com',
        'orders@enterprisesol.com',
        'purchasing@smarttech.com'
      ][index % 8]
    },
    totalValue: Math.round((Math.random() * 25000 + 5000) * 100) / 100,
    currency: 'EUR' as const,
    status: (['Draft', 'Released', 'Invoiced', 'Cancelled'] as const)[index % 4],
    salesperson: {
      id: `demo-sales-${(index % 4) + 1}`,
      name: ['Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Wilson'][index % 4],
      email: [
        'sarah.johnson@company.com',
        'michael.chen@company.com',
        'emma.rodriguez@company.com',
        'david.wilson@company.com'
      ][index % 4]
    },
    createdAt: new Date(2024, 0, 23 + (index % 30)).toISOString(),
    updatedAt: new Date(2024, 0, 23 + (index % 30) + 1).toISOString(),
    items: Math.floor(Math.random() * 8) + 1
  }))

  const allOrders = [...allDemoOrders, ...additionalOrders]

  // Implement pagination
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedOrders = allOrders.slice(startIndex, endIndex)

  return {
    orders: paginatedOrders,
    total: allOrders.length
  }
}

export const generateDemoKPIData = (): KPIData => {
  return {
    totalSalesOrders: {
      value: 98,
      trend: 12.5,
      period: 'vs last month'
    },
    totalOrderValue: {
      value: 2451483,
      trend: 8.3,
      period: 'vs last month',
      currency: 'EUR'
    },
    openOrders: {
      value: 83,
      trend: -2.1,
      period: 'vs last month'
    },
    pendingApproval: {
      value: 15,
      trend: -18.7,
      period: 'vs last month'
    }
  }
}

export const generateDemoCustomers = (): Array<{ id: string; name: string; email?: string }> => {
  return [
    { id: 'demo-customer-1', name: 'Acme Corporation', email: 'orders@acmecorp.com' },
    { id: 'demo-customer-2', name: 'TechStart Solutions', email: 'procurement@techstart.com' },
    { id: 'demo-customer-3', name: 'Global Industries Ltd', email: 'orders@globalind.com' },
    { id: 'demo-customer-4', name: 'Innovation Hub Inc', email: 'purchasing@innovhub.com' },
    { id: 'demo-customer-5', name: 'Future Systems AG', email: 'orders@futuresys.de' },
    { id: 'demo-customer-6', name: 'Digital Dynamics', email: 'procurement@digitaldyn.com' },
    { id: 'demo-customer-7', name: 'Enterprise Solutions Co', email: 'orders@enterprisesol.com' },
    { id: 'demo-customer-8', name: 'Smart Tech Ventures', email: 'purchasing@smarttech.com' }
  ]
}

export const generateDemoSalespersons = (): Array<{ id: string; name: string; email?: string }> => {
  return [
    { id: 'demo-sales-1', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
    { id: 'demo-sales-2', name: 'Michael Chen', email: 'michael.chen@company.com' },
    { id: 'demo-sales-3', name: 'Emma Rodriguez', email: 'emma.rodriguez@company.com' },
    { id: 'demo-sales-4', name: 'David Wilson', email: 'david.wilson@company.com' }
  ]
}
