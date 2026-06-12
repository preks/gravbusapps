import type {
  EnterprisePresentationMode,
  TodoItem,
  ActionSummary,
  WorkspaceDocument,
  SessionAttachment,
  MessageAttachmentRef,
  EntityReference
} from '../../../types/enterpriseAgent'

export interface FinalAnswerArtifact {
  name: string
  path: string
  mime_type: string
  size: number
  rendererType: string
}

export interface FinalAnswerRendererProps {
  output: string
  todos?: TodoItem[]
  actionsPerformed?: ActionSummary[]
  durationMs?: number
  artifacts?: FinalAnswerArtifact[]
  workspaceDocuments?: WorkspaceDocument[]
  sessionAttachments?: Array<SessionAttachment | MessageAttachmentRef>
  references?: EntityReference[]
  isInstant?: boolean
  sessionId?: string
  accessToken?: string
  onViewArtifact?: (artifactName: string) => void
  presentationMode?: EnterprisePresentationMode
}
