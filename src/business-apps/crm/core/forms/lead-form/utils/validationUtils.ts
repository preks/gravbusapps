export const toStringOrUndefined = (val: unknown): string | undefined =>
  typeof val === 'string' && val.length > 0 ? val : undefined

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, 123 456 7890, etc.
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

// Salutation options for lead forms
export const salutationOptions = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Mrs.', label: 'Mrs.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Prof.', label: 'Prof.' }
] as const
