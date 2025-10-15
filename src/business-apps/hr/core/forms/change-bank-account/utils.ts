export const buildBankAccountPayload = (params: {
  values: any
  existingAccount: any | null
  employeeId: string
}): any => {
  const { values, existingAccount, employeeId } = params
  const hasExisting = Boolean(existingAccount)
  return hasExisting
    ? {
        event: 'pse_submit',
        employeeId,
        bankAccount: {
          id: existingAccount?.id,
          version: existingAccount?.version,
          employeeId,
          countryRef: values.countryId || '',
          currencyRef: values.currencyId || '',
          bankName: values.bankName || '',
          accountHolder: values.accountHolder || '',
          employeeAddress: values.countryId === 'Country:v1:US' ? values.employeeAddressId || null : null,
          routingNumberType: values.routingNumberTypeId || '',
          routingNumber: values.routingNumber || '',
          accountType: values.accountType || '',
          accountNumber: values.accountNumber || '',
          iban: values.iban || '',
          swift: values.swift || '',
          notes: values.comment || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: ''
        }
      }
    : {
        event: 'pse_submit',
        employeeId,
        bankAccount: {
          employeeId,
          countryRef: values.countryId || '',
          currencyRef: values.currencyId || '',
          bankName: values.bankName || '',
          accountHolder: values.accountHolder || '',
          employeeAddress: values.countryId === 'Country:v1:US' ? values.employeeAddressId || null : null,
          routingNumberType: values.routingNumberTypeId || '',
          routingNumber: values.routingNumber || '',
          accountType: values.accountType || '',
          accountNumber: values.accountNumber || '',
          iban: values.iban || '',
          swift: values.swift || '',
          notes: values.comment || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: ''
        }
      }
}

export const isUnchangedExistingBankAccount = (form: any, existingAccount: any | null): boolean => {
  if (!existingAccount) return false
  try {
    const v = form.getValues() as any
    const normalize = (x: any) => ({
      countryId: x?.countryId || null,
      currencyId: x?.currencyId || null,
      bankName: String(x?.bankName || ''),
      accountType: String(x?.accountType || ''),
      accountHolder: String(x?.accountHolder || ''),
      iban: String(x?.iban || ''),
      swift: String(x?.swift || ''),
      routingNumberTypeId: x?.routingNumberTypeId || null,
      accountNumber: String(x?.accountNumber || ''),
      routingNumber: String(x?.routingNumber || ''),
      employeeAddressId: x?.employeeAddressId || null,
      comment: String(x?.comment || '')
    })
    const normalizeAcc = (a: any) => ({
      countryId: a?.country?.id || null,
      currencyId: a?.currency?.id || null,
      bankName: String(a?.bankName || ''),
      accountType: String(a?.accountType || ''),
      accountHolder: String(a?.accountHolder || ''),
      iban: String(a?.iban || ''),
      swift: String(a?.swift || ''),
      routingNumberTypeId: a?.routingNumberType || null,
      accountNumber: String(a?.accountNumber || ''),
      routingNumber: String(a?.routingNumber || ''),
      employeeAddressId: a?.employeeAddressId || null,
      comment: String(a?.notes || '')
    })
    const current = normalize(v)
    const existing = normalizeAcc(existingAccount)
    return JSON.stringify(current) === JSON.stringify(existing)
  } catch {
    return false
  }
}
