export interface MarkAsLostFormValues {
  // Lead identification
  id: string;
  version: number;
  
  // Loss information
  lostReason: string;
  lostComments?: string;
  
  // Status update
  leadStatusRef: string;
}

export interface SelectOption {
  id: string | number;
  value: string;
  label: string;
  name: string;
}

export interface LeadData {
  id: string;
  version: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  status?: {
    value: string;
  };
}

export interface MarkAsLostContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Lead data
  leadData: LeadData | null;
  
  // Form state
  isSubmitting: boolean;
} 