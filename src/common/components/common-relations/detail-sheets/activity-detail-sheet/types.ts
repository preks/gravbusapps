import { FileInfo } from '@/common/types/FileTypes'

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
    pictureThumbnail?: string | null
  }
  accountId?: string
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string | null
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
  investment?: {
    id?: string
    name?: string
    pictureThumbnail?: string | null
  }
  investmentId?: string | null
  documents?: ActivityDocument[]
}

export interface ActivityDocument {
  id: string
  name: string
  mimeType?: string | null
  fileSize?: number | null
  fileInfo?: FileInfo
  description?: string
}

export interface ActivityReference {
  type: 'account' | 'contact' | 'lead' | 'opportunity' | 'investment'
  id: string
  name: string
}
