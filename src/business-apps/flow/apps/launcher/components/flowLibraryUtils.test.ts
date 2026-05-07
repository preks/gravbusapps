import { computeItemsByCategory, dedupFlowTemplateLibraryItems } from './flowLibraryUtils'
import type { FlowTemplateLibraryItem } from '../hooks/useFlowTemplateLibrary'

const makeItem = (
  templateId: string,
  name: string,
  serviceCategoryIds: string[],
  serviceCategoryRefs: string[] = [],
  description?: string
): FlowTemplateLibraryItem => ({
  template: { id: templateId, name } as FlowTemplateLibraryItem['template'],
  templateId,
  name,
  description,
  triggerTypes: [] as FlowTemplateLibraryItem['triggerTypes'],
  isManualLaunchable: true,
  serviceCategoryRefs:
    serviceCategoryRefs.length > 0 ? serviceCategoryRefs : serviceCategoryIds.map(id => `ServicePortalCategory:1:${id}`),
  serviceCategoryIds
})

describe('computeItemsByCategory', () => {
  it('reproduces a36d2a23: a template with duplicate matching category ids must NOT be listed multiple times in the same category', () => {
    // Bug a36d2a23: "flow launcher's flow is duplicated".
    // When a template's `serviceCategoryIds` contains the same category id more than once
    // (e.g. parsed from `serviceCategory: ['ServicePortalCategory:1:hr','ServicePortalCategory:2:hr']`,
    // both decoding to `'hr'`), the previous implementation pushed the item once per
    // duplicate match — causing flows like "New Hire Survey" to render twice in the
    // launcher's category view.
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-new-hire-survey', 'New Hire Survey', ['hr', 'hr']),
      makeItem('tpl-employee-requisition', 'Employee Requisition Process', ['hr', 'hr', 'hr']),
      makeItem('tpl-recruiting', 'Employee Recruiting Process', ['hr'])
    ]

    const known = new Set(['hr', 'finance'])
    const { byCategoryId, uncategorized } = computeItemsByCategory(items, known)

    expect(uncategorized).toHaveLength(0)

    const hrBucket = byCategoryId.get('hr') || []
    const hrTemplateIds = hrBucket.map(i => i.templateId)

    // Each template must appear exactly once in the HR category, regardless of how
    // many times it tagged the same category id.
    expect(hrTemplateIds).toEqual(['tpl-new-hire-survey', 'tpl-employee-requisition', 'tpl-recruiting'])
    expect(new Set(hrTemplateIds).size).toBe(hrTemplateIds.length)
  })

  it('still places a template into every distinct category it tags', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-cross', 'Cross-Functional Flow', ['hr', 'finance', 'hr'])
    ]
    const known = new Set(['hr', 'finance', 'it'])

    const { byCategoryId, uncategorized } = computeItemsByCategory(items, known)

    expect(uncategorized).toHaveLength(0)
    expect((byCategoryId.get('hr') || []).map(i => i.templateId)).toEqual(['tpl-cross'])
    expect((byCategoryId.get('finance') || []).map(i => i.templateId)).toEqual(['tpl-cross'])
    expect(byCategoryId.get('it')).toBeUndefined()
  })

  it('puts items with no matching known category into uncategorized exactly once', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-orphan', 'Orphan Flow', ['unknown', 'also-unknown']),
      makeItem('tpl-empty', 'No Tags Flow', [])
    ]
    const known = new Set(['hr'])

    const { byCategoryId, uncategorized } = computeItemsByCategory(items, known)

    expect(byCategoryId.size).toBe(0)
    expect(uncategorized.map(i => i.templateId)).toEqual(['tpl-orphan', 'tpl-empty'])
  })
})

describe('dedupFlowTemplateLibraryItems', () => {
  it('drops items with the same templateId, keeping the first occurrence', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-a', 'Alpha', ['hr'], [], 'first'),
      makeItem('tpl-a', 'Alpha', ['hr'], [], 'second'),
      makeItem('tpl-b', 'Beta', ['hr'])
    ]

    const result = dedupFlowTemplateLibraryItems(items)

    expect(result).toHaveLength(2)
    expect(result.map(i => i.templateId)).toEqual(['tpl-a', 'tpl-b'])
    expect(result[0].description).toBe('first')
  })

  it('drops items with identical name+description but different templateIds (backend echoing the same tile)', () => {
    // Production case from issue a36d2a23: every tile shown 2–3 times.
    // Distinct backend ids, identical user-visible content.
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-1', 'Training Assessment Survey', ['hr'], [], 'Post-training knowledge assessment'),
      makeItem('tpl-2', 'Training Assessment Survey', ['hr'], [], 'Post-training knowledge assessment'),
      makeItem('tpl-3', 'Training Assessment Survey', ['hr'], [], 'Post-training knowledge assessment'),
      makeItem('tpl-4', 'Employee Training Process', ['hr'], [], 'Employee compliance training')
    ]

    const result = dedupFlowTemplateLibraryItems(items)

    expect(result.map(i => i.templateId)).toEqual(['tpl-1', 'tpl-4'])
  })

  it('treats name comparison as case-insensitive and whitespace-trimmed', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-1', 'New Hire Survey', ['hr'], [], 'Onboard'),
      makeItem('tpl-2', '  new hire survey  ', ['hr'], [], 'ONBOARD')
    ]

    const result = dedupFlowTemplateLibraryItems(items)

    expect(result.map(i => i.templateId)).toEqual(['tpl-1'])
  })

  it('does NOT collapse items that are blank in both name and description (avoids merging unrelated stubs)', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-x', '', ['hr']),
      makeItem('tpl-y', '', ['hr'])
    ]

    const result = dedupFlowTemplateLibraryItems(items)

    expect(result.map(i => i.templateId)).toEqual(['tpl-x', 'tpl-y'])
  })

  it('keeps items with the same name but different descriptions', () => {
    const items: FlowTemplateLibraryItem[] = [
      makeItem('tpl-1', 'Approval', ['hr'], [], 'Manager approval'),
      makeItem('tpl-2', 'Approval', ['hr'], [], 'Finance approval')
    ]

    const result = dedupFlowTemplateLibraryItems(items)

    expect(result.map(i => i.templateId)).toEqual(['tpl-1', 'tpl-2'])
  })
})
