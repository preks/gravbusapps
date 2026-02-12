import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { toISOStartOfDay, toISOEndOfDay } from '../../../utils/dateUtils'

dayjs.extend(utc)

export interface AllowancePeriodFormValues {
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number | string // Allow string during editing (e.g., "12." or "0.5")
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  activeFrom: string
  activeTo?: string
  order?: number
}

export interface AllowancePeriodItem {
  id: string
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  activeFrom: string
  order?: number
  version?: number
}

export interface AllowancePeriodSaveData {
  id?: string
  version?: number
  expenseRuleId: string
  code: string
  name: string
  activeFrom: string | null
  activeTo: string | null
  fromTime?: string
  toTime?: string
  minHours?: number
  midnightRule?: boolean
  overnightAccomodation?: boolean
  startAfter?: string
  returnBefore?: string
  periodOrder?: number
  businessKey?: never
  additionalProperties?: never
}

/**
 * Transform form values for restricted update (only activeTo can be changed)
 */
export const transformAllowancePeriodForRestrictedUpdate = (
  formValues: AllowancePeriodFormValues,
  editingItem: AllowancePeriodItem,
  ruleId: string
): AllowancePeriodSaveData => ({
  id: editingItem.id,
  version: editingItem.version,
  expenseRuleId: ruleId,
  code: editingItem.code,
  name: editingItem.name,
  activeFrom: editingItem.activeFrom ? toISOStartOfDay(editingItem.activeFrom) : null,
  activeTo: formValues.activeTo ? toISOEndOfDay(formValues.activeTo) : null,
  fromTime: editingItem.fromTime,
  toTime: editingItem.toTime,
  minHours: editingItem.minHours,
  midnightRule: editingItem.midnightRule,
  periodOrder: editingItem.order
})

/**
 * Transform form values for full save (create or unrestricted update)
 */
export const transformAllowancePeriodForSave = (
  formValues: AllowancePeriodFormValues,
  ruleId: string,
  editingItem?: AllowancePeriodItem | null
): AllowancePeriodSaveData => ({
  ...(editingItem && { id: editingItem.id, version: editingItem.version }),
  expenseRuleId: ruleId,
  businessKey: undefined,
  activeTo: formValues.activeTo ? toISOEndOfDay(formValues.activeTo) : null,
  additionalProperties: undefined,
  code: formValues.code,
  name: formValues.name,
  overnightAccomodation: formValues.overnightAccommodation,
  fromTime: formValues.fromTime,
  toTime: formValues.toTime,
  minHours: typeof formValues.minHours === 'string' ? parseFloat(formValues.minHours) || 0 : formValues.minHours,
  midnightRule: formValues.midnightRule,
  startAfter: formValues.startAfter,
  returnBefore: formValues.returnBefore,
  activeFrom: formValues.activeFrom ? toISOStartOfDay(formValues.activeFrom) : null,
  periodOrder: formValues.order
})
