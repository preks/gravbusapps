import {
  DetailedProduct,
  ProductKPIData,
  ProductInventoryLocation,
  ProductPriceHistory,
  ProductSalesMetrics,
  ProductSupplierInfo,
  ProductDocument,
  ProductStockMovement
} from '../types'

/**
 * Generates comprehensive demo data for product detail view
 * This data structure matches enterprise retail requirements
 */

export const generateDemoProductDetail = (productId: string): DetailedProduct => {
  // Use consistent demo data that matches the overview
  const demoProducts: Record<string, DetailedProduct> = {
    'demo-product-1': {
      id: 'demo-product-1',
      name: 'Professional Software License',
      productNumber: 'PSL-2024-001',
      description:
        'Annual license for professional software suite with full features and support. Includes cloud storage, advanced analytics, and 24/7 customer support.',
      productUrl: 'https://example.com/products/professional-software-license',
      productTypeCode: 'License',
      productStructure: 'Standalone',
      isKit: false,
      isStockItem: false,
      parentProductId: null,
      hierarchyPath: '/Software/Licenses/Professional',
      vendorId: 'vendor-001',
      vendorName: 'TechSoft Solutions Inc.',
      vendorPartNumber: 'TSS-PSL-2024',
      supplierName: 'TechSoft Solutions',
      price: 1299.99,
      priceBase: 1299.99,
      standardCost: 650.0,
      standardCostBase: 650.0,
      currentCost: 650.0,
      currentCostBase: 650.0,
      exchangeRate: 1.0,
      currencyId: 'eur-001',
      currency: 'EUR',
      defaultUomId: 'license-001',
      defaultUomScheduleId: 'software-schedule',
      quantityOnHand: 0,
      quantityDecimal: 0,
      stockVolume: 0,
      stockWeight: 0,
      size: 'Digital',
      validFromDate: '2024-01-01',
      validToDate: '2024-12-31',
      subjectId: 'software-category',
      priceLevelId: 'enterprise-pricing',
      stateCode: 'Active',
      statusCode: 'Available',
      createdBy: 'system-admin',
      updatedBy: 'product-manager',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T14:30:00Z',
      version: 1,
      isDeleted: false,
      recordState: 'active',
      processInstanceId: 'proc-001',
      additionalProperties: {
        licenseType: 'Annual',
        maxUsers: 100,
        supportLevel: 'Premium'
      }
    },
    'demo-product-2': {
      id: 'demo-product-2',
      name: 'Enterprise Hardware Bundle',
      productNumber: 'EHB-2024-002',
      description:
        'Complete hardware bundle including server, networking equipment, and accessories. Perfect for medium to large enterprise deployments.',
      productUrl: 'https://example.com/products/enterprise-hardware-bundle',
      productTypeCode: 'Bundle',
      productStructure: 'Bundle',
      isKit: true,
      isStockItem: true,
      parentProductId: null,
      hierarchyPath: '/Hardware/Bundles/Enterprise',
      vendorId: 'vendor-002',
      vendorName: 'Hardware Dynamics Corp.',
      vendorPartNumber: 'HDC-EHB-2024',
      supplierName: 'Hardware Dynamics',
      price: 15750.0,
      priceBase: 15750.0,
      standardCost: 12600.0,
      standardCostBase: 12600.0,
      currentCost: 12600.0,
      currentCostBase: 12600.0,
      exchangeRate: 1.0,
      currencyId: 'eur-001',
      currency: 'EUR',
      defaultUomId: 'unit-001',
      defaultUomScheduleId: 'hardware-schedule',
      quantityOnHand: 25,
      quantityDecimal: 0,
      stockVolume: 2.5,
      stockWeight: 45.5,
      size: '2U Rack Mount',
      validFromDate: '2024-01-01',
      validToDate: '2025-12-31',
      subjectId: 'hardware-category',
      priceLevelId: 'enterprise-pricing',
      stateCode: 'Active',
      statusCode: 'Available',
      createdBy: 'system-admin',
      updatedBy: 'product-manager',
      createdAt: '2024-01-20T10:15:00Z',
      updatedAt: '2024-02-01T16:45:00Z',
      version: 2,
      isDeleted: false,
      recordState: 'active',
      processInstanceId: 'proc-002',
      additionalProperties: {
        warranty: '3 years',
        installationIncluded: true,
        maintenanceContract: 'Available'
      }
    }
  }

  // Return specific product or default to first one
  return demoProducts[productId] || demoProducts['demo-product-1']
}

export const generateDemoProductKPIs = (productId: string): ProductKPIData => {
  return {
    currentStock: {
      value: productId === 'demo-product-1' ? 0 : 25,
      trend: 5.2,
      status: productId === 'demo-product-1' ? 'Normal' : 'Normal'
    },
    monthlyRevenue: {
      value: 45750.0,
      trend: 12.8,
      currency: 'EUR'
    },
    averageMargin: {
      value: 49.8,
      trend: 2.1
    },
    salesVelocity: {
      value: 8.5,
      trend: 15.3,
      unit: 'units/month'
    }
  }
}

export const generateDemoInventoryLocations = (productId: string): ProductInventoryLocation[] => {
  if (productId === 'demo-product-1') {
    return [] // Software license has no physical inventory
  }

  return [
    {
      id: 'loc-001',
      locationName: 'Main Warehouse',
      warehouseCode: 'WH-001',
      quantityOnHand: 15,
      quantityReserved: 3,
      quantityAvailable: 12,
      reorderPoint: 5,
      maxStockLevel: 50,
      lastStockMovement: '2024-02-15T10:30:00Z',
      locationStatus: 'Active'
    },
    {
      id: 'loc-002',
      locationName: 'Regional Distribution Center',
      warehouseCode: 'RDC-002',
      quantityOnHand: 8,
      quantityReserved: 1,
      quantityAvailable: 7,
      reorderPoint: 3,
      maxStockLevel: 25,
      lastStockMovement: '2024-02-14T14:20:00Z',
      locationStatus: 'Active'
    },
    {
      id: 'loc-003',
      locationName: 'Customer Service Center',
      warehouseCode: 'CSC-003',
      quantityOnHand: 2,
      quantityReserved: 0,
      quantityAvailable: 2,
      reorderPoint: 1,
      maxStockLevel: 10,
      lastStockMovement: '2024-02-10T09:15:00Z',
      locationStatus: 'Active'
    }
  ]
}

export const generateDemoPriceHistory = (productId: string): ProductPriceHistory[] => {
  const basePrice = productId === 'demo-product-1' ? 1299.99 : 15750.0

  return [
    {
      id: 'price-001',
      effectiveDate: '2024-02-01T00:00:00Z',
      price: basePrice,
      priceType: 'List',
      currency: 'EUR',
      reason: 'Annual price adjustment',
      changedBy: 'pricing-manager'
    },
    {
      id: 'price-002',
      effectiveDate: '2024-01-15T00:00:00Z',
      price: basePrice * 0.95,
      priceType: 'Promotional',
      currency: 'EUR',
      reason: 'New Year promotion',
      changedBy: 'marketing-manager'
    },
    {
      id: 'price-003',
      effectiveDate: '2024-01-01T00:00:00Z',
      price: basePrice * 0.98,
      priceType: 'List',
      currency: 'EUR',
      reason: 'Product launch pricing',
      changedBy: 'product-manager'
    },
    {
      id: 'price-004',
      effectiveDate: '2023-12-01T00:00:00Z',
      price: basePrice * 1.05,
      priceType: 'List',
      currency: 'EUR',
      reason: 'Cost increase adjustment',
      changedBy: 'pricing-manager'
    }
  ]
}

export const generateDemoSalesMetrics = (productId: string): ProductSalesMetrics => {
  return {
    totalRevenue: 137250.0,
    totalQuantitySold: productId === 'demo-product-1' ? 105 : 8,
    averageOrderValue: productId === 'demo-product-1' ? 1307.14 : 17156.25,
    topCustomers: [
      {
        customerId: 'cust-001',
        customerName: 'Acme Corporation',
        totalPurchases: 25750.0,
        lastPurchaseDate: '2024-02-10T00:00:00Z'
      },
      {
        customerId: 'cust-002',
        customerName: 'Global Tech Solutions',
        totalPurchases: 18900.0,
        lastPurchaseDate: '2024-02-05T00:00:00Z'
      },
      {
        customerId: 'cust-003',
        customerName: 'Enterprise Systems Ltd.',
        totalPurchases: 15600.0,
        lastPurchaseDate: '2024-01-28T00:00:00Z'
      }
    ],
    salesTrend: [
      { period: '2024-02', revenue: 45750.0, quantity: productId === 'demo-product-1' ? 35 : 3 },
      { period: '2024-01', revenue: 52000.0, quantity: productId === 'demo-product-1' ? 40 : 3 },
      { period: '2023-12', revenue: 39500.0, quantity: productId === 'demo-product-1' ? 30 : 2 }
    ]
  }
}

export const generateDemoSupplierInfo = (productId: string): ProductSupplierInfo[] => {
  if (productId === 'demo-product-1') {
    return [
      {
        id: 'supp-001',
        supplierName: 'TechSoft Solutions',
        supplierCode: 'TSS-001',
        contactPerson: 'John Smith',
        email: 'john.smith@techsoft.com',
        phone: '+1-555-0123',
        leadTime: 1,
        minimumOrderQuantity: 1,
        lastPurchaseDate: '2024-01-15T00:00:00Z',
        totalPurchaseValue: 68250.0,
        performanceRating: 9.2,
        status: 'Preferred'
      }
    ]
  }

  return [
    {
      id: 'supp-002',
      supplierName: 'Hardware Dynamics',
      supplierCode: 'HDC-001',
      contactPerson: 'Sarah Johnson',
      email: 'sarah.johnson@hardwaredynamics.com',
      phone: '+1-555-0456',
      leadTime: 14,
      minimumOrderQuantity: 1,
      lastPurchaseDate: '2024-01-20T00:00:00Z',
      totalPurchaseValue: 100800.0,
      performanceRating: 8.7,
      status: 'Active'
    },
    {
      id: 'supp-003',
      supplierName: 'Component Suppliers Inc.',
      supplierCode: 'CSI-001',
      contactPerson: 'Mike Wilson',
      email: 'mike.wilson@componentsuppliers.com',
      phone: '+1-555-0789',
      leadTime: 21,
      minimumOrderQuantity: 5,
      lastPurchaseDate: '2023-12-15T00:00:00Z',
      totalPurchaseValue: 45600.0,
      performanceRating: 7.8,
      status: 'Active'
    }
  ]
}

export const generateDemoDocuments = (productId: string): ProductDocument[] => {
  return [
    {
      id: 'doc-001',
      fileName: 'product-image-main.jpg',
      fileType: 'image/jpeg',
      fileSize: 2048576,
      documentType: 'Image',
      uploadDate: '2024-01-15T10:00:00Z',
      uploadedBy: 'product-manager',
      url: '/documents/products/product-image-main.jpg',
      description: 'Main product image'
    },
    {
      id: 'doc-002',
      fileName: 'technical-specifications.pdf',
      fileType: 'application/pdf',
      fileSize: 1536000,
      documentType: 'Specification',
      uploadDate: '2024-01-15T10:30:00Z',
      uploadedBy: 'technical-writer',
      url: '/documents/products/technical-specifications.pdf',
      description: 'Detailed technical specifications and requirements'
    },
    {
      id: 'doc-003',
      fileName: 'user-manual.pdf',
      fileType: 'application/pdf',
      fileSize: 3072000,
      documentType: 'Manual',
      uploadDate: '2024-01-15T11:00:00Z',
      uploadedBy: 'technical-writer',
      url: '/documents/products/user-manual.pdf',
      description: 'Complete user manual and installation guide'
    },
    {
      id: 'doc-004',
      fileName: 'compliance-certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 512000,
      documentType: 'Certificate',
      uploadDate: '2024-01-10T09:00:00Z',
      uploadedBy: 'compliance-officer',
      url: '/documents/products/compliance-certificate.pdf',
      description: 'ISO 9001 compliance certificate'
    }
  ]
}

export const generateDemoStockMovements = (productId: string): ProductStockMovement[] => {
  if (productId === 'demo-product-1') {
    return [] // Software license has no stock movements
  }

  return [
    {
      id: 'mov-001',
      movementDate: '2024-02-15T10:30:00Z',
      movementType: 'In',
      quantity: 10,
      reason: 'Purchase order receipt',
      reference: 'PO-2024-0156',
      location: 'Main Warehouse',
      performedBy: 'warehouse-clerk'
    },
    {
      id: 'mov-002',
      movementDate: '2024-02-12T14:20:00Z',
      movementType: 'Out',
      quantity: -3,
      reason: 'Sales order fulfillment',
      reference: 'SO-2024-0234',
      location: 'Main Warehouse',
      performedBy: 'shipping-clerk'
    },
    {
      id: 'mov-003',
      movementDate: '2024-02-10T09:15:00Z',
      movementType: 'Transfer',
      quantity: -2,
      reason: 'Inter-location transfer',
      reference: 'TRF-2024-0045',
      location: 'Main Warehouse → RDC',
      performedBy: 'warehouse-supervisor'
    },
    {
      id: 'mov-004',
      movementDate: '2024-02-08T16:45:00Z',
      movementType: 'Adjustment',
      quantity: 1,
      reason: 'Inventory count adjustment',
      reference: 'ADJ-2024-0012',
      location: 'Main Warehouse',
      performedBy: 'inventory-manager'
    }
  ]
}
