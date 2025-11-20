import { getCatalogValue, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import type { ReviewRow } from '../components/ReviewRows'

const dash = (v?: string) => (String(v || '').trim() === '' ? '' : String(v || ''))
const formatCatalog = (catalogMap: Record<string, any>, ref?: string) =>
  ref ? getCatalogValue(catalogMap[String(ref)]) || '' : ''

const formatTitles = (catalogMap: Record<string, any>, refs?: any) => {
  const list: string[] = Array.isArray(refs) ? refs.map((r: any) => String(r)) : refs ? [String(refs)] : []
  const names = list.map(id => getCatalogValue(catalogMap[id]) || '').filter(s => s && s.trim() !== '')
  return names.join(', ')
}

export function buildPersonalDataRows(params: {
  oldPI: any
  newPI: any
  catalogMap: Record<string, any>
  docNameMap: Record<string, string>
}): ReviewRow[] {
  const { oldPI, newPI, catalogMap, docNameMap } = params
  const rows: ReviewRow[] = []

  // Salutation
  rows.push({
    key: 'salutationRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.salutation',
      'Salutation'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.salutationRef),
    newValue: formatCatalog(catalogMap, newPI.salutationRef)
  })

  // Title
  rows.push({
    key: 'title',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.title',
      'Title'
    ),
    oldValue: dash(oldPI.title),
    newValue: dash(newPI.title)
  })

  // First Name
  rows.push({
    key: 'firstName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.first_name',
      'First Name'
    ),
    oldValue: dash(oldPI.firstName),
    newValue: dash(newPI.firstName)
  })

  // Preferred Name
  rows.push({
    key: 'preferredName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.summary_layout.public_profile_container.display_name',
      'Preferred Name'
    ),
    oldValue: dash(oldPI.preferredName),
    newValue: dash(newPI.preferredName)
  })

  // Last Name
  rows.push({
    key: 'lastName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.last_name',
      'Last Name'
    ),
    oldValue: dash(oldPI.lastName),
    newValue: dash(newPI.lastName)
  })

  // Display Name
  rows.push({
    key: 'displayName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.preferred_name',
      'Display Name'
    ),
    oldValue: dash(oldPI.displayName),
    newValue: dash(newPI.displayName)
  })

  // Birth Name
  rows.push({
    key: 'birthName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.birth_mame',
      'Birth Name'
    ),
    oldValue: dash(oldPI.birthName),
    newValue: dash(newPI.birthName)
  })

  // Birth Date
  rows.push({
    key: 'birthDate',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.date_of_birth',
      'Date of Birth'
    ),
    oldValue: formatDate(dash(oldPI.birthDate), 'date.short') || '-',
    newValue: formatDate(dash(newPI.birthDate), 'date.short') || '-'
  })

  // Birth Place
  rows.push({
    key: 'birthPlace',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.place_of_birth',
      'Place of Birth'
    ),
    oldValue: dash(oldPI.birthPlace),
    newValue: dash(newPI.birthPlace)
  })

  // Gender
  rows.push({
    key: 'genderRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.gender',
      'Gender'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.genderRef),
    newValue: formatCatalog(catalogMap, newPI.genderRef)
  })

  // Nationality
  rows.push({
    key: 'nationalityRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.nationality',
      'Nationality'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.nationalityRef),
    newValue: formatCatalog(catalogMap, newPI.nationalityRef)
  })

  // Native Language
  rows.push({
    key: 'languageRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.language',
      'Native Language'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.languageRef),
    newValue: formatCatalog(catalogMap, newPI.languageRef)
  })

  // Marital Status
  rows.push({
    key: 'maritalStatusRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.marital_status',
      'Marital Status'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.maritalStatusRef),
    newValue: formatCatalog(catalogMap, newPI.maritalStatusRef)
  })

  // Degree of Disability
  rows.push({
    key: 'severelyDisabilityDegree',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.disability',
      'Degree of Disability'
    ),
    oldValue: dash(oldPI.severelyDisabilityDegree),
    newValue: dash(newPI.severelyDisabilityDegree)
  })

  // Highest School Qualification
  rows.push({
    key: 'schoolQualificationRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.qualification',
      'Highest School Qualification'
    ),
    oldValue: formatCatalog(catalogMap, oldPI.schoolQualificationRef),
    newValue: formatCatalog(catalogMap, newPI.schoolQualificationRef)
  })

  // Academic Titles (multi)
  rows.push({
    key: 'academicTitleRefs',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.personal_information_container.academic_titles',
      'Academic Titles'
    ),
    oldValue: formatTitles(catalogMap, oldPI.academicTitleRef),
    newValue: formatTitles(catalogMap, newPI.academicTitleRef)
  })

  // Comment
  {
    const oldNotes = String(oldPI?.notes || '').trim()
    const newNotes = String(newPI?.notes || '').trim()
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
  }

  // Attachment (personalDocument)
  {
    const oldDoc = String((oldPI as any)?.personalDocument ?? '').trim()
    const newDoc = String((newPI as any)?.personalDocument ?? '').trim()
    if (oldDoc !== '' || newDoc !== '') {
      const oldDisplay =
        docNameMap[oldDoc] ||
        (oldDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.old_attachment_text', 'Old Attachment') : '')
      const newDisplay =
        docNameMap[newDoc] ||
        (newDoc ? getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.new_attachment_text', 'New Attachment') : '')
      rows.push({
        key: 'personalDocument',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.attachment_text', 'Attachment'),
        oldValue: oldDisplay,
        newValue: newDisplay
      })
    }
  }

  return rows
}
