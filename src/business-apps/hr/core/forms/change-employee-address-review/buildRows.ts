import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ReviewRow } from '../components/ReviewRows'

const countryCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')
const regionCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')

const getPostalLabel = (countryRef?: string) =>
  countryCode(countryRef) === 'US'
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.zip_code',
        'ZIP Code'
      )
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.postal_code',
        'Postal Code'
      )

const getRegionLabel = (countryRef?: string) => {
  const cc = countryCode(countryRef)
  if (cc === 'DE') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.region',
      'Region'
    )
  }
  if (cc === 'US') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.state',
      'State'
    )
  }
  if (cc === 'RO') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.county',
      'County'
    )
  }
  return getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.address_container.region',
    'Region'
  )
}

export function buildAddressReviewRows(params: {
  oldAddr: any
  newAddr: any
  catalogMap: Record<string, any>
  docNameMap: Record<string, string>
}): ReviewRow[] {
  const { oldAddr, newAddr, catalogMap, docNameMap } = params
  const rows: ReviewRow[] = []

  // Address lines (show only if present in either old or new)
  const lineLabelBase = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_profile.details_layout.address_container.address_line',
    'Address Line'
  )
  for (let i = 0; i < 4; i++) {
    const oldVal = String((oldAddr.addressLine || [])[i] || '').trim()
    const newVal = String((newAddr.addressLine || [])[i] || '').trim()
    if (i === 0 || oldVal !== '' || newVal !== '') {
      rows.push({
        key: `addressLine${i + 1}`,
        label: `${lineLabelBase} ${i + 1}`,
        oldValue: oldVal,
        newValue: newVal
      })
    }
  }

  // Postal code – always show, with side-specific labels (US => ZIP Code)
  rows.push({
    key: 'postalCode',
    oldLabel: getPostalLabel(oldAddr?.countryRef),
    newLabel: getPostalLabel(newAddr?.countryRef),
    oldValue: String(oldAddr.postalCode || ''),
    newValue: String(newAddr.postalCode || '')
  })

  // City – always
  rows.push({
    key: 'locality',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.details_layout.address_container.city', 'City'),
    oldValue: String(oldAddr.locality || ''),
    newValue: String(newAddr.locality || '')
  })

  // Region – show if either side requires it (DE / US / RO), with side-specific labels
  const oldCC = countryCode(oldAddr?.countryRef)
  const newCC = countryCode(newAddr?.countryRef)
  const sideNeedsRegion = (cc?: string) => cc === 'DE' || cc === 'US' || cc === 'RO'
  if (sideNeedsRegion(oldCC) || sideNeedsRegion(newCC)) {
    const oldRegionDisplay = getCatalogValue(catalogMap[String(oldAddr.regionRef)]) || regionCode(oldAddr.regionRef)
    const newRegionDisplay = getCatalogValue(catalogMap[String(newAddr.regionRef)]) || regionCode(newAddr.regionRef)
    rows.push({
      key: 'regionRef',
      oldLabel: getRegionLabel(oldAddr?.countryRef),
      newLabel: getRegionLabel(newAddr?.countryRef),
      oldValue: String(oldRegionDisplay || ''),
      newValue: String(newRegionDisplay || '')
    })
  }

  // Country – always (use translated value if available)
  rows.push({
    key: 'countryRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.address_container.country',
      'Country'
    ),
    oldValue: getCatalogValue(catalogMap[String(oldAddr.countryRef)]) || countryCode(oldAddr.countryRef),
    newValue: getCatalogValue(catalogMap[String(newAddr.countryRef)]) || countryCode(newAddr.countryRef)
  })

  // PO Box – show only if present/true in either side
  const oldPo = Boolean(oldAddr.poBox || false)
  const newPo = Boolean(newAddr.poBox || false)
  if (oldPo || newPo) {
    rows.push({
      key: 'poBox',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.address_container.po_box',
        'PO Box'
      ),
      oldValue: String(oldPo),
      newValue: String(newPo)
    })
  }

  // Comment – show only if present in either side
  const oldNotes = String(oldAddr.notes || '').trim()
  const newNotes = String(newAddr.notes || '').trim()
  if (oldNotes !== '' || newNotes !== '') {
    rows.push({
      key: 'notes',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
        'Comment'
      ),
      oldValue: oldNotes,
      newValue: newNotes
    })
  }

  // Attachment – when present on either side
  const oldDoc = String((oldAddr as any)?.employeeDocument ?? '').trim()
  const newDoc = String((newAddr as any)?.employeeDocument ?? '').trim()
  if (oldDoc !== '' || newDoc !== '') {
    const oldDisplay =
      docNameMap[oldDoc] ||
      (oldDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_attachment_text', 'Old Attachment') : '')
    const newDisplay =
      docNameMap[newDoc] ||
      (newDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_attachment_text', 'New Attachment') : '')
    rows.push({
      key: 'employeeDocument',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.attachment_text', 'Attachment'),
      oldValue: oldDisplay,
      newValue: newDisplay
    })
  }

  return rows
}
