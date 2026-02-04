/**
 * Session Management Types
 *
 * Defines the structure for AI Builder sessions including user info,
 * target path, and metadata for tracking project progress.
 */

export interface SessionUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  pictureThumbnail?: string
  consentToStorePii?: boolean
}

export interface SessionMetadata {
  sessionId: string
  repoId?: string | null
  targetPath: string | null
  resourceUrl: string | null
  createdAt: string
  lastModified: string
  fileCount: number
  createdBy: SessionUser
  description?: string
}

export interface SessionListView {
  sessions: SessionMetadata[]
  currentSessionId: string | null
}
