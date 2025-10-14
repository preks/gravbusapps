import { BillOfMaterials, BomKPIData } from '../../../types'
import dayjs from 'dayjs'

// Helper function to generate realistic BOM demo data
export const generateDemoBoms = (page: number, pageSize: number): { boms: BillOfMaterials[]; total: number } => {
  console.log(`Generating demo BOMs for page ${page}, pageSize ${pageSize}`)
  const allBoms: BillOfMaterials[] = [
    // Complex Manufacturing BOMs
    {
      id: 'bom-001',
      businessKey: 'BOM-LAPTOP-001',
      name: 'Enterprise Laptop Assembly',
      description: 'Complete bill of materials for enterprise-grade laptop computer',
      parentProductId: 'prod-laptop-001',
      parentProduct: {
        id: 'prod-laptop-001',
        name: 'ThinkPad X1 Carbon Gen 11',
        productNumber: 'TP-X1C-G11',
        description: 'High-performance business laptop'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'ACTIVE',
      activeFrom: dayjs().subtract(6, 'months').toISOString(),
      activeTo: dayjs().add(18, 'months').toISOString(),
      validFrom: dayjs().subtract(6, 'months').toISOString(),
      validTo: dayjs().add(24, 'months').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.02,
      componentCount: 47,
      totalComponents: 156,
      version: 3,
      recordState: 'active',
      processInstanceId: 'proc-001',
      createdBy: 'user-001',
      updatedBy: 'user-003',
      createdAt: dayjs().subtract(6, 'months').toISOString(),
      updatedAt: dayjs().subtract(1, 'week').toISOString(),
      isDeleted: false
    },
    {
      id: 'bom-002',
      businessKey: 'BOM-PHONE-001',
      name: 'Smartphone Assembly',
      description: 'Complete BOM for flagship smartphone model',
      parentProductId: 'prod-phone-001',
      parentProduct: {
        id: 'prod-phone-001',
        name: 'Galaxy Pro Max',
        productNumber: 'GPM-512-BK',
        description: '512GB Black smartphone'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'ACTIVE',
      activeFrom: dayjs().subtract(3, 'months').toISOString(),
      activeTo: dayjs().add(12, 'months').toISOString(),
      validFrom: dayjs().subtract(3, 'months').toISOString(),
      validTo: dayjs().add(18, 'months').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.015,
      componentCount: 89,
      totalComponents: 234,
      version: 2,
      recordState: 'active',
      processInstanceId: 'proc-002',
      createdBy: 'user-002',
      updatedBy: 'user-002',
      createdAt: dayjs().subtract(3, 'months').toISOString(),
      updatedAt: dayjs().subtract(2, 'days').toISOString(),
      isDeleted: false
    },
    {
      id: 'bom-003',
      businessKey: 'BOM-TABLET-001',
      name: 'Tablet Computer Assembly',
      description: 'Production BOM for 12-inch tablet computer',
      parentProductId: 'prod-tablet-001',
      parentProduct: {
        id: 'prod-tablet-001',
        name: 'iPad Pro 12.9"',
        productNumber: 'IPP-129-256',
        description: '12.9-inch iPad Pro with 256GB storage'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'ACTIVE',
      activeFrom: dayjs().subtract(8, 'months').toISOString(),
      activeTo: dayjs().add(16, 'months').toISOString(),
      validFrom: dayjs().subtract(8, 'months').toISOString(),
      validTo: dayjs().add(20, 'months').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.018,
      componentCount: 34,
      totalComponents: 98,
      version: 4,
      recordState: 'active',
      processInstanceId: 'proc-003',
      createdBy: 'user-001',
      updatedBy: 'user-004',
      createdAt: dayjs().subtract(8, 'months').toISOString(),
      updatedAt: dayjs().subtract(3, 'days').toISOString(),
      isDeleted: false
    },
    {
      id: 'bom-004',
      businessKey: 'BOM-SERVER-001',
      name: 'Rack Server Assembly',
      description: 'Enterprise rack server complete assembly BOM',
      parentProductId: 'prod-server-001',
      parentProduct: {
        id: 'prod-server-001',
        name: 'PowerEdge R750',
        productNumber: 'PE-R750-32G',
        description: '2U rack server with 32GB RAM'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'ACTIVE',
      activeFrom: dayjs().subtract(12, 'months').toISOString(),
      activeTo: dayjs().add(24, 'months').toISOString(),
      validFrom: dayjs().subtract(12, 'months').toISOString(),
      validTo: dayjs().add(30, 'months').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.01,
      componentCount: 67,
      totalComponents: 189,
      version: 5,
      recordState: 'active',
      processInstanceId: 'proc-004',
      createdBy: 'user-003',
      updatedBy: 'user-001',
      createdAt: dayjs().subtract(12, 'months').toISOString(),
      updatedAt: dayjs().subtract(1, 'day').toISOString(),
      isDeleted: false
    },
    {
      id: 'bom-005',
      businessKey: 'BOM-MONITOR-001',
      name: '4K Monitor Assembly',
      description: 'Professional 4K monitor production BOM',
      parentProductId: 'prod-monitor-001',
      parentProduct: {
        id: 'prod-monitor-001',
        name: 'UltraSharp 32" 4K',
        productNumber: 'US-32-4K-001',
        description: '32-inch 4K professional monitor'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'INACTIVE',
      activeFrom: dayjs().subtract(18, 'months').toISOString(),
      activeTo: dayjs().subtract(2, 'months').toISOString(),
      validFrom: dayjs().subtract(18, 'months').toISOString(),
      validTo: dayjs().subtract(1, 'month').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.025,
      componentCount: 23,
      totalComponents: 67,
      version: 2,
      recordState: 'inactive',
      processInstanceId: 'proc-005',
      createdBy: 'user-002',
      updatedBy: 'user-003',
      createdAt: dayjs().subtract(18, 'months').toISOString(),
      updatedAt: dayjs().subtract(2, 'months').toISOString(),
      isDeleted: false
    },
    {
      id: 'bom-006',
      businessKey: 'BOM-PRINTER-001',
      name: 'Laser Printer Assembly',
      description: 'High-speed laser printer production BOM',
      parentProductId: 'prod-printer-001',
      parentProduct: {
        id: 'prod-printer-001',
        name: 'LaserJet Pro 4000',
        productNumber: 'LJ-PRO-4000',
        description: 'High-speed monochrome laser printer'
      },
      bomType: 'PRODUCTION',
      bomLevel: 1,
      bomStatus: 'PENDING',
      activeFrom: dayjs().add(1, 'month').toISOString(),
      activeTo: dayjs().add(25, 'months').toISOString(),
      validFrom: dayjs().add(1, 'month').toISOString(),
      validTo: dayjs().add(30, 'months').toISOString(),
      baseQuantity: 1,
      baseUom: 'EA',
      scrapFactor: 0.03,
      componentCount: 41,
      totalComponents: 123,
      version: 1,
      recordState: 'pending',
      processInstanceId: 'proc-006',
      createdBy: 'user-004',
      updatedBy: 'user-004',
      createdAt: dayjs().subtract(2, 'weeks').toISOString(),
      updatedAt: dayjs().subtract(1, 'week').toISOString(),
      isDeleted: false
    }
  ]

  // Add more BOMs to reach a realistic dataset size
  const additionalBoms = Array.from({ length: 44 }, (_, index) => ({
    id: `bom-${String(index + 7).padStart(3, '0')}`,
    businessKey: `BOM-PROD-${String(index + 7).padStart(3, '0')}`,
    name: `Product Assembly ${index + 7}`,
    description: `Production BOM for product variant ${index + 7}`,
    parentProductId: `prod-${String(index + 7).padStart(3, '0')}`,
    parentProduct: {
      id: `prod-${String(index + 7).padStart(3, '0')}`,
      name: `Product ${index + 7}`,
      productNumber: `PROD-${String(index + 7).padStart(3, '0')}`,
      description: `Product variant ${index + 7}`
    },
    bomType: ['PRODUCTION', 'ENGINEERING', 'SALES', 'COSTING'][index % 4] as any,
    bomLevel: Math.floor(index / 10) + 1,
    bomStatus: ['ACTIVE', 'INACTIVE', 'PENDING', 'OBSOLETE'][index % 4] as any,
    activeFrom: dayjs()
      .subtract(Math.floor(Math.random() * 12), 'months')
      .toISOString(),
    activeTo: dayjs()
      .add(Math.floor(Math.random() * 24) + 6, 'months')
      .toISOString(),
    validFrom: dayjs()
      .subtract(Math.floor(Math.random() * 12), 'months')
      .toISOString(),
    validTo: dayjs()
      .add(Math.floor(Math.random() * 30) + 12, 'months')
      .toISOString(),
    baseQuantity: 1,
    baseUom: 'EA',
    scrapFactor: Math.random() * 0.05,
    componentCount: Math.floor(Math.random() * 80) + 10,
    totalComponents: Math.floor(Math.random() * 200) + 50,
    version: Math.floor(Math.random() * 5) + 1,
    recordState: 'active',
    processInstanceId: `proc-${String(index + 7).padStart(3, '0')}`,
    createdBy: `user-${String((index % 4) + 1).padStart(3, '0')}`,
    updatedBy: `user-${String((index % 4) + 1).padStart(3, '0')}`,
    createdAt: dayjs()
      .subtract(Math.floor(Math.random() * 365), 'days')
      .toISOString(),
    updatedAt: dayjs()
      .subtract(Math.floor(Math.random() * 30), 'days')
      .toISOString(),
    isDeleted: false
  }))

  const fullDataset = [...allBoms, ...additionalBoms]

  // Paginate the results
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedBoms = fullDataset.slice(startIndex, endIndex)

  console.log(`Generated ${paginatedBoms.length} BOMs out of ${fullDataset.length} total`)

  return {
    boms: paginatedBoms,
    total: fullDataset.length
  }
}

export const generateDemoBomKPIData = (): BomKPIData => {
  return {
    totalBoms: {
      value: 50,
      trend: 8.5
    },
    activeBoms: {
      value: 38,
      trend: 12.3
    },
    totalComponents: {
      value: 2847,
      trend: 15.7
    },
    averageComplexity: {
      value: 56.9,
      trend: -2.1
    }
  }
}
