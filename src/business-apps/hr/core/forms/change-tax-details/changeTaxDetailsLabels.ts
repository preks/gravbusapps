import type { GetMessage } from './validationScope'

export function getChangeTaxDetailsLabels(getMessage: GetMessage) {
  return {
    taxNumber: getMessage('lowcoder:change_tax_information.tax_number', 'Tax Number'),
    taxBracket: getMessage('lowcoder:change_tax_information.tax_bracket', 'Tax Bracket'),
    healthInsurance: getMessage('lowcoder:change_tax_information.health_insurance', 'Health Insurance'),
    employeeTaxOffice: getMessage('lowcoder:change_tax_information.employee_tax_office', "Employee's Tax Office"),
    individualFreeAmount: getMessage(
      'lowcoder:change_tax_information.individual_free_amount',
      'Individual Free Amount'
    ),
    healthInsuranceType: getMessage(
      'lowcoder:change_tax_information.health_insurance_type',
      'Type Of Health Insurance'
    ),
    taxIdNumber: getMessage('lowcoder:change_tax_information.tax_identification_number', 'Tax Identification Number'),
    churchAffiliation: getMessage('lowcoder:change_tax_information.taxable_church_affiliation', 'Church Affiliation'),
    socialSecurityNumber: getMessage(
      'lowcoder:change_tax_information.social_security_number',
      'Social Security Number'
    ),
    childTaxAllowance: getMessage('lowcoder:change_tax_information.child_tax_allowance', 'Child Tax Allowance'),
    requestAtTaxOffice: getMessage(
      'lowcoder:change_tax_information.request_at_tax_office_text',
      'Request at tax office'
    ),
    healthInsuranceDocumentUpload: getMessage(
      'lowcoder:change_tax_information.health_insurance_document_upload',
      'Upload document'
    ),
    documentType: getMessage('lowcoder:change_tax_information.document_type', 'Document Type'),
    validTo: getMessage('lowcoder:change_tax_information.document_valid_to', 'Valid to'),
    uploadNewHealthInsuranceDocument: getMessage(
      'lowcoder:change_tax_information.upload_new_health_insurance_document',
      'Upload new health insurance document'
    ),
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
