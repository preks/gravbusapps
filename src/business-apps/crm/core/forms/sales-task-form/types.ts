export interface SalesTaskFormValues {
  // Core task details
  title: string
  code?: string
  taskTypeRef: string
  priorityRef: string
  statusRef: string
  timingType?: 'DEADLINE' | 'SCHEDULED'
  deadline: string | null
  templateStartDate?: string | null
  startDate?: string | null
  endDate?: string | null
  description: string
  assignedEmployeeId: string
  creatorEmployeeId?: string
  creatorUserId?: string

  // Related entity selection
  relatedEntityId: string
  relatedEntityType: string

  // File upload (legacy - kept for compatibility)
  files: any[]

  // Document management
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)

  // System fields
  id?: string
  version?: number
  additionalProperties?: any
}

export interface SelectOption {
  id: string | number
  value: string
  label: string
  name?: string
  extraInfo?: {
    displayName?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    picture?: string | null
    pictureThumbnail?: string | null
    jobPosition?: string
    organizationalUnit?: string
    userId?: string | null
  }
}

export interface EntityOption {
  id: string
  name: string
  type: 'lead' | 'contact' | 'account' | 'opportunity'
  subtitle?: string
}

export interface SalesTaskContextState {
  // Loading states
  isLoading: boolean
  error: string | null

  // Form mode
  isUpdateMode: boolean

  // Data collections
  taskTypes: SelectOption[]
  priorities: SelectOption[]
  statuses: SelectOption[]
  employees: SelectOption[]
  entities: EntityOption[]

  // Selected entity
  selectedEntity: EntityOption | null

  // File management
  fileList: any[]

  // Entity visibility
  showEntitySearch: boolean
}

export interface SalesTaskSubmissionPayload {
  employeeId?: string
  managerId?: string
  structureId?: string
  locationId?: string
  organizationalUnitId?: string
  contactId?: string
  leadId?: string
  opportunityId?: string
  accountId?: string
  changeMode: 'INSERT' | 'UPDATE'
  salesTask: {
    id?: string
    version: number
    typeRef: string
    name: string
    priorityRef: string
    statusRef: string
    dueDate: string | null
    description: string
    assignedEmployee?: string
    creatorEmployeeId?: string
    creatorUserId?: string
    lead?: string
    contact?: string
    account?: string
    opportunity?: string
    // Documents - array of document objects
    // For existing documents: include id and version
    // For new documents: include name and fileInfo (full JSON response from file server)
    documents?: Array<{
      id?: string // Present for existing documents
      version?: number // Present for existing documents
      name?: string // Present for new documents
      fileInfo?: any // Full fileInfo JSON from file upload (for new documents)
    }>
  }
}
