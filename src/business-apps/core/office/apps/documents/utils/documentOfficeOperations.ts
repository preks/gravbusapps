import type { OfficeClient } from '@/common/network/office/OfficeClient'
import type {
  Comment,
  Document,
  DocumentApprovalRequest,
  DocumentShare,
  DocumentStatus,
  DocumentSummary,
  DocumentTemplate,
  FileLock,
  PublishMetadata,
  TemplateCategory,
  TemplateSummary,
  Version
} from '../types'
import type {
  CommentQueryOptions,
  CreateCommentInput,
  LockFileInput
} from '@/business-apps/platform/apps/shared/types/versioning'
import { sanitizeDocumentHtmlForEditor } from './documentContentUtils'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type RecordData = Record<string, unknown>

function sanitizeDocumentHtml(html: string): string {
  return sanitizeDocumentHtmlForEditor(html || '')
}

function getApprovalStatusFromMetadata(doc: RecordData): DocumentSummary['approvalStatus'] {
  const settings = (doc.settings as RecordData | undefined) ?? {}
  const approvalMetadata = (settings.approvalMetadata as RecordData | undefined) ?? {}

  if (approvalMetadata.hasOpenApproval) {
    return 'pending'
  }

  if (approvalMetadata.currentApprovedVersion) {
    return 'approved'
  }

  return undefined
}

export function mapApiDocumentToDocument(apiDoc: RecordData): Document {
  const permission = apiDoc.permission as Document['permission']

  const sourceFileInfo = apiDoc.sourceFileInfo as RecordData | undefined
  const sourceFile = sourceFileInfo
    ? {
        originalName: sourceFileInfo.originalName as string,
        fileSize: sourceFileInfo.fileSize as number,
        mimeType: sourceFileInfo.mimeType as string,
        uploadedAt: sourceFileInfo.uploadedAt as string,
        path: sourceFileInfo.path as string | undefined,
        fileId: sourceFileInfo.fileId as string | undefined,
        accessScope: sourceFileInfo.accessScope as string | undefined,
        appName: sourceFileInfo.appName as string | undefined,
        folderPath: sourceFileInfo.folderPath as string | undefined,
        pageCount: sourceFileInfo.pageCount as number | undefined
      }
    : undefined

  return {
    id: apiDoc.id as string,
    title: apiDoc.title as string,
    description: apiDoc.description as string | undefined,
    content: sanitizeDocumentHtml((apiDoc.content as string) || ''),
    status: apiDoc.status as DocumentStatus,
    category: apiDoc.category as string | undefined,
    tags: apiDoc.tags as string[] | undefined,
    createdAt: apiDoc.createdAt as string,
    updatedAt: apiDoc.updatedAt as string,
    createdBy: apiDoc.ownerId as string,
    spaceId: (apiDoc.spaceId as string | null | undefined) ?? null,
    trashedAt: (apiDoc.trashedAt as string | null | undefined) ?? null,
    version: (apiDoc.currentVersion as number) || 1,
    versionHistory: [],
    formatting: apiDoc.formatting as Document['formatting'],
    sharedWith: [],
    approvalRequest: apiDoc.approvalRequest as DocumentApprovalRequest | undefined,
    permission,
    isShared: apiDoc.isShared as boolean | undefined,
    sharedBy: apiDoc.sharedBy as string | undefined,
    sourceFile,
    settings: apiDoc.settings as Document['settings']
  }
}

export function mapApiDocToSummary(doc: RecordData): DocumentSummary {
  const sourceFileInfo = doc.sourceFileInfo as RecordData | undefined
  const sourceFile = sourceFileInfo
    ? {
        originalName: sourceFileInfo.originalName as string,
        fileSize: sourceFileInfo.fileSize as number,
        mimeType: sourceFileInfo.mimeType as string,
        uploadedAt: sourceFileInfo.uploadedAt as string,
        path: sourceFileInfo.path as string | undefined,
        fileId: sourceFileInfo.fileId as string | undefined,
        accessScope: sourceFileInfo.accessScope as string | undefined,
        appName: sourceFileInfo.appName as string | undefined,
        folderPath: sourceFileInfo.folderPath as string | undefined,
        pageCount: sourceFileInfo.pageCount as number | undefined
      }
    : undefined

  return {
    id: doc.id as string,
    title: doc.title as string,
    description: doc.description as string | undefined,
    status: doc.status as DocumentStatus,
    category: doc.category as string | undefined,
    tags: doc.tags as string[] | undefined,
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
    createdBy: doc.ownerId as string,
    spaceId: (doc.spaceId as string | null | undefined) ?? null,
    trashedAt: (doc.trashedAt as string | null | undefined) ?? null,
    wordCount: (doc.wordCount as number) || 0,
    approvalStatus: getApprovalStatusFromMetadata(doc),
    isShared: doc.isShared as boolean | undefined,
    sharedBy: doc.sharedBy as string | undefined,
    isFavorite: doc.isFavorite as boolean | undefined,
    permission: doc.permission as DocumentSummary['permission'],
    sharedCount: (doc.sharedCount as number) ?? 0,
    sharedPreviewUserIds: (doc.sharedPreviewUserIds as string[]) ?? [],
    sourceFile,
    isPdf: sourceFile?.mimeType === 'application/pdf',
    settings: doc.settings as DocumentSummary['settings']
  }
}

export function mapApiTemplateToTemplate(apiTemplate: RecordData): DocumentTemplate {
  return {
    id: apiTemplate.id as string,
    name: apiTemplate.name as string,
    description: apiTemplate.description as string | undefined,
    content: sanitizeDocumentHtml((apiTemplate.content as string) || ''),
    category: ((apiTemplate.category as TemplateCategory | undefined) ?? 'other') as TemplateCategory,
    context: apiTemplate.context as string | undefined,
    tags: (apiTemplate.tags as string[]) || [],
    createdAt: apiTemplate.createdAt as string,
    updatedAt: apiTemplate.updatedAt as string,
    createdBy: apiTemplate.ownerId as string,
    isPublic: (apiTemplate.isPublic as boolean) || false,
    usageCount: (apiTemplate.usageCount as number) || 0,
    formatting: apiTemplate.formatting as DocumentTemplate['formatting'],
    placeholders: (apiTemplate.placeholders as DocumentTemplate['placeholders']) || []
  }
}

export function mapApiTemplateToSummary(template: RecordData): TemplateSummary {
  return {
    id: template.id as string,
    name: template.name as string,
    description: template.description as string | undefined,
    category: ((template.category as TemplateCategory | undefined) ?? 'other') as TemplateCategory,
    context: template.context as string | undefined,
    tags: (template.tags as string[]) || [],
    createdAt: template.createdAt as string,
    updatedAt: template.updatedAt as string,
    createdBy: template.ownerId as string,
    isPublic: (template.isPublic as boolean) || false,
    usageCount: (template.usageCount as number) || 0
  }
}

export async function listDocumentTemplates(
  officeClient: OfficeClient,
  options?: { category?: string; includePublic?: boolean }
): Promise<TemplateSummary[]> {
  const params = new URLSearchParams()
  if (options?.category) params.set('category', options.category)
  if (options?.includePublic !== undefined) params.set('includePublic', options.includePublic.toString())
  const response = await officeClient.documents.listTemplates<PaginatedResponse<RecordData>>(
    params.toString() || undefined
  )
  return response.items.map(mapApiTemplateToSummary)
}

export async function getDocumentTemplate(officeClient: OfficeClient, id: string): Promise<DocumentTemplate | null> {
  try {
    const template = await officeClient.documents.getTemplate<RecordData>(id)
    return mapApiTemplateToTemplate(template)
  } catch {
    return null
  }
}

export async function createDocumentVersion(
  officeClient: OfficeClient,
  documentId: string,
  options: {
    content?: string
    changeDescription?: string
    isCheckpoint?: boolean
  }
): Promise<Version | null> {
  try {
    let contentSnapshot: RecordData
    if (options.content) {
      contentSnapshot = { content: options.content }
    } else {
      const document = await getDocumentById(officeClient, documentId)
      if (!document) throw new Error('Document not found')
      contentSnapshot = {
        title: document.title,
        content: document.content,
        description: document.description,
        tags: document.tags,
        category: document.category
      }
    }

    const versionData = await officeClient.documents.createVersion<RecordData>({
      entityType: 'document',
      entityId: documentId,
      contentSnapshot,
      changeSummary: options.changeDescription,
      isAutoSave: !options.isCheckpoint
    })

    return {
      id: versionData.id as string,
      version: versionData.versionNumber as number,
      content: JSON.stringify(versionData.contentSnapshot),
      createdAt: versionData.createdAt as string,
      createdBy: versionData.changedBy as string,
      changeDescription: versionData.changeSummary as string | undefined,
      isCheckpoint: !versionData.isAutoSave,
      isAutoSave: versionData.isAutoSave as boolean,
      fileSize: versionData.fileSize as number
    }
  } catch {
    return null
  }
}

export async function listDocumentVersions(officeClient: OfficeClient, documentId: string, page = 1, limit = 20) {
  try {
    const response = await officeClient.documents.getDocumentVersions<PaginatedResponse<RecordData>>(
      documentId,
      page,
      limit
    )
    return response.items.map(version => ({
      id: version.id as string,
      version: version.versionNumber as number,
      content: JSON.stringify(version.contentSnapshot || {}),
      createdAt: version.createdAt as string,
      createdBy: version.changedBy as string,
      createdByName: version.changedByName as string | undefined,
      createdByAvatar: version.changedByAvatar as string | undefined,
      changeDescription: version.changeSummary as string | undefined,
      isCheckpoint: !version.isAutoSave,
      isAutoSave: version.isAutoSave as boolean,
      fileSize: (version.fileSize as number) || 0
    }))
  } catch {
    return []
  }
}

export async function getDocumentVersion(officeClient: OfficeClient, documentId: string, versionNumber: number) {
  try {
    const versionData = await officeClient.documents.getDocumentVersion<RecordData>(documentId, versionNumber)
    const snapshot = versionData.contentSnapshot as RecordData
    if (!snapshot) return null
    return mapApiDocumentToDocument(snapshot)
  } catch {
    return null
  }
}

export async function compareDocumentVersions(
  officeClient: OfficeClient,
  documentId: string,
  versionA: number,
  versionB: number
): Promise<{
  versionA: Version
  versionB: Version
  diff: Array<{
    path: string
    type: 'added' | 'removed' | 'modified'
    oldValue?: unknown
    newValue?: unknown
  }>
} | null> {
  try {
    const response = await officeClient.documents.compareDocumentVersions<RecordData>(documentId, versionA, versionB)
    return {
      versionA: {
        id: (response.versionA as RecordData).id as string,
        version: (response.versionA as RecordData).versionNumber as number,
        content: JSON.stringify((response.versionA as RecordData).contentSnapshot),
        createdAt: (response.versionA as RecordData).createdAt as string,
        createdBy: (response.versionA as RecordData).changedBy as string,
        changeDescription: (response.versionA as RecordData).changeSummary as string | undefined,
        isCheckpoint: !(response.versionA as RecordData).isAutoSave,
        isAutoSave: (response.versionA as RecordData).isAutoSave as boolean,
        fileSize: ((response.versionA as RecordData).fileSize as number) || 0
      },
      versionB: {
        id: (response.versionB as RecordData).id as string,
        version: (response.versionB as RecordData).versionNumber as number,
        content: JSON.stringify((response.versionB as RecordData).contentSnapshot),
        createdAt: (response.versionB as RecordData).createdAt as string,
        createdBy: (response.versionB as RecordData).changedBy as string,
        changeDescription: (response.versionB as RecordData).changeSummary as string | undefined,
        isCheckpoint: !(response.versionB as RecordData).isAutoSave,
        isAutoSave: (response.versionB as RecordData).isAutoSave as boolean,
        fileSize: ((response.versionB as RecordData).fileSize as number) || 0
      },
      diff: response.diff as Array<{
        path: string
        type: 'added' | 'removed' | 'modified'
        oldValue?: unknown
        newValue?: unknown
      }>
    }
  } catch {
    return null
  }
}

export async function createDocumentComment(
  officeClient: OfficeClient,
  documentId: string,
  input: CreateCommentInput
): Promise<Comment | null> {
  try {
    const response = await officeClient.documents.createComment<RecordData>(documentId, input)
    return {
      id: response.id as string,
      entityId: documentId,
      entityType: 'document',
      type: response.type as Comment['type'],
      content: response.content as string,
      createdBy: response.createdBy as string,
      createdByName: response.createdByName as string | undefined,
      createdByAvatar: response.createdByAvatar as string | undefined,
      createdAt: response.createdAt as string,
      updatedAt: response.updatedAt as string | undefined,
      resolvedAt: response.resolvedAt as string | undefined,
      resolvedBy: response.resolvedBy as string | undefined,
      selectionStart: response.selectionStart as number | undefined,
      selectionEnd: response.selectionEnd as number | undefined,
      selectedText: response.selectedText as string | undefined,
      anchorPath: response.anchorPath as string | undefined,
      parentId: response.parentId as string | undefined
    }
  } catch {
    return null
  }
}

export async function updateDocumentComment(
  officeClient: OfficeClient,
  commentId: string,
  updates: Partial<Comment>
): Promise<Comment | null> {
  try {
    const response = await officeClient.documents.updateComment<RecordData>(commentId, { content: updates.content })
    return {
      id: response.id as string,
      entityId: response.entityId as string,
      entityType: 'document',
      type: response.type as Comment['type'],
      content: response.content as string,
      createdBy: response.createdBy as string,
      createdAt: response.createdAt as string,
      updatedAt: response.updatedAt as string | undefined
    }
  } catch {
    return null
  }
}

export async function listDocumentComments(
  officeClient: OfficeClient,
  documentId: string,
  options?: CommentQueryOptions
): Promise<Comment[]> {
  const params = new URLSearchParams()
  if (options?.includeResolved) params.set('includeResolved', 'true')
  if (options?.includeReplies) params.set('includeReplies', 'true')
  if (options?.type) params.set('type', options.type)
  try {
    const response = await officeClient.documents.getComments<RecordData[]>(documentId, params.toString() || undefined)
    return response.map(comment => ({
      id: comment.id as string,
      entityId: documentId,
      entityType: 'document',
      type: comment.type as Comment['type'],
      content: comment.content as string,
      createdBy: comment.createdBy as string,
      createdByName: comment.createdByName as string | undefined,
      createdByAvatar: comment.createdByAvatar as string | undefined,
      createdAt: comment.createdAt as string,
      updatedAt: comment.updatedAt as string | undefined,
      resolvedAt: comment.resolvedAt as string | undefined,
      resolvedBy: comment.resolvedBy as string | undefined,
      selectionStart: comment.selectionStart as number | undefined,
      selectionEnd: comment.selectionEnd as number | undefined,
      selectedText: comment.selectedText as string | undefined,
      anchorPath: comment.anchorPath as string | undefined,
      parentId: comment.parentId as string | undefined,
      replies: (comment.replies as RecordData[] | undefined)?.map(reply => ({
        id: reply.id as string,
        entityId: documentId,
        entityType: 'document' as const,
        type: reply.type as Comment['type'],
        content: reply.content as string,
        createdBy: reply.createdBy as string,
        createdByName: reply.createdByName as string | undefined,
        createdByAvatar: reply.createdByAvatar as string | undefined,
        createdAt: reply.createdAt as string,
        parentId: comment.id as string
      }))
    }))
  } catch {
    return []
  }
}

export async function replyToDocumentComment(
  officeClient: OfficeClient,
  commentId: string,
  reply: string
): Promise<Comment | null> {
  try {
    const response = await officeClient.documents.replyToComment<RecordData>(commentId, { content: reply })
    return {
      id: response.id as string,
      entityId: response.entityId as string,
      entityType: 'document',
      type: response.type as Comment['type'],
      content: response.content as string,
      createdBy: response.createdBy as string,
      createdByName: response.createdByName as string | undefined,
      createdAt: response.createdAt as string,
      parentId: response.parentId as string | undefined
    }
  } catch {
    return null
  }
}

export async function getDocumentById(
  officeClient: OfficeClient,
  id: string,
  options?: { fresh?: boolean }
): Promise<Document | null> {
  try {
    const document = await officeClient.documents.get<RecordData>(options?.fresh ? `${id}?_ts=${Date.now()}` : id)
    return mapApiDocumentToDocument(document)
  } catch {
    return null
  }
}

export async function getDocumentForOpenById(
  officeClient: OfficeClient,
  id: string,
  options?: { fresh?: boolean }
): Promise<Document | null> {
  try {
    const document = await officeClient.documents.getTrashedPreview<RecordData>(id)
    return mapApiDocumentToDocument(document)
  } catch {
    return getDocumentById(officeClient, id, options)
  }
}

export function buildDocumentLock(lockResponse: RecordData): FileLock | null {
  if (!lockResponse.isLocked) {
    return null
  }

  return {
    isLocked: lockResponse.isLocked as boolean,
    lockedBy: lockResponse.lockedBy as string | undefined,
    lockedByName: lockResponse.lockedByName as string | undefined,
    lockedByAvatar: lockResponse.lockedByAvatar as string | undefined,
    lockedAt: lockResponse.lockedAt as string | undefined,
    lockExpiry: lockResponse.lockExpiry as string | undefined,
    lockReason: lockResponse.lockReason as string | undefined
  }
}

export function buildPublishMetadata(
  response: RecordData,
  fallbackStatus?: PublishMetadata['status']
): PublishMetadata {
  return {
    status: (response.status as PublishMetadata['status']) ?? fallbackStatus ?? 'draft',
    publishedAt: response.publishedAt as string | undefined,
    publishedBy: response.publishedBy as string | undefined,
    publishVersion: response.publishVersion as number | undefined,
    publishNotes: response.publishNotes as string | undefined
  }
}

export function buildSharedUserEntries(shares: RecordData[]): Array<DocumentShare & { id: string }> {
  return shares.map(share => ({
    id: share.id as string,
    userId: share.userId as string,
    permission: share.permission as 'view' | 'edit' | 'comment' | 'admin',
    sharedAt: share.createdAt as string,
    sharedBy: share.sharedBy as string
  }))
}

export function buildDocumentApprovalRequest(
  documentId: string,
  approvals: RecordData[]
): DocumentApprovalRequest | null {
  if (approvals.length === 0) return null
  const latest = approvals[0]
  return {
    id: latest.id as string,
    documentId,
    requestedBy: latest.requestedBy as string,
    requestedAt: latest.createdAt as string,
    status: latest.status as 'pending' | 'approved' | 'rejected',
    approvers: ((latest.steps as RecordData[]) || []).map(step => ({
      userId: step.approverId as string,
      status: step.status as 'pending' | 'approved' | 'rejected',
      respondedAt: step.respondedAt as string | undefined,
      comments: step.comments as string | undefined
    })),
    message: latest.message as string | undefined,
    dueDate: latest.dueDate as string | undefined,
    versionAtRequest: latest.versionAtRequest as number | undefined,
    entityUrl: latest.entityUrl as string | undefined
  }
}

export function buildLockInput(reason?: string, durationMinutes?: number): LockFileInput {
  return {
    ...(reason ? { reason } : {}),
    ...(durationMinutes ? { durationMinutes } : {})
  }
}

export type AiEditPayload = {
  instruction: string
  llmProvider?: 'openai' | 'groq'
  documentHtml: string
  documentPlainText: string
  mode: 'selection' | 'document'
  title?: string
  selection?: {
    start?: number
    end?: number
    selectedPlainText?: string
    selectionHtml?: string
  }
}

export type AiEditResult = {
  mode: 'selection' | 'document'
  updatedHtml?: string
  replacementHtml?: string
  changeSummary: string
}
