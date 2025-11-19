import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ReviewRow } from '../components/ReviewRows'

const countryCode = (ref?: string) => (typeof ref === 'string' ? ref.split(':').pop() || '' : '')

const typeToLabel = (v?: string) =>
  v === 'CHECKINGS'
    ? getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_checkings_value',
        'Checkings'
      )
    : v === 'SAVINGS'
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_savings_value',
          'Savings'
        )
      : String(v || '')

export function buildBankAccountRows(params: {
  oldAcc: any
  newAcc: any
  catalogMap: Record<string, any>
  addressTypeMap: Record<string, string>
}): ReviewRow[] {
  const { oldAcc, newAcc, catalogMap, addressTypeMap } = params
  const rows: ReviewRow[] = []

  // Country
  rows.push({
    key: 'countryRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.country_select_label',
      'Country'
    ),
    oldValue: getCatalogValue(catalogMap[String(oldAcc.countryRef)]) || countryCode(oldAcc.countryRef),
    newValue: getCatalogValue(catalogMap[String(newAcc.countryRef)]) || countryCode(newAcc.countryRef)
  })

  // Currency
  rows.push({
    key: 'currencyRef',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.currency_select_label',
      'Currency'
    ),
    oldValue:
      (catalogMap[String(oldAcc.currencyRef)]?.code as string) ||
      getCatalogValue(catalogMap[String(oldAcc.currencyRef)]) ||
      '',
    newValue:
      (catalogMap[String(newAcc.currencyRef)]?.code as string) ||
      getCatalogValue(catalogMap[String(newAcc.currencyRef)]) ||
      ''
  })

  // Bank Name
  rows.push({
    key: 'bankName',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.bank_name_select_label',
      'Bank Name'
    ),
    oldValue: String(oldAcc.bankName || ''),
    newValue: String(newAcc.bankName || '')
  })

  // Account Type
  rows.push({
    key: 'accountType',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.account_type_select_label',
      'Account Type'
    ),
    oldValue: typeToLabel(String(oldAcc.accountType || '')),
    newValue: typeToLabel(String(newAcc.accountType || ''))
  })

  // Account Holder
  rows.push({
    key: 'accountHolder',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.details_layout.bank_account_form.account_holder_select_label',
      'Account Holder'
    ),
    oldValue: String(oldAcc.accountHolder || ''),
    newValue: String(newAcc.accountHolder || '')
  })

  // US vs Non-US
  const oldCC = countryCode(oldAcc?.countryRef)
  const newCC = countryCode(newAcc?.countryRef)
  const isUS = (cc?: string) => cc === 'US'

  if (isUS(oldCC) || isUS(newCC)) {
    rows.push({
      key: 'routingNumberType',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label',
        'Routing Number Type'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_type_select_label',
        'Routing Number Type'
      ),
      oldValue: getCatalogValue(catalogMap[String(oldAcc.routingNumberType)]) || '',
      newValue: getCatalogValue(catalogMap[String(newAcc.routingNumberType)]) || ''
    })

    rows.push({
      key: 'accountNumber',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label',
        'Account Number'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.account_number_select_label',
        'Account Number'
      ),
      oldValue: String(oldAcc.accountNumber || ''),
      newValue: String(newAcc.accountNumber || '')
    })

    rows.push({
      key: 'routingNumber',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label',
        'Routing Number'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.routing_number_select_label',
        'Routing Number'
      ),
      oldValue: String(oldAcc.routingNumber || ''),
      newValue: String(newAcc.routingNumber || '')
    })

    const formatAddressType = (t?: string) => {
      const up = String(t || '').toUpperCase()
      if (up === 'PRIMARY') {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.type_primary',
          'Primary'
        )
      }
      if (up === 'SECONDARY') {
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.details_layout.address_container.type_secondary',
          'Secondary'
        )
      }
      return ''
    }

    rows.push({
      key: 'employeeAddress',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.address_select_label',
        'Address'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.address_select_label',
        'Address'
      ),
      oldValue: formatAddressType(addressTypeMap[String((oldAcc as any)?.employeeAddress || '')]) || '',
      newValue: formatAddressType(addressTypeMap[String((newAcc as any)?.employeeAddress || '')]) || ''
    })
  }

  // Non‑US fields: IBAN, Swift
  if (!isUS(oldCC) || !isUS(newCC)) {
    rows.push({
      key: 'iban',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label',
        'IBAN'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.iban_select_label',
        'IBAN'
      ),
      oldValue: String(oldAcc.iban || ''),
      newValue: String(newAcc.iban || '')
    })

    rows.push({
      key: 'swift',
      oldLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.swift_select_label',
        'Swift'
      ),
      newLabel: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.details_layout.bank_account_form.swift_select_label',
        'Swift'
      ),
      oldValue: String(oldAcc.swift || ''),
      newValue: String(newAcc.swift || '')
    })
  }

  // Comment – show only if present in either side
  const oldNotes = String(oldAcc.notes || '').trim()
  const newNotes = String(newAcc.notes || '').trim()
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

  return rows
}
