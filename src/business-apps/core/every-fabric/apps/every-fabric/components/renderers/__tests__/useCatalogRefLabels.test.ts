import type { PresentedPermissionAction, PresentedPermissionField } from '../toolPermissionPresenter'
import { applyCatalogLabels, collectCatalogRefs, parseCatalogRef } from '../useCatalogRefLabels'

const makeField = (
  overrides: Partial<PresentedPermissionField> & { id: string; value: unknown }
): PresentedPermissionField => ({
  label: overrides.id,
  path: overrides.id.split('.'),
  editable: false,
  ...overrides
})

const makeAction = (
  visibleFields: PresentedPermissionField[],
  technicalFields: PresentedPermissionField[] = []
): PresentedPermissionAction => ({
  toolName: 'saveAccount',
  displayToolName: 'Save Account',
  title: 'Save Account',
  summary: 'Run after approval.',
  visibleFields,
  technicalFields,
  canEdit: false,
  rebuildAction: () => ({ name: 'saveAccount' })
})

describe('parseCatalogRef', () => {
  it('parses a catalog ref into identifier, version and code', () => {
    expect(parseCatalogRef('Country:v1:DE')).toEqual({
      raw: 'Country:v1:DE',
      catalogIdentifier: 'Country',
      version: 'v1',
      code: 'DE'
    })
  })

  it('keeps codes that contain extra colons intact', () => {
    expect(parseCatalogRef('SalesPipelineStage:v2:STAGE:WON')?.code).toBe('STAGE:WON')
  })

  it('returns null for UUIDs and plain strings', () => {
    expect(parseCatalogRef('408459e0-44be-4449-8092-680fb7e4b4fc')).toBeNull()
    expect(parseCatalogRef('Senior PM - Growth')).toBeNull()
    expect(parseCatalogRef(42)).toBeNull()
  })
})

describe('collectCatalogRefs', () => {
  it('collects distinct catalog refs across visible and technical fields, skipping resolved ones', () => {
    const actions = [
      makeAction(
        [
          makeField({ id: 'countryRef', value: 'Country:v1:DE' }),
          makeField({ id: 'currencyRef', value: 'Currency:v1:EUR' }),
          // Already resolved by the presenter (inline option) -> ignored.
          makeField({ id: 'assetCategoryRef', value: 'AssetCategory:v1:LAPTOP', displayValue: 'Laptop' }),
          makeField({ id: 'name', value: 'Acme GmbH' })
        ],
        [makeField({ id: 'duplicate', value: 'Country:v1:DE' })]
      )
    ]

    expect(collectCatalogRefs(actions).map(ref => ref.raw)).toEqual(['Country:v1:DE', 'Currency:v1:EUR'])
  })
})

describe('applyCatalogLabels', () => {
  it('injects resolved labels as displayValue without mutating the raw value', () => {
    const actions = [makeAction([makeField({ id: 'countryRef', value: 'Country:v1:DE' })])]
    const labelled = applyCatalogLabels(actions, new Map([['Country:v1:DE', 'Germany']]))

    const field = labelled[0].visibleFields[0]
    expect(field.displayValue).toBe('Germany')
    expect(field.value).toBe('Country:v1:DE')
  })

  it('returns the original actions when no labels resolved', () => {
    const actions = [makeAction([makeField({ id: 'countryRef', value: 'Country:v1:DE' })])]
    expect(applyCatalogLabels(actions, new Map())).toBe(actions)
  })
})
