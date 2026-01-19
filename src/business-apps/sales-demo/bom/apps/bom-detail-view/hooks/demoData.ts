import { BillOfMaterials, BomComponent, BomDetailKPIData, BomTreeNode } from '../../../types'
import dayjs from 'dayjs'

// Generate demo BOM detail data
export const generateDemoBomDetail = (bomId: string): BillOfMaterials => {
  const bomData: { [key: string]: BillOfMaterials } = {
    'bom-001': {
      id: 'bom-001',
      businessKey: 'BOM-LAPTOP-001',
      name: 'Enterprise Laptop Assembly',
      description:
        'Complete bill of materials for enterprise-grade laptop computer with advanced security features and high-performance components',
      parentProductId: 'prod-laptop-001',
      parentProduct: {
        id: 'prod-laptop-001',
        name: 'ThinkPad X1 Carbon Gen 11',
        productNumber: 'TP-X1C-G11',
        description: 'High-performance business laptop with 14-inch display'
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
    'bom-002': {
      id: 'bom-002',
      businessKey: 'BOM-PHONE-001',
      name: 'Smartphone Assembly',
      description: 'Complete BOM for flagship smartphone model with advanced camera system and 5G connectivity',
      parentProductId: 'prod-phone-001',
      parentProduct: {
        id: 'prod-phone-001',
        name: 'Galaxy Pro Max',
        productNumber: 'GPM-512-BK',
        description: '512GB Black smartphone with triple camera system'
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
    }
  }

  return bomData[bomId] || bomData['bom-001']
}

// Generate demo BOM components
export const generateDemoBomComponents = (bomId: string): BomComponent[] => {
  const componentSets: { [key: string]: BomComponent[] } = {
    'bom-001': [
      {
        id: 'comp-001',
        bomId: 'bom-001',
        componentProductId: 'prod-cpu-001',
        componentProduct: {
          id: 'prod-cpu-001',
          name: 'Intel Core i7-1365U Processor',
          productNumber: 'CPU-I7-1365U',
          description: '12th Gen Intel Core processor with 10 cores',
          price: 425.0,
          currentCost: 380.0,
          isStockItem: true
        },
        positionNumber: 10,
        level: 1,
        quantity: 1,
        quantityPer: 1,
        uom: 'EA',
        scrapFactor: 0.001,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: true,
        unitCost: 380.0,
        totalCost: 380.0,
        costingMethod: 'STANDARD',
        leadTime: 14,
        supplierName: 'Intel Corporation',
        supplierPartNumber: 'I7-1365U-BX',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      },
      {
        id: 'comp-002',
        bomId: 'bom-001',
        componentProductId: 'prod-ram-001',
        componentProduct: {
          id: 'prod-ram-001',
          name: 'DDR5 SODIMM 16GB',
          productNumber: 'RAM-DDR5-16GB',
          description: '16GB DDR5-5600 SO-DIMM memory module',
          price: 120.0,
          currentCost: 95.0,
          isStockItem: true
        },
        positionNumber: 20,
        level: 1,
        quantity: 2,
        quantityPer: 2,
        uom: 'EA',
        scrapFactor: 0.002,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: true,
        unitCost: 95.0,
        totalCost: 190.0,
        costingMethod: 'STANDARD',
        leadTime: 7,
        supplierName: 'Samsung Electronics',
        supplierPartNumber: 'M471A2K43EB1',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      },
      {
        id: 'comp-003',
        bomId: 'bom-001',
        componentProductId: 'prod-ssd-001',
        componentProduct: {
          id: 'prod-ssd-001',
          name: 'NVMe SSD 1TB',
          productNumber: 'SSD-NVME-1TB',
          description: '1TB NVMe PCIe 4.0 solid state drive',
          price: 180.0,
          currentCost: 145.0,
          isStockItem: true
        },
        positionNumber: 30,
        level: 1,
        quantity: 1,
        quantityPer: 1,
        uom: 'EA',
        scrapFactor: 0.001,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: true,
        unitCost: 145.0,
        totalCost: 145.0,
        costingMethod: 'STANDARD',
        leadTime: 10,
        supplierName: 'Western Digital',
        supplierPartNumber: 'WDS100T3X0C',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      },
      {
        id: 'comp-004',
        bomId: 'bom-001',
        componentProductId: 'prod-display-001',
        componentProduct: {
          id: 'prod-display-001',
          name: '14" WUXGA IPS Display',
          productNumber: 'DISP-14-WUXGA',
          description: '14-inch WUXGA IPS anti-glare display',
          price: 220.0,
          currentCost: 175.0,
          isStockItem: true
        },
        positionNumber: 40,
        level: 1,
        quantity: 1,
        quantityPer: 1,
        uom: 'EA',
        scrapFactor: 0.005,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: true,
        unitCost: 175.0,
        totalCost: 175.0,
        costingMethod: 'STANDARD',
        leadTime: 21,
        supplierName: 'LG Display',
        supplierPartNumber: 'LP140WF9-SPF1',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      },
      {
        id: 'comp-005',
        bomId: 'bom-001',
        componentProductId: 'prod-battery-001',
        componentProduct: {
          id: 'prod-battery-001',
          name: 'Li-ion Battery 57Wh',
          productNumber: 'BAT-LION-57WH',
          description: '57Wh 4-cell lithium-ion battery',
          price: 85.0,
          currentCost: 65.0,
          isStockItem: true
        },
        positionNumber: 50,
        level: 1,
        quantity: 1,
        quantityPer: 1,
        uom: 'EA',
        scrapFactor: 0.003,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: true,
        unitCost: 65.0,
        totalCost: 65.0,
        costingMethod: 'STANDARD',
        leadTime: 14,
        supplierName: 'Panasonic',
        supplierPartNumber: 'NCR18650PF',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      },
      {
        id: 'comp-006',
        bomId: 'bom-001',
        componentProductId: 'prod-keyboard-001',
        componentProduct: {
          id: 'prod-keyboard-001',
          name: 'Backlit Keyboard US',
          productNumber: 'KB-BL-US',
          description: 'Backlit keyboard with US layout',
          price: 45.0,
          currentCost: 32.0,
          isStockItem: true
        },
        positionNumber: 60,
        level: 1,
        quantity: 1,
        quantityPer: 1,
        uom: 'EA',
        scrapFactor: 0.002,
        componentType: 'MATERIAL',
        isOptional: false,
        isCritical: false,
        unitCost: 32.0,
        totalCost: 32.0,
        costingMethod: 'STANDARD',
        leadTime: 7,
        supplierName: 'Chicony Electronics',
        supplierPartNumber: 'KBD-BL-US-001',
        createdAt: dayjs().subtract(6, 'months').toISOString(),
        updatedAt: dayjs().subtract(1, 'week').toISOString(),
        isDeleted: false
      }
    ]
  }

  return componentSets[bomId] || componentSets['bom-001']
}

// Generate demo KPI data for BOM detail
export const generateDemoBomDetailKPIData = (bomId: string): BomDetailKPIData => {
  const kpiSets: { [key: string]: BomDetailKPIData } = {
    'bom-001': {
      totalComponents: {
        value: 47,
        trend: 6.8
      },
      totalCost: {
        value: 987.0,
        trend: -3.2
      },
      complexity: {
        value: 3.2,
        trend: 0.0
      },
      criticalComponents: {
        value: 12,
        trend: 8.3
      }
    },
    'bom-002': {
      totalComponents: {
        value: 89,
        trend: 12.5
      },
      totalCost: {
        value: 1456.0,
        trend: -1.8
      },
      complexity: {
        value: 4.1,
        trend: 2.5
      },
      criticalComponents: {
        value: 23,
        trend: 15.0
      }
    }
  }

  return kpiSets[bomId] || kpiSets['bom-001']
}

// Generate demo tree structure for BOM visualization
export const generateDemoBomTree = (bomId: string): BomTreeNode[] => {
  const treeSets: { [key: string]: BomTreeNode[] } = {
    'bom-001': [
      {
        key: 'root',
        title: 'ThinkPad X1 Carbon Gen 11',
        productNumber: 'TP-X1C-G11',
        quantity: 1,
        uom: 'EA',
        level: 0,
        componentType: 'ASSEMBLY',
        isOptional: false,
        isCritical: true,
        totalCost: 987.0,
        children: [
          {
            key: 'comp-001',
            title: 'Intel Core i7-1365U Processor',
            productNumber: 'CPU-I7-1365U',
            quantity: 1,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: true,
            unitCost: 380.0,
            totalCost: 380.0
          },
          {
            key: 'comp-002',
            title: 'DDR5 SODIMM 16GB',
            productNumber: 'RAM-DDR5-16GB',
            quantity: 2,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: true,
            unitCost: 95.0,
            totalCost: 190.0
          },
          {
            key: 'comp-003',
            title: 'NVMe SSD 1TB',
            productNumber: 'SSD-NVME-1TB',
            quantity: 1,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: true,
            unitCost: 145.0,
            totalCost: 145.0
          },
          {
            key: 'comp-004',
            title: '14" WUXGA IPS Display',
            productNumber: 'DISP-14-WUXGA',
            quantity: 1,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: true,
            unitCost: 175.0,
            totalCost: 175.0
          },
          {
            key: 'comp-005',
            title: 'Li-ion Battery 57Wh',
            productNumber: 'BAT-LION-57WH',
            quantity: 1,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: true,
            unitCost: 65.0,
            totalCost: 65.0
          },
          {
            key: 'comp-006',
            title: 'Backlit Keyboard US',
            productNumber: 'KB-BL-US',
            quantity: 1,
            uom: 'EA',
            level: 1,
            componentType: 'MATERIAL',
            isOptional: false,
            isCritical: false,
            unitCost: 32.0,
            totalCost: 32.0
          }
        ]
      }
    ]
  }

  return treeSets[bomId] || treeSets['bom-001']
}
