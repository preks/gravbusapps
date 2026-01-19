import { Product, ProductKPIData } from '../types'

/**
 * Generates realistic demo data for product management overview
 * This data structure matches the expected GraphQL response format
 */

export const generateDemoProducts = (
  page: number = 1,
  pageSize: number = 20
): { products: Product[]; total: number } => {
  const allDemoProducts: Product[] = [
    {
      id: 'demo-product-1',
      name: 'Professional Software License',
      productNumber: 'PSL-2024-001',
      description: 'Annual license for professional software suite with full features and support',
      price: 1299.99,
      priceBase: 1299.99,
      currentCost: 650.0,
      currentCostBase: 650.0,
      supplierName: 'TechSoft Solutions',
      productTypeCode: 'License',
      productStructure: 'Standalone',
      isKit: false,
      isStockItem: false,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 0,
      validFromDate: '2024-01-01',
      validToDate: '2024-12-31',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      isDeleted: false
    },
    {
      id: 'demo-product-2',
      name: 'Enterprise Hardware Bundle',
      productNumber: 'EHB-2024-002',
      description: 'Complete hardware bundle including server, networking equipment, and accessories',
      price: 15750.0,
      priceBase: 15750.0,
      currentCost: 12600.0,
      currentCostBase: 12600.0,
      supplierName: 'Hardware Dynamics',
      productTypeCode: 'Bundle',
      productStructure: 'Bundle',
      isKit: true,
      isStockItem: true,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 25,
      validFromDate: '2024-01-01',
      validToDate: '2025-12-31',
      createdAt: '2024-01-20T10:15:00Z',
      updatedAt: '2024-02-01T16:45:00Z',
      isDeleted: false
    },
    {
      id: 'demo-product-3',
      name: 'Cloud Storage Service',
      productNumber: 'CSS-2024-003',
      description: 'Monthly cloud storage service with 1TB capacity and advanced security features',
      price: 49.99,
      priceBase: 49.99,
      currentCost: 15.0,
      currentCostBase: 15.0,
      supplierName: 'CloudTech Inc.',
      productTypeCode: 'Service',
      productStructure: 'Standalone',
      isKit: false,
      isStockItem: false,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 0,
      validFromDate: '2024-01-01',
      validToDate: '2025-12-31',
      createdAt: '2024-01-25T11:30:00Z',
      updatedAt: '2024-02-15T09:20:00Z',
      isDeleted: false
    },
    {
      id: 'demo-product-4',
      name: 'Training Workshop Package',
      productNumber: 'TWP-2024-004',
      description: '3-day intensive training workshop for team development and skill enhancement',
      price: 2500.0,
      priceBase: 2500.0,
      currentCost: 800.0,
      currentCostBase: 800.0,
      supplierName: 'Learning Solutions Ltd.',
      productTypeCode: 'Service',
      productStructure: 'Standalone',
      isKit: false,
      isStockItem: false,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 0,
      validFromDate: '2024-01-01',
      validToDate: '2024-12-31',
      createdAt: '2024-02-01T08:45:00Z',
      updatedAt: '2024-02-10T14:15:00Z',
      isDeleted: false
    },
    {
      id: 'demo-product-5',
      name: 'Mobile Device Kit',
      productNumber: 'MDK-2024-005',
      description: 'Complete mobile device kit with tablet, accessories, and protective case',
      price: 899.99,
      priceBase: 899.99,
      currentCost: 650.0,
      currentCostBase: 650.0,
      supplierName: 'Mobile Tech Corp.',
      productTypeCode: 'Kit',
      productStructure: 'Kit',
      isKit: true,
      isStockItem: true,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 150,
      validFromDate: '2024-01-01',
      validToDate: '2025-06-30',
      createdAt: '2024-02-05T13:20:00Z',
      updatedAt: '2024-02-20T10:30:00Z',
      isDeleted: false
    },
    {
      id: 'demo-product-6',
      name: 'Consulting Services',
      productNumber: 'CS-2024-006',
      description: 'Professional consulting services for business process optimization',
      price: 150.0,
      priceBase: 150.0,
      currentCost: 75.0,
      currentCostBase: 75.0,
      supplierName: 'Business Consultants Inc.',
      productTypeCode: 'Service',
      productStructure: 'Standalone',
      isKit: false,
      isStockItem: false,
      stateCode: 'Active',
      statusCode: 'Available',
      quantityOnHand: 0,
      validFromDate: '2024-01-01',
      validToDate: '2024-12-31',
      createdAt: '2024-02-10T15:45:00Z',
      updatedAt: '2024-02-25T11:20:00Z',
      isDeleted: false
    }
  ]

  // Add more demo products to reach a realistic dataset
  for (let i = 7; i <= 50; i++) {
    allDemoProducts.push({
      id: `demo-product-${i}`,
      name: `Product ${i}`,
      productNumber: `PRD-2024-${String(i).padStart(3, '0')}`,
      description: `Description for product ${i} with various features and capabilities`,
      price: Math.round((Math.random() * 5000 + 100) * 100) / 100,
      priceBase: Math.round((Math.random() * 5000 + 100) * 100) / 100,
      currentCost: Math.round((Math.random() * 2000 + 50) * 100) / 100,
      currentCostBase: Math.round((Math.random() * 2000 + 50) * 100) / 100,
      supplierName: `Supplier ${Math.ceil(i / 5)}`,
      productTypeCode: ['Service', 'Goods', 'License', 'Bundle', 'Kit'][Math.floor(Math.random() * 5)],
      productStructure: ['Standalone', 'Bundle', 'Kit', 'Component'][Math.floor(Math.random() * 4)],
      isKit: Math.random() > 0.7,
      isStockItem: Math.random() > 0.3,
      stateCode: Math.random() > 0.1 ? 'Active' : 'Inactive',
      statusCode: 'Available',
      quantityOnHand: Math.floor(Math.random() * 200),
      validFromDate: '2024-01-01',
      validToDate: '2025-12-31',
      createdAt: `2024-0${Math.ceil(Math.random() * 2)}-${String(Math.ceil(Math.random() * 28)).padStart(2, '0')}T${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
      updatedAt: `2024-0${Math.ceil(Math.random() * 2)}-${String(Math.ceil(Math.random() * 28)).padStart(2, '0')}T${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
      isDeleted: false
    })
  }

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedProducts = allDemoProducts.slice(startIndex, endIndex)

  return {
    products: paginatedProducts,
    total: allDemoProducts.length
  }
}

export const generateDemoProductKPIData = (): ProductKPIData => {
  return {
    totalProducts: {
      value: 50,
      trend: 8.5,
      period: 'vs last month'
    },
    activeProducts: {
      value: 45,
      trend: 6.2,
      period: 'vs last month'
    },
    productCategories: {
      value: 5,
      trend: 0,
      period: 'vs last month'
    },
    averagePrice: {
      value: 1247.85,
      trend: 3.1,
      period: 'vs last month',
      currency: 'EUR'
    }
  }
}
