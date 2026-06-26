export interface ContactValidationError {
  field: string;
  message: string;
}

export const validateContactRow = (
  contact: Record<string, string>,
  rowNumber: number
): ContactValidationError[] => {
  const errors: ContactValidationError[] = [];

  // Required field validation
  if (!contact.firstName && !contact.lastName) {
    errors.push({
      field: 'name',
      message: `Row ${rowNumber}: At least firstName or lastName is required`
    });
  }

  // Email validation
  if (!contact.email) {
    errors.push({
      field: 'email',
      message: `Row ${rowNumber}: Email is required`
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push({
      field: 'email',
      message: `Row ${rowNumber}: Invalid email format`
    });
  }

  // Phone validation (optional but format check if provided)
  if (contact.phone && !/^[\d\s\+\-\(\)]+$/.test(contact.phone)) {
    errors.push({
      field: 'phone',
      message: `Row ${rowNumber}: Invalid phone format`
    });
  }

  return errors;
};

