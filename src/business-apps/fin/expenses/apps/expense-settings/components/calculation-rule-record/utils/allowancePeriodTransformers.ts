import dayjs from 'dayjs'

export interface AllowancePeriodFormValues {
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  validFrom: string
  validTo?: string
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
  validFrom: string
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
  businessKey?: undefined
  additionalProperties?: undefined
}

/**
 * Transform form values for restricted update (only validTo can be changed)
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
  activeFrom: editingItem.validFrom ? dayjs(editingItem.validFrom).startOf('day').toISOString() : null,
  activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null,
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
  activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null,
  additionalProperties: undefined,
  code: formValues.code,
  name: formValues.name,
  overnightAccomodation: formValues.overnightAccommodation,
  fromTime: formValues.fromTime,
  toTime: formValues.toTime,
  minHours: formValues.minHours,
  midnightRule: formValues.midnightRule,
  startAfter: formValues.startAfter,
  returnBefore: formValues.returnBefore,
  activeFrom: formValues.validFrom ? dayjs(formValues.validFrom).startOf('day').toISOString() : null,
  periodOrder: formValues.order
})
