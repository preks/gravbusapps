import { useCallback } from 'react';

export const useContactCsvTemplate = () => {
  const downloadTemplate = useCallback(() => {
    // Define CSV template with all supported fields
    const headers = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'jobTitle',
      'department',
      'contactType',
      'linkedinUrl',
      'xingUrl',
      'bio',
      'companyName'
    ];

    // Create example row
    const exampleRow = [
      'John',
      'Doe',
      'john.doe@example.com',
      '+49 123 456789',
      'Sales Manager',
      'Sales',
      'CUSTOMER',
      'https://linkedin.com/in/johndoe',
      'https://xing.com/profile/johndoe',
      'Experienced sales professional',
      'ACME Corp'
    ];

    // Generate CSV content
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contact_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadTemplate };
};

