import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UploadedEmployeeDocument } from './uploadHelpers'

export const ensureFourLines = (lines: string[] = []): string[] => {
  return Array.from({ length: 4 }, (_, i) => String(lines?.[i] || ''))
}

export const computeNewAddressType = (addresses: any[]): 'PRIMARY' | 'SECONDARY' => {
  const hasPrimary = addresses.some((obj: any) => obj.type === 'PRIMARY')
  return hasPrimary ? 'SECONDARY' : 'PRIMARY'
}

export interface AddressFormValuesLike {
  selectedAddressId?: string | null
  countryId?: string | null
  addressLines?: string[]
  postalCode?: string
  city?: string
  regionId?: string | null
  comment?: string
}

export const validateAddressForm = (
  values: AddressFormValuesLike,
  catalogs: { countries?: any[] }
): string[] | null => {
  const errors: string[] = []
  if (!values.countryId) {
    errors.push(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.country_validation_message',
        'The Country field is required. Please select a value.'
      )
    )
  }
  if (!values.addressLines?.[0] || values.addressLines[0].trim() === '') {
    errors.push(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.address_line_validation_message',
        'The Address Line field is required. Please enter your street address.'
      )
    )
  }
  const selectedCountry = (catalogs?.countries || []).find((c: any) => String(c.id) === String(values.countryId))
  const countryVal = selectedCountry?.id
  if (!values.postalCode || values.postalCode.trim() === '') {
    errors.push(
      countryVal === 'Country:v1:US'
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.address_container.zip_code_validation_message',
            'The ZIP Code field is required. Please enter a ZIP code.'
          )
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_profile.details_layout.address_container.postal_code_validation_message',
            'The Postal Code field is required. Please enter a postal code.'
          )
    )
  }
  if (!values.city || values.city.trim() === '') {
    errors.push(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.city_validation_message',
        'The City field is required. Please select a city.'
      )
    )
  }
  if (countryVal === 'Country:v1:DE' || countryVal === 'Country:v1:US' || countryVal === 'Country:v1:RO') {
    if (!values.regionId) {
      errors.push(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.region_validation_message',
          'Please select a value.'
        )
      )
    }
  }
  return errors.length ? errors : null
}

export const shouldDisableSubmit = (
  values: AddressFormValuesLike,
  addresses: any[],
  catalogs: { countries?: any[] },
  addSentinel?: string
): boolean => {
  const errs = validateAddressForm(values, catalogs)
  const hasPrimary = addresses.some((obj: any) => obj.type === 'PRIMARY')
  const hasSecondary = addresses.some((obj: any) => obj.type === 'SECONDARY')
  const addingNew = !values.selectedAddressId || (addSentinel ? values.selectedAddressId === addSentinel : false)
  const limitReached = addingNew && hasPrimary && hasSecondary
  return Boolean(errs && errs.length > 0) || limitReached
}

const buildEmployeeDocumentObject = (employeeDocument?: UploadedEmployeeDocument | null) => {
  return employeeDocument
    ? {
        id: employeeDocument.id,
        name: employeeDocument.name,
        file: employeeDocument.file,
        mimeType: employeeDocument.mimeType,
        employeeId: employeeDocument.employeeId
      }
    : null
}

const buildCommonAddressFields = (params: {
  employeeId: string
  employeeDocument?: UploadedEmployeeDocument | null
  lines: string | string[]
  postalCode?: string
  city?: string
  regionId?: string | null
  countryId?: string | null
  comment?: string
}) => ({
  postalCode: params.postalCode || '',
  locality: params.city || '',
  regionRef: params.regionId || '',
  countryRef: params.countryId || '',
  poBox: false,
  notes: params.comment || '',
  employeeDocument: params.employeeDocument?.id || ''
})

export const buildInsertPayload = (params: {
  employeeId: string
  employeeDocument?: UploadedEmployeeDocument | null
  lines: string[]
  postalCode?: string
  city?: string
  regionId?: string | null
  countryId?: string | null
  comment?: string
  addresses: any[]
}) => {
  const type = computeNewAddressType(params.addresses) || ''
  return {
    event: 'pse_submit',
    employeeDocumentObject: buildEmployeeDocumentObject(params.employeeDocument),
    address: {
      employeeId: params.employeeId,
      type,
      addressLine: params.lines || '',
      ...buildCommonAddressFields(params)
    },
    changeMode: 'INSERT',
    oldAddressData: {}
  } as any
}

export const buildUpdatePayload = (params: {
  employeeId: string
  employeeDocument?: UploadedEmployeeDocument | null
  lines: string[]
  postalCode?: string
  city?: string
  regionId?: string | null
  countryId?: string | null
  comment?: string
  selected: any
}) => {
  const sel = params.selected || {}
  return {
    event: 'pse_submit',
    employeeDocumentObject: buildEmployeeDocumentObject(params.employeeDocument),
    address: {
      id: sel?.id,
      version: sel?.version,
      employeeId: params.employeeId,
      type: sel?.type,
      addressLine: params.lines,
      ...buildCommonAddressFields(params)
    },
    changeMode: 'UPDATE',
    oldAddressData: {
      id: sel?.id,
      version: sel?.version,
      employeeId: params.employeeId,
      type: sel?.type || '',
      addressLine: sel?.addressLine || '',
      postalCode: sel?.postalCode || '',
      locality: sel?.locality || '',
      regionRef: sel?.region?.id || '',
      countryRef: sel?.country?.id || '',
      poBox: false,
      notes: sel?.comment || '',
      employeeDocument: sel?.employeeDocumentId || ''
    }
  } as any
}

export const buildDeletePayload = (params: {
  employeeId: string
  employeeDocument?: UploadedEmployeeDocument | null
  lines: string[]
  postalCode?: string
  city?: string
  regionId?: string | null
  countryId?: string | null
  comment?: string
  selected: any
}) => {
  const sel = params.selected || {}
  return {
    event: 'pse_submit',
    employeeDocumentObject: buildEmployeeDocumentObject(params.employeeDocument),
    address: {
      id: sel?.id,
      version: sel?.version,
      employeeId: params.employeeId,
      type: sel?.type || '',
      addressLine: params.lines || '',
      ...buildCommonAddressFields(params)
    },
    changeMode: 'DELETE',
    oldAddressData: {
      id: sel?.id,
      version: sel?.version,
      employeeId: params.employeeId,
      type: sel?.type || '',
      addressLine: sel?.addressLine || '',
      postalCode: sel?.postalCode || '',
      locality: sel?.locality || '',
      regionRef: sel?.region?.id || '',
      countryRef: sel?.country?.id || '',
      poBox: false,
      notes: sel?.comment || '',
      employeeDocument: sel?.employeeDocumentId || ''
    }
  } as any
}
