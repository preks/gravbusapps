import { buildDataGraph, type DataGraphEntityInput } from '../useDataGraph'
import type { DataInternalEntityNodeData } from '../../types/dataViewerTypes'
import {
  DATA_VIEWER_LAYOUT_GAP_Y,
  estimateEntityNodeHeight,
  estimateInternalEntityNodeHeight,
  getDataViewerNodeDimensions
} from '../../layout/dataViewerLayout'

describe('buildDataGraph edge labels', () => {
  it('uses the human-readable column label for relationship edges', () => {
    const entities: DataGraphEntityInput[] = [
      {
        id: 'order',
        key: 'sales_order',
        displayName: 'Sales Order',
        columns: [
          {
            name: 'account_id',
            label: 'Account',
            type: 'SELECT',
            dataSource: { type: 'CUSTOM_ENTITY', entity: 'account' }
          }
        ]
      },
      {
        id: 'account',
        key: 'account',
        displayName: 'Account',
        columns: []
      }
    ]

    const result = buildDataGraph(entities)

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].data?.displayLabel).toBe('Account')
    expect(result.edges[0].data?.foreignKeyColumn).toBe('account_id')
  })

  it('falls back to the target display name when no label is configured', () => {
    const entities: DataGraphEntityInput[] = [
      {
        id: 'entry',
        key: 'content_entry',
        displayName: 'Content Entry',
        columns: [
          {
            name: 'content_category_ids',
            type: 'MULTISELECT',
            dataSource: { type: 'CUSTOM_ENTITY', entity: 'content_category' }
          }
        ]
      },
      {
        id: 'category',
        key: 'content_category',
        displayName: 'Content Category',
        columns: []
      }
    ]

    const result = buildDataGraph(entities)

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].data?.displayLabel).toBe('Content Category')
    expect(result.edges[0].data?.joinTableName).toBe('content_entry_category')
  })

  it('attaches internal entity fields keyed by GET /entities type', () => {
    const entities: DataGraphEntityInput[] = [
      {
        id: 'doc',
        key: 'document',
        displayName: 'Document',
        columns: [
          {
            name: 'owner_id',
            type: 'SELECT',
            dataSource: { type: 'INTERNAL_ENTITY', entity: 'Employee' }
          }
        ]
      }
    ]

    const result = buildDataGraph(entities, {
      internalEntitiesByType: {
        Employee: {
          displayName: 'Employee',
          fields: [
            { name: 'id', displayName: 'ID', type: 'ID' },
            { name: 'displayName', displayName: 'Display Name', type: 'String' }
          ]
        }
      }
    })

    const internalNode = result.nodes.find(n => n.type === 'internalEntity')
    expect(internalNode).toBeDefined()
    expect((internalNode?.data as DataInternalEntityNodeData).displayName).toBe('Employee')
    expect((internalNode?.data as DataInternalEntityNodeData).fields).toEqual([
      { name: 'id', displayName: 'ID', type: 'ID' },
      { name: 'displayName', displayName: 'Display Name', type: 'String' }
    ])
  })

  it('does not connect custom entity edges across mismatched namespaces', () => {
    const entities: DataGraphEntityInput[] = [
      {
        id: 'order',
        namespace: 'sales',
        key: 'order',
        displayName: 'Order',
        columns: [
          {
            name: 'companyId',
            type: 'SELECT',
            dataSource: { type: 'CUSTOM_ENTITY', entity: 'company', namespace: 'crm' }
          }
        ]
      },
      {
        id: 'local-company',
        namespace: 'sales',
        key: 'company',
        displayName: 'Local Company',
        columns: []
      }
    ]

    const result = buildDataGraph(entities)

    expect(result.edges).toHaveLength(0)
  })
})

describe('buildDataGraph layout', () => {
  it('pushes the next row below the tallest node in the previous row', () => {
    const employeeFields = [
      { name: 'id', type: 'ID' },
      { name: 'firstName', type: 'String' },
      { name: 'lastName', type: 'String' },
      { name: 'email', type: 'String' },
      { name: 'department', type: 'String' },
      { name: 'jobTitle', type: 'String' },
      { name: 'location', type: 'String' }
    ]
    const departmentFields = [
      { name: 'id', type: 'ID' },
      { name: 'name', type: 'String' }
    ]
    const assetColumns = [
      { name: 'ownerId', type: 'SELECT', dataSource: { type: 'INTERNAL_ENTITY', entity: 'Employee' } },
      { name: 'departmentId', type: 'SELECT', dataSource: { type: 'INTERNAL_ENTITY', entity: 'Department' } },
      { name: 'serialNumber', type: 'TEXT' },
      { name: 'vendor', type: 'TEXT' },
      { name: 'model', type: 'TEXT' },
      { name: 'purchaseDate', type: 'DATE' },
      { name: 'warrantyEnd', type: 'DATE' },
      { name: 'status', type: 'TEXT' }
    ]
    const entities: DataGraphEntityInput[] = [
      {
        id: 'asset',
        key: 'asset',
        displayName: 'Asset',
        columns: assetColumns
      },
      {
        id: 'status',
        key: 'status',
        displayName: 'Status',
        columns: []
      }
    ]

    const result = buildDataGraph(entities, {
      internalEntitiesByType: {
        Employee: {
          displayName: 'Employee',
          fields: employeeFields.map(field => ({
            ...field,
            displayName: field.name
          }))
        },
        Department: {
          displayName: 'Department',
          fields: departmentFields.map(field => ({
            ...field,
            displayName: field.name
          }))
        }
      }
    })

    const assetNode = result.nodes.find(node => node.id === 'asset')
    const statusNode = result.nodes.find(node => node.id === 'status')
    const employeeNode = result.nodes.find(node => node.id === 'internal-Employee')
    const departmentNode = result.nodes.find(node => node.id === 'internal-Department')

    expect(assetNode).toBeDefined()
    expect(statusNode).toBeDefined()
    expect(employeeNode).toBeDefined()
    expect(departmentNode).toBeDefined()

    if (!assetNode || !statusNode || !employeeNode || !departmentNode) {
      throw new Error('Expected graph nodes to exist')
    }

    const expectedFirstRowHeight = Math.max(
      estimateEntityNodeHeight(assetColumns),
      estimateEntityNodeHeight([]),
      estimateInternalEntityNodeHeight(employeeFields)
    )

    expect(assetNode.position.y).toBe(0)
    expect(statusNode.position.y).toBe(0)
    expect(employeeNode.position.y).toBe(0)
    expect(departmentNode.position.y).toBe(expectedFirstRowHeight + DATA_VIEWER_LAYOUT_GAP_Y)
  })

  it('keeps mixed node types horizontally separated based on shared layout dimensions', () => {
    const entities: DataGraphEntityInput[] = [
      {
        id: 'asset',
        key: 'asset',
        displayName: 'Asset',
        columns: [{ name: 'ownerId', type: 'SELECT', dataSource: { type: 'INTERNAL_ENTITY', entity: 'Employee' } }]
      },
      {
        id: 'location',
        key: 'location',
        displayName: 'Location',
        columns: []
      }
    ]

    const result = buildDataGraph(entities, {
      internalEntitiesByType: {
        Employee: {
          displayName: 'Employee',
          fields: [
            { name: 'id', displayName: 'ID', type: 'ID' },
            { name: 'displayName', displayName: 'Display Name', type: 'String' }
          ]
        }
      }
    })

    const assetNode = result.nodes.find(node => node.id === 'asset')
    const locationNode = result.nodes.find(node => node.id === 'location')
    const employeeNode = result.nodes.find(node => node.id === 'internal-Employee')

    expect(assetNode).toBeDefined()
    expect(locationNode).toBeDefined()
    expect(employeeNode).toBeDefined()

    if (!assetNode || !locationNode || !employeeNode) {
      throw new Error('Expected graph nodes to exist')
    }

    const assetWidth = getDataViewerNodeDimensions(assetNode).width
    const locationWidth = getDataViewerNodeDimensions(locationNode).width

    expect(locationNode.position.x).toBeGreaterThanOrEqual(assetNode.position.x + assetWidth)
    expect(employeeNode.position.x).toBeGreaterThanOrEqual(locationNode.position.x + locationWidth)
  })
})
