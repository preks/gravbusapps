import type { GetMessage } from './validationScope'

export type TranslateFn = (key: string) => string

export function getChangeTaxDetailsLabels(getMessage: GetMessage, t: TranslateFn) {
  return {
    taxNumber: getMessage('lowcoder:change_tax_information.tax_number', 'Tax Number'),
    taxBracket: getMessage('lowcoder:change_tax_information.tax_bracket', 'Tax Bracket'),
    healthInsurance: getMessage('lowcoder:change_tax_information.health_insurance', 'Health Insurance'),
    employeeTaxOffice: t('employee-tax-office'),
    individualFreeAmount: t('individual-free-amount'),
    healthInsuranceType: getMessage(
      'lowcoder:change_tax_information.health_insurance_type',
      'Type Of Health Insurance'
    ),
    taxIdNumber: getMessage('lowcoder:change_tax_information.tax_identification_number', 'Tax Identification Number'),
    religion: t('religion'),
    churchAffiliation: getMessage('lowcoder:change_tax_information.taxable_church_affiliation', 'Church Affiliation'),
    socialSecurityNumber: getMessage(
      'lowcoder:change_tax_information.social_security_number',
      'Social Security Number'
    ),
    childTaxAllowance: getMessage('lowcoder:change_tax_information.child_tax_allowance', 'Child Tax Allowance'),
    requestAtTaxOffice: t('request-at-tax-office'),
    healthInsuranceDocumentUpload: t('health-insurance-document-upload'),
    documentType: t('document-type'),
    requiredDocumentType: t('required-document-type-text'),
    validTo: t('document-valid-to'),
    uploadNewHealthInsuranceDocument: t('upload-new-health-insurance-document'),
    requiredHealthInsurance: getMessage(
      'lowcoder:change_tax_information.required_health_insurance_text',
      'The Health Insurance field is required.'
    ),
    requiredHealthInsuranceType: getMessage(
      'lowcoder:change_tax_information.required_health_insurance_type_text',
      'The Type Of Health Insurance field is required.'
    ),
    requiredTaxId: getMessage(
      'lowcoder:change_tax_information.required_tax_identification_number_text',
      'The Tax Identification Number field is required.'
    ),
    requiredSSN: getMessage(
      'lowcoder:change_tax_information.required_social_security_number_text',
      'The Social Security Number field is required.'
    ),
    invalidLocalizedNumber: t('invalid-localized-number-text'),
    placeholderEnter: getMessage(
      'lowcoder:employee_profile.details_layout.personal_information_container.enter_placeholder',
      'Please Enter'
    ),
    placeholderSelect: getMessage(
      'lowcoder:employee_profile.details_layout.personal_information_container.select_placeholder',
      'Please Select'
    )
  }
}
