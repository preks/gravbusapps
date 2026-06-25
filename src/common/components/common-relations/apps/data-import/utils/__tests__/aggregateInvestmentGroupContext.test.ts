import { aggregateInvestmentGroupContext } from '../aggregateInvestmentGroupContext'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

const baseEntry = (overrides: Partial<CatalogEntry>): CatalogEntry =>
  ({
    id: 'unset',
    catalogId: 'cat',
    displayValue: '',
    hasChildren: false,
    level: 0,
    searchableText: '',
    ...overrides
  }) as CatalogEntry

describe('aggregateInvestmentGroupContext', () => {
  it('returns empty context when groupId is missing', () => {
    expect(aggregateInvestmentGroupContext(null, [])).toEqual({
      requiredSubtypeKey: '',
      additionalPropertiesFields: [],
      additionalPropertiesFieldTypes: {},
      tileFieldKeys: []
    })
  })

  it('collects short field names and catalog types across the subtree', () => {
    const entries: CatalogEntry[] = [
      baseEntry({
        id: 'group-1',
        objectValue: {
          requiredSubtypeKey: 'liquidFundInvestment',
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.openingBalance',
                  type: 'AMOUNT'
                },
                {
                  property: 'investment.investmentDate',
                  type: 'DATE'
                }
              ]
            }
          ]
        }
      }),
      baseEntry({
        id: 'type-1',
        parentEntryId: 'group-1',
        objectValue: {
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.realizedGainsLosses',
                  type: 'AMOUNT'
                },
                {
                  property: 'liquidFundInvestment.additionalProperties.notes',
                  type: 'TEXT'
                }
              ]
            }
          ],
          tileFields: [{ key: 'openingBalance' }, { key: 'realizedGainsLosses' }]
        }
      }),
      baseEntry({
        id: 'unrelated-1',
        objectValue: {
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.ignoredOutsideSubtree',
                  type: 'AMOUNT'
                }
              ]
            }
          ]
        }
      })
    ]

    const ctx = aggregateInvestmentGroupContext('group-1', entries)

    expect(ctx.requiredSubtypeKey).toBe('liquidFundInvestment')
    expect(ctx.additionalPropertiesFields).toEqual(['openingBalance', 'realizedGainsLosses', 'notes'])
    expect(ctx.additionalPropertiesFieldTypes).toEqual({
      openingBalance: 'AMOUNT',
      realizedGainsLosses: 'AMOUNT',
      notes: 'TEXT'
    })
    expect(ctx.tileFieldKeys).toEqual(['openingBalance', 'realizedGainsLosses'])
  })

  it('first-write-wins on conflicting catalog types for the same short name', () => {
    const entries: CatalogEntry[] = [
      baseEntry({
        id: 'group-1',
        objectValue: {
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.amount',
                  type: 'AMOUNT'
                }
              ]
            }
          ]
        }
      }),
      baseEntry({
        id: 'type-1',
        parentEntryId: 'group-1',
        objectValue: {
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.amount',
                  type: 'TEXT'
                }
              ]
            }
          ]
        }
      })
    ]

    const ctx = aggregateInvestmentGroupContext('group-1', entries)
    expect(ctx.additionalPropertiesFieldTypes).toEqual({ amount: 'AMOUNT' })
  })

  it('omits the type entry when catalog field has no `type`', () => {
    const entries: CatalogEntry[] = [
      baseEntry({
        id: 'group-1',
        objectValue: {
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.untypedField'
                }
              ]
            }
          ]
        }
      })
    ]

    const ctx = aggregateInvestmentGroupContext('group-1', entries)
    expect(ctx.additionalPropertiesFields).toEqual(['untypedField'])
    expect(ctx.additionalPropertiesFieldTypes).toEqual({})
  })

  it('tolerates objectValue passed as a JSON string', () => {
    const entries: CatalogEntry[] = [
      baseEntry({
        id: 'group-1',
        objectValue: JSON.stringify({
          formFields: [
            {
              fields: [
                {
                  property: 'liquidFundInvestment.additionalProperties.percent',
                  type: 'PERCENTAGE'
                }
              ]
            }
          ]
        })
      })
    ]

    const ctx = aggregateInvestmentGroupContext('group-1', entries)
    expect(ctx.additionalPropertiesFieldTypes).toEqual({ percent: 'PERCENTAGE' })
  })
})
