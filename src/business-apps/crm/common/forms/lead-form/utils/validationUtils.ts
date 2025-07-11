export const toStringOrUndefined = (val: unknown): string | undefined => 
  (typeof val === 'string' && val.length > 0 ? val : undefined);

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, 123 456 7890, etc.
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const salutationOptions = [
  { id: 'mr', value: 'Mr.', label: 'Mr.', name: 'Mr.' },
  { id: 'mrs', value: 'Mrs.', label: 'Mrs.', name: 'Mrs.' },
  { id: 'ms', value: 'Ms.', label: 'Ms.', name: 'Ms.' },
  { id: 'dr', value: 'Dr.', label: 'Dr.', name: 'Dr.' },
  { id: 'prof', value: 'Prof.', label: 'Prof.', name: 'Prof.' },
]; 