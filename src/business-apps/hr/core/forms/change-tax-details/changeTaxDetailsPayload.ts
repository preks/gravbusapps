import type { TaxInfoFormValues } from './types'

function buildAdditionalProperties(values: TaxInfoFormValues, data: any): Record<string, unknown> {
  const additionalProperties: Record<string, unknown> = {}
  const base = data?.additionalProperties
  if (typeof base === 'object' && base !== null) {
    Object.assign(additionalProperties, base)
  }
  additionalProperties.requestAtTaxOffice = Boolean(values.requestAtTaxOffice)
  if (values.requestAtTaxOffice) {
    const emp = String(values.employeeTaxOffice ?? '').trim()
    const free = String(values.individualFreeAmount ?? '').trim()
    if (emp) additionalProperties.employeeTaxOffice = emp
    if (free) additionalProperties.individualFreeAmount = free
  } else {
    delete additionalProperties.employeeTaxOffice
    delete additionalProperties.individualFreeAmount
  }
  return additionalProperties
}

function buildEmployeeTaxDetailObject(
  values: TaxInfoFormValues,
  data: any,
  additionalProperties: Record<string, unknown>
): any {
  const childTaxAllowanceNum =
    values.childTaxAllowance !== '' && values.childTaxAllowance != null ? Number(values.childTaxAllowance) : 0
  const healthInsuranceDocId =
    values.uploadedHealthInsuranceDocumentId ??
    (typeof data?.healthInsuranceDocument === 'object' && data?.healthInsuranceDocument != null
      ? (data.healthInsuranceDocument as { id?: string }).id
      : data?.healthInsuranceDocument) ??
    null
  return {
    ...(data?.id ? { id: data.id } : {}),
    ...(data?.version !== undefined ? { version: data.version } : { version: 0 }),
    ...(data?.businessKey ? { businessKey: data.businessKey } : {}),
    ...(data?.activeTo ? { activeTo: data.activeTo } : {}),
    employeeId: '', // caller must set
    taxIdentificationNumber: values.taxIdentificationNumber || '',
    taxNumber: values.taxNumber || '',
    taxBracketRef: values.taxBracketRef || '',
    socialSecurityNumber: values.socialSecurityNumber || '',
    wageTaxClassRef: data?.wageTaxClassRef ?? '',
    religionRef: values.religionRef || '',
    taxableChurchAffiliationRef: values.taxableChurchAffiliationRef || '',
    healthInsuranceTypeRef: values.healthInsuranceTypeRef || '',
    healthInsuranceName: values.healthInsuranceName || '',
    healthInsuranceDocument: healthInsuranceDocId,
    childTaxAllowance: Number.isNaN(childTaxAllowanceNum) ? 0 : childTaxAllowanceNum,
    additionalProperties
  }
}

export function buildEmployeeTaxDetailPayload(
  values: TaxInfoFormValues,
  data: any
): { employeeTaxDetail: any; changeMode: string; employeeId: string; event: string } {
  const isUpdate = Boolean(data?.id)
  const additionalProperties = buildAdditionalProperties(values, data)
  const employeeTaxDetail = buildEmployeeTaxDetailObject(values, data, additionalProperties)
  return {
    employeeTaxDetail,
    changeMode: isUpdate ? 'UPDATE' : 'INSERT',
    employeeId: '',
    event: 'pse_submit'
  }
}
