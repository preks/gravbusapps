export interface Activity {
  id: string
  title: string
  description?: string
  createdAt: string
  occurredAt?: string
  activityType?: {
    value: string
    code?: string
  }
  creatorEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  creatorEmployeeId?: string
  ownerEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  ownerEmployeeId?: string
  account?: {
    id: string
    name: string
  }
  accountId?: string
  contact?: {
    id: string
    firstName?: string
    lastName?: string
  }
  contactId?: string
  lead?: {
    id: string
    code?: string
    firstName?: string
    lastName?: string
    companyName?: string
  }
  leadId?: string
  opportunity?: {
    id: string
    name: string
  }
  opportunityId?: string
  documents?: ActivityDocument[]
}

export interface ActivityDocument {
  id: string
  name: string
  mimeType?: string
  fileInfo?: string
  description?: string
}

export interface ActivityReference {
  type: 'account' | 'contact' | 'lead' | 'opportunity'
  id: string
  name: string
}
