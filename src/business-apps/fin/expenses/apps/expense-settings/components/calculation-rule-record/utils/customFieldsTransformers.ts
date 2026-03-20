import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { toISOStartOfDay, toISOEndOfDay } from '../../../utils/dateUtils'

dayjs.extend(utc)

export interface CustomFieldFormValues {
  source: 'Expense' | 'Mileage'
  relatedId: string
  infoValue: string
  mandatory: boolean
  activeFrom: string
  activeTo?: string
}

export interface CustomFieldEditingItem {
  id: string
  version?: number
  source: 'Expense' | 'Mileage'
  relatedId: string
  activeFrom: string
}

export interface CustomFieldSaveData {
  id?: string
  version?: number
  expenseRuleId: string
  businessKey?: never
  activeTo: string | null
  additionalProperties?: never
  source: string
  infoValue: string
  mandatory: boolean
  activeFrom: string | null
  expenseRuleMileageId: string | null
  expenseRuleGeneralExpenseId: string | null
}

type SourceToApiEnumFn = (source: 'Expense' | 'Mileage') => string

/**
 * Builds the related ID fields based on source type
 */
const buildRelatedIds = (source: 'Expense' | 'Mileage', relatedId: string) => ({
  expenseRuleMileageId: source === 'Mileage' ? relatedId : null,
  expenseRuleGeneralExpenseId: source === 'Expense' ? relatedId : null
})

/**
 * Transforms form values for a restricted update (only activeTo and infoValue can change)
 */
export const transformCustomFieldForRestrictedUpdate = (
  formValues: CustomFieldFormValues,
  editingItem: CustomFieldEditingItem,
  ruleId: string,
  mapSourceToApiEnum: SourceToApiEnumFn
): CustomFieldSaveData => ({
  id: editingItem.id,
  version: editingItem.version,
  expenseRuleId: ruleId,
  source: mapSourceToApiEnum(editingItem.source),
  infoValue: formValues.infoValue,
  mandatory: editingItem.mandatory as unknown as boolean,
  activeFrom: editingItem.activeFrom ? toISOStartOfDay(editingItem.activeFrom) : null,
  activeTo: formValues.activeTo ? toISOEndOfDay(formValues.activeTo) : null,
  ...buildRelatedIds(editingItem.source, editingItem.relatedId)
})

/**
 * Transforms form values for a full save (create or unrestricted update)
 */
export const transformCustomFieldForSave = (
  formValues: CustomFieldFormValues,
  ruleId: string,
  editingItem: CustomFieldEditingItem | null,
  mapSourceToApiEnum: SourceToApiEnumFn
): CustomFieldSaveData => ({
  ...(editingItem && { id: editingItem.id, version: editingItem.version }),
  expenseRuleId: ruleId,
  businessKey: undefined,
  activeTo: formValues.activeTo ? toISOEndOfDay(formValues.activeTo) : null,
  additionalProperties: undefined,
  source: mapSourceToApiEnum(formValues.source),
  infoValue: formValues.infoValue,
  mandatory: formValues.mandatory,
  activeFrom: formValues.activeFrom ? toISOStartOfDay(formValues.activeFrom) : null,
  ...buildRelatedIds(formValues.source, formValues.relatedId)
})
