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
        },
        oldBankAccount: {
          id: existingAccount?.id,
          version: existingAccount?.version,
          employeeId,
          countryRef: existingAccount?.country?.id || '',
          currencyRef: existingAccount?.currency?.id || '',
          bankName: existingAccount?.bankName || '',
          accountHolder: existingAccount?.accountHolder || '',
          employeeAddress: existingAccount?.employeeAddressId || null,
          routingNumberType: existingAccount?.routingNumberType || '',
          routingNumber: existingAccount?.routingNumber || '',
          accountType: existingAccount?.accountType || '',
          accountNumber: existingAccount?.accountNumber || '',
          iban: existingAccount?.iban || '',
          swift: existingAccount?.swift || '',
          notes: existingAccount?.notes || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: existingAccount?.accountNumberType || ''
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
        },
        oldBankAccount: {}
      }
}

export const isUnchangedExistingBankAccount = (form: any, initialFormValues: any | null, isUS: boolean): boolean => {
  if (!initialFormValues) return false
  try {
    const v = form.getValues() as any
    const normalizeBase = (x: any) => ({
      countryId: x?.countryId || null,
      currencyId: x?.currencyId || null,
      bankName: String(x?.bankName || ''),
      accountType: String(x?.accountType || ''),
      accountHolder: String(x?.accountHolder || ''),
      comment: String(x?.comment || '')
    })
    const current = isUS
      ? {
          ...normalizeBase(v),
          routingNumberTypeId: v?.routingNumberTypeId || null,
          accountNumber: String(v?.accountNumber || ''),
          routingNumber: String(v?.routingNumber || ''),
          employeeAddressId: v?.employeeAddressId || null
        }
      : {
          ...normalizeBase(v),
          iban: String(v?.iban || ''),
          swift: String(v?.swift || '')
        }
    const initial = isUS
      ? {
          ...normalizeBase(initialFormValues),
          routingNumberTypeId: initialFormValues?.routingNumberTypeId || null,
          accountNumber: String(initialFormValues?.accountNumber || ''),
          routingNumber: String(initialFormValues?.routingNumber || ''),
          employeeAddressId: initialFormValues?.employeeAddressId || null
        }
      : {
          ...normalizeBase(initialFormValues),
          iban: String(initialFormValues?.iban || ''),
          swift: String(initialFormValues?.swift || '')
        }
    return JSON.stringify(current) === JSON.stringify(initial)
  } catch {
    return false
  }
}
