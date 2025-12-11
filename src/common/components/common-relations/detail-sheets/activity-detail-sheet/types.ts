/**
 * Types for Activity Detail Sheet
 */

import { FileInfo } from '@/common/types/FileTypes'

export interface ActivityDocument {
  id: string
  name?: string | null
  mimeType?: string | null
  fileInfo?: FileInfo | null
  description?: string | null
}

export interface ActivityEmployee {
  id?: string
  fullName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string | null
}

export interface ActivityReference {
  entityName?: string
  entityType?: string
}

export interface Activity {
  id: string
  title: string
  description?: string | null
  activityType?: { value: string } | null
  occurredAt?: string | null
  createdAt: string
  ownerEmployee?: ActivityEmployee | null
  ownerEmployeeId?: string | null
  // Entity references
  account?: { id?: string; name?: string } | null
  accountId?: string | null
  contact?: { id?: string; firstName?: string; lastName?: string } | null
  contactId?: string | null
  lead?: { id?: string; name?: string; contact?: { firstName?: string; lastName?: string } } | null
  leadId?: string | null
  opportunity?: { id?: string; name?: string } | null
  opportunityId?: string | null
  // Documents
  documents?: ActivityDocument[]
}
