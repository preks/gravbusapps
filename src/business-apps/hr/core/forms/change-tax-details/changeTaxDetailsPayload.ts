import type { TaxInfoFormValues } from './types'

export function buildEmployeeTaxDetailPayload(
  values: TaxInfoFormValues,
  data: any
): { employeeTaxDetail: any; changeMode: string; employeeId: string; event: string } {
  const childTaxAllowanceNum =
    values.childTaxAllowance !== '' && values.childTaxAllowance != null ? Number(values.childTaxAllowance) : 0
  const isUpdate = Boolean(data?.id)
  const additionalProperties: Record<string, unknown> = {
    ...(data?.additionalProperties || {}),
    requestAtTaxOffice: Boolean(values.requestAtTaxOffice)
  }
  if (values.requestAtTaxOffice) {
    const emp = String(values.employeeTaxOffice ?? '').trim()
    const free = String(values.individualFreeAmount ?? '').trim()
    if (emp) additionalProperties.employeeTaxOffice = emp
    if (free) additionalProperties.individualFreeAmount = free
  } else {
    delete additionalProperties.employeeTaxOffice
    delete additionalProperties.individualFreeAmount
  }

  const employeeTaxDetail = {
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
    taxableChurchAffiliationRef: values.taxableChurchAffiliationRef || '',
    healthInsuranceTypeRef: values.healthInsuranceTypeRef || '',
    healthInsuranceName: values.healthInsuranceName || '',
    healthInsuranceDocument: values.uploadedHealthInsuranceDocumentId ?? data?.healthInsuranceDocument ?? null,
    childTaxAllowance: Number.isNaN(childTaxAllowanceNum) ? 0 : childTaxAllowanceNum,
    religionRef: values.taxableChurchAffiliationRef || data?.religionRef || '',
    additionalProperties
  }

  return {
    employeeTaxDetail,
    changeMode: isUpdate ? 'UPDATE' : 'INSERT',
    employeeId: '',
    event: 'pse_submit'
  }
}
