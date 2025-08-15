export interface SalesTaskFormValues {
  // Core task details
  title: string;
  taskTypeRef: string;
  priorityRef: string;
  statusRef: string;
  timingType?: 'DEADLINE' | 'SCHEDULED';
  deadline: string | null;
  description: string;
  assignedEmployeeId: string;
  
  // Related entity selection
  relatedEntityId: string;
  relatedEntityType: string;
  
  // File upload
  files: any[];
  
  // System fields
  id?: string;
  version?: number;
}

export interface SelectOption {
  id: string | number;
  value: string;
  label: string;
  name?: string;
  extraInfo?: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    picture?: string | null;
    pictureThumbnail?: string | null;
    jobPosition?: string;
    organizationalUnit?: string;
    userId?: string | null;
  };
}

export interface EntityOption {
  id: string;
  name: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity';
  subtitle?: string;
}

export interface SalesTaskContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Form mode
  isUpdateMode: boolean;
  
  // Data collections
  taskTypes: SelectOption[];
  priorities: SelectOption[];
  statuses: SelectOption[];
  employees: SelectOption[];
  entities: EntityOption[];
  
  // Selected entity
  selectedEntity: EntityOption | null;
  
  // File management
  fileList: any[];
  
  // Entity visibility
  showEntitySearch: boolean;
}

export interface SalesTaskSubmissionPayload {
  employeeId?: string;
  managerId?: string;
  structureId?: string;
  locationId?: string;
  organizationalUnitId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
  changeMode: 'INSERT' | 'UPDATE';
  salesTask: {
    id?: string;
    version: number;
    typeRef: string;
    name: string;
    priorityRef: string;
    statusRef: string;
    dueDate: string | null;
    description: string;
    assignedEmployee?: string;
    lead?: string;
    contact?: string;
    account?: string;
    opportunity?: string;
  };
} 