type TranslateFn = (key: string) => string

interface FormContextErrorInput {
  error?: string | null
  employeeId?: string | null
  accessToken?: string | null
}

export function getFormContextErrorMessage(context: FormContextErrorInput, t: TranslateFn): string | null {
  const { error, employeeId, accessToken } = context

  if (!employeeId) return t('form-error-missing-employee-context')
  if (!accessToken) return t('form-error-missing-access-token')
  if (!error) return null
  if (error === 'Missing employeeId') return t('form-error-missing-employee-context')
  if (error === 'Missing accessToken') return t('form-error-missing-access-token')
  return error
}
