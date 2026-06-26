export interface CsvParseResult {
  data: Array<Record<string, string>>;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
}

export const parseCsv = (csvText: string): CsvParseResult => {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { data: [], errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }], warnings: [] };
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse data rows
  const data: Array<Record<string, string>> = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }

  return { data, errors, warnings: [] };
};

export const validateCsvHeaders = (headers: string[]): string[] => {
  const requiredHeaders = ['firstName', 'lastName', 'email'];
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  return missing;
};

