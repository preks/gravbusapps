export interface ImportedContact {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  contactType?: string;
  linkedinUrl?: string;
  xingUrl?: string;
  bio?: string;
  companyName?: string;
  // Validation status
  isValid: boolean;
  errors: string[];
}

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; contact: ImportedContact; error: string }>;
}

export interface ImportProgress {
  status: 'idle' | 'parsing' | 'validating' | 'uploading' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

