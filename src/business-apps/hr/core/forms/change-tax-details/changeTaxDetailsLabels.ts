export type TranslateFn = (key: string) => string

export function getChangeTaxDetailsLabels(t: TranslateFn) {
  return {
    taxNumber: t('tax-number'),
    taxBracket: t('tax-bracket'),
    healthInsurance: t('health-insurance'),
    employeeTaxOffice: t('employee-tax-office'),
    individualFreeAmount: t('individual-free-amount'),
    healthInsuranceType: t('health-insurance-type'),
    taxIdNumber: t('tax-identification-number'),
    churchAffiliation: t('church-affiliation'),
    socialSecurityNumber: t('social-security-number'),
    childTaxAllowance: t('child-tax-allowance'),
    requestAtTaxOffice: t('request-at-tax-office'),
    healthInsuranceDocumentUpload: t('health-insurance-document-upload'),
    documentType: t('document-type'),
    requiredDocumentType: t('required-document-type-text'),
    validTo: t('document-valid-to'),
    uploadNewHealthInsuranceDocument: t('upload-new-health-insurance-document'),
    requiredHealthInsurance: t('required-health-insurance-text'),
    requiredHealthInsuranceType: t('required-health-insurance-type-text'),
    requiredTaxId: t('required-tax-identification-number-text'),
    requiredSSN: t('required-social-security-number-text'),
    invalidLocalizedNumber: t('invalid-localized-number-text'),
    placeholderEnter: t('placeholder-enter'),
    placeholderSelect: t('placeholder-select')
  }
}
