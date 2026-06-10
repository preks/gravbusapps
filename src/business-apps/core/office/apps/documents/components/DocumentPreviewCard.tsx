/**
 * DocumentPreviewCard Component
 *
 * Displays a document summary in card format for the documents list.
 * Provides quick actions like open, edit, delete, share, etc.
 */

import React from 'react'
import {
  Card,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Download,
  Share2,
  Clock,
  User,
  Send,
  CheckCircle,
  XCircle,
  FileUp,
  AlertCircle,
  UserCheck,
  Users,
  Settings,
  FileType
} from 'lucide-react'
import { getShareCapabilities } from '@/business-apps/core/office/sharing'
import type { DocumentSummary, DocumentStatus, DocumentApprovalRequest } from '../types'
import translations from '../_i18n'

/** User info for shared users display */
export interface SharedUserInfo {
  userId: string
  userName?: string
  userAvatar?: string
  permission?: 'view' | 'edit' | 'comment' | 'admin'
}

export interface DocumentPreviewCardProps {
  document: DocumentSummary
  approvalRequest?: DocumentApprovalRequest
  /** Current user ID to determine ownership */
  currentUserId?: string
  /** List of users the document is shared with (for owned documents) */
  sharedUsers?: SharedUserInfo[]
  /** Info about the person who shared this document (for shared documents) */
  sharedByUser?: SharedUserInfo
  onOpen: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
  onExport?: (id: string) => void
  onShare?: (id: string) => void
  onManageShares?: (id: string) => void
  onSendForApproval?: (id: string) => void
  'data-testid'?: string
}

/**
 * Get status badge variant and label
 */
function getStatusBadge(
  status: DocumentStatus,
  t: (k: string) => string
): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  icon: React.ReactNode
} {
  switch (status) {
    case 'draft':
      return {
        variant: 'secondary',
        label: t('preview-card-status-draft'),
        icon: <Pencil className="gba:w-3 gba:h-3" />
      }
    case 'saved':
      return {
        variant: 'outline',
        label: t('preview-card-status-saved'),
        icon: <FileText className="gba:w-3 gba:h-3" />
      }
    case 'pending_approval':
      return {
        variant: 'default',
        label: t('preview-card-status-pending'),
        icon: <Clock className="gba:w-3 gba:h-3" />
      }
    case 'approved':
      return {
        variant: 'default',
        label: t('preview-card-status-approved'),
        icon: <CheckCircle className="gba:w-3 gba:h-3" />
      }
    case 'rejected':
      return {
        variant: 'destructive',
        label: t('preview-card-status-rejected'),
        icon: <XCircle className="gba:w-3 gba:h-3" />
      }
    case 'archived':
      return {
        variant: 'secondary',
        label: t('preview-card-status-archived'),
        icon: <FileUp className="gba:w-3 gba:h-3" />
      }
    default:
      return { variant: 'secondary', label: status, icon: null }
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string, t: (k: string, vars?: Record<string, number | string>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes <= 1 ? t('preview-card-just-now') : t('preview-card-minutes-ago', { count: diffMinutes })
    }
    return diffHours === 1 ? t('preview-card-hour-ago') : t('preview-card-hours-ago', { count: diffHours })
  }

  if (diffDays === 1) return t('preview-card-yesterday')
  if (diffDays < 7) return t('preview-card-days-ago', { count: diffDays })

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * DocumentPreviewCard Component
 */
/**
 * Format approval date
 */
function formatApprovalDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get avatar image URL from base64 data
 * Handles both raw base64 and data: prefixed strings
 */
function getAvatarUrl(picture?: string): string | undefined {
  if (!picture) return undefined
  // If already has data: prefix, use as-is
  if (picture.startsWith('data:')) return picture
  // Otherwise, add the prefix (try png first, browser will handle it)
  return `data:image/png;base64,${picture}`
}

export const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({
  document,
  approvalRequest,
  currentUserId,
  sharedUsers = [],
  sharedByUser,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onShare,
  onManageShares,
  onSendForApproval,
  'data-testid': testId = 'document-preview-card'
}) => {
  const { t } = useTranslation(translations)
  const statusBadge = getStatusBadge(document.status, t)
  const capabilities = getShareCapabilities({
    permission: document.permission,
    isOwner: Boolean(
      document.isOwner || document.permission === 'owner' || (currentUserId && currentUserId === document.createdBy)
    )
  })
  const canEdit = document.isOwner || document.permission === 'edit'
  const canShare = document.isOwner
  const canSendForApproval =
    canEdit && onSendForApproval && !['pending_approval', 'approved', 'rejected'].includes(document.status)

  // Determine if this document was shared with me (not owner)
  const isSharedWithMe = document.isShared === true || (!document.isOwner && document.permission !== 'owner')

  // Debug logging
  React.useEffect(() => {
    console.log('[DocumentPreviewCard]', {
      id: document.id,
      title: document.title,
      status: document.status,
      isOwner: document.isOwner,
      permission: document.permission,
      isSharedWithMe,
      sharedByName: document.sharedByName,
      sharedBy: document.sharedBy,
      canEdit,
      hasCallback: !!onSendForApproval,
      canSendForApproval,
      sharedUsers: sharedUsers?.length || 0,
      sharedByUser: sharedByUser?.userName
    })
  }, [document, canEdit, onSendForApproval, canSendForApproval, isSharedWithMe, sharedUsers, sharedByUser])
  const canDelete = capabilities.canDelete

  // Get approval info
  const approvedBy = approvalRequest?.approvers?.filter(a => a.status === 'approved') || []
  const pendingApprovers = approvalRequest?.approvers?.filter(a => a.status === 'pending') || []
  const rejectedBy = approvalRequest?.approvers?.filter(a => a.status === 'rejected') || []
  const isPendingApproval = document.status === 'pending_approval' || approvalRequest?.status === 'pending'
  const isApproved = document.status === 'approved' || approvalRequest?.status === 'approved'
  const isRejected = document.status === 'rejected' || approvalRequest?.status === 'rejected'

  return (
    <Card
      className="gba:group gba:relative gba:overflow-hidden gba:transition-all gba:duration-200 hover:gba:shadow-md hover:gba:border-primary/30"
      data-testid={testId}
    >
      {/* Gradient accent bar */}
      <div className="gba:h-1 gba:w-full gba:bg-gradient-to-r gba:from-primary gba:via-primary/80 gba:to-primary/60" />

      <div className="gba:p-4">
        {/* Header with icon and menu */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div
              className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:transition-colors ${document.isPdf ? 'gba:bg-red-500/10 group-hover:gba:bg-red-500/20' : 'gba:bg-primary/10 group-hover:gba:bg-primary/20'}`}
            >
              {document.isPdf ? (
                <FileType className="gba:w-5 gba:h-5 gba:text-red-600" />
              ) : (
                <FileText className="gba:w-5 gba:h-5 gba:text-primary" />
              )}
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <h3
                className="gba:font-semibold gba:text-foreground gba:truncate gba:cursor-pointer hover:gba:text-primary gba:transition-colors"
                onClick={() => onOpen(document.id)}
                title={document.title}
              >
                {document.title}
              </h3>
              {document.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:truncate" title={document.description}>
                  {document.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8 gba:shrink-0">
                <MoreVertical className="gba:w-4 gba:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpen(document.id)}>
                <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('preview-card-open')}
              </DropdownMenuItem>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(document.id)}>
                  <Pencil className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-edit')}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(document.id)}>
                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-duplicate')}
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={() => onExport(document.id)}>
                  <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-export')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canShare && onShare && (
                <DropdownMenuItem onClick={() => onShare(document.id)}>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-share')}
                </DropdownMenuItem>
              )}
              {canShare && onManageShares && (sharedUsers.length > 0 || document.sharedWithCount) && (
                <DropdownMenuItem onClick={() => onManageShares(document.id)}>
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-manage-sharing')}
                </DropdownMenuItem>
              )}
              {canSendForApproval && (
                <DropdownMenuItem onClick={() => onSendForApproval!(document.id)}>
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('preview-card-send-approval')}
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(document.id)}
                    className="gba:text-destructive focus:gba:text-destructive"
                  >
                    <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('preview-card-delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status and metadata */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant={statusBadge.variant} className="gba:gap-1">
              {statusBadge.icon}
              {statusBadge.label}
            </Badge>
            {document.category && (
              <Badge variant="outline" className="gba:text-xs">
                {document.category}
              </Badge>
            )}
          </div>

          {document.wordCount && (
            <span className="gba:text-xs gba:text-muted-foreground">
              {t('preview-card-words', { count: document.wordCount })}
            </span>
          )}
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-3">
            {document.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="gba:text-xs gba:font-normal">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="secondary" className="gba:text-xs gba:font-normal">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Approval Status Section */}
        {(isPendingApproval || isApproved || isRejected) && (
          <div className="gba:mt-3 gba:p-2 gba:rounded-md gba:bg-muted/50">
            {/* Pending Approval */}
            {isPendingApproval && pendingApprovers.length > 0 && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-warning">
                <AlertCircle className="gba:w-4 gba:h-4" />
                <span className="gba:text-xs gba:font-medium">
                  {t('preview-card-awaiting', { count: pendingApprovers.length })}
                </span>
              </div>
            )}

            {/* Approved */}
            {isApproved && approvedBy.length > 0 && (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
                  <CheckCircle className="gba:w-4 gba:h-4" />
                  <span className="gba:text-xs gba:font-medium">{t('preview-card-status-approved')}</span>
                </div>
                {approvedBy.map((approver, idx) => (
                  <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:ml-6">
                    <Avatar className="gba:w-5 gba:h-5">
                      <AvatarImage
                        src={getAvatarUrl(approver.userPicture)}
                        alt={approver.userName || t('editor-approval-approver-alt')}
                      />
                      <AvatarFallback className="gba:text-[8px] gba:bg-success/20 gba:text-success">
                        {approver.userName ? getInitials(approver.userName) : <UserCheck className="gba:w-3 gba:h-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:text-xs gba:font-medium gba:text-foreground">
                        {approver.userName || approver.userId}
                      </span>
                      {approver.respondedAt && (
                        <span className="gba:text-[10px] gba:text-muted-foreground">
                          {formatApprovalDate(approver.respondedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rejected */}
            {isRejected && rejectedBy.length > 0 && (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
                  <XCircle className="gba:w-4 gba:h-4" />
                  <span className="gba:text-xs gba:font-medium">{t('preview-card-status-rejected')}</span>
                </div>
                {rejectedBy.map((approver, idx) => (
                  <div key={idx} className="gba:flex gba:items-start gba:gap-2 gba:ml-6">
                    <Avatar className="gba:w-5 gba:h-5 gba:mt-0.5">
                      <AvatarImage
                        src={getAvatarUrl(approver.userPicture)}
                        alt={approver.userName || t('editor-approval-rejector-alt')}
                      />
                      <AvatarFallback className="gba:text-[8px] gba:bg-destructive/20 gba:text-destructive">
                        {approver.userName ? getInitials(approver.userName) : <User className="gba:w-3 gba:h-3" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:text-xs gba:font-medium gba:text-foreground">
                        {approver.userName || approver.userId}
                      </span>
                      {approver.respondedAt && (
                        <span className="gba:text-[10px] gba:text-muted-foreground">
                          {formatApprovalDate(approver.respondedAt)}
                        </span>
                      )}
                      {approver.comments && (
                        <span className="gba:text-[10px] gba:text-muted-foreground gba:italic gba:mt-0.5">
                          "{approver.comments}"
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shared with me indicator */}
        {isSharedWithMe && (
          <div className="gba:mt-3 gba:p-2 gba:rounded-md gba:bg-primary/5 gba:border gba:border-primary/20">
            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Show owner's avatar */}
              {sharedByUser ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="gba:w-6 gba:h-6 gba:border-2 gba:border-primary/30">
                        {sharedByUser.userAvatar && (
                          <AvatarImage src={sharedByUser.userAvatar} alt={sharedByUser.userName || ''} />
                        )}
                        <AvatarFallback className="gba:text-[10px] gba:bg-primary/10 gba:text-primary">
                          {sharedByUser.userName ? (
                            getInitials(sharedByUser.userName)
                          ) : (
                            <User className="gba:w-3 gba:h-3" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('preview-card-owner', { name: sharedByUser.userName || t('owner-unknown') })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Users className="gba:w-4 gba:h-4 gba:text-primary" />
              )}
              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-xs gba:font-medium gba:text-primary">
                  {t('preview-card-shared-with-you')}
                </span>
                {sharedByUser?.userName && (
                  <span className="gba:text-xs gba:text-muted-foreground gba:ml-1">
                    {t('preview-card-by', { name: sharedByUser.userName })}
                  </span>
                )}
              </div>
              {/* Always show permission badge for shared documents */}
              <Badge
                variant={document.permission === 'edit' ? 'default' : 'outline'}
                className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0"
              >
                {document.permission === 'edit'
                  ? t('preview-card-can-edit')
                  : document.permission === 'comment'
                    ? t('preview-card-can-comment')
                    : t('preview-card-view-only')}
              </Badge>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4 gba:pt-3 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <Clock className="gba:w-3 gba:h-3" />
            <span>{formatDate(document.updatedAt, t)}</span>
          </div>

          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Owner indicator (for documents I own) */}
            {document.isOwner && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                <User className="gba:w-3 gba:h-3" />
                <span>{t('preview-card-owner-label')}</span>
              </div>
            )}

            {/* Shared users avatars (for documents I own) */}
            {document.isOwner && sharedUsers.length > 0 && (
              <TooltipProvider>
                <div
                  className="gba:flex gba:items-center gba:-space-x-2 gba:cursor-pointer"
                  onClick={() => onManageShares?.(document.id)}
                >
                  {sharedUsers.slice(0, 4).map(user => (
                    <Tooltip key={user.userId}>
                      <TooltipTrigger asChild>
                        <Avatar className="gba:w-6 gba:h-6 gba:border-2 gba:border-background hover:gba:z-10 gba:transition-transform hover:gba:scale-110">
                          {user.userAvatar && <AvatarImage src={user.userAvatar} alt={user.userName || ''} />}
                          <AvatarFallback className="gba:text-[10px] gba:bg-muted">
                            {user.userName ? getInitials(user.userName) : '?'}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="gba:font-medium">{user.userName || t('owner-unknown')}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {user.permission === 'edit'
                            ? t('preview-card-can-edit')
                            : user.permission === 'comment'
                              ? t('preview-card-can-comment')
                              : t('preview-card-can-view')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {sharedUsers.length > 4 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="gba:w-6 gba:h-6 gba:border-2 gba:border-background">
                          <AvatarFallback className="gba:text-[10px] gba:bg-muted gba:text-muted-foreground">
                            +{sharedUsers.length - 4}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('preview-card-more-people', { count: sharedUsers.length - 4 })}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            )}

            {/* Shared count fallback (when no avatar data available) */}
            {document.isOwner &&
              sharedUsers.length === 0 &&
              document.sharedWithCount &&
              document.sharedWithCount > 0 && (
                <div
                  className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:cursor-pointer hover:gba:text-foreground"
                  onClick={() => onManageShares?.(document.id)}
                >
                  <Users className="gba:w-3 gba:h-3" />
                  <span>{t('preview-card-shared-with', { count: document.sharedWithCount })}</span>
                </div>
              )}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state component
 */
export const NoDocumentsState: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
  const { t } = useTranslation(translations)
  return (
    <Card className="gba:p-12 gba:text-center">
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
        <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
          <FileText className="gba:w-10 gba:h-10 gba:text-primary" />
        </div>
        <div className="gba:space-y-2">
          <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">{t('preview-card-no-documents')}</h3>
          <p className="gba:text-muted-foreground gba:max-w-md">{t('preview-card-create-first')}</p>
        </div>
        <Button onClick={onCreateNew} className="gba:mt-2">
          {t('preview-card-create-new')}
        </Button>
      </div>
    </Card>
  )
}

export default DocumentPreviewCard
