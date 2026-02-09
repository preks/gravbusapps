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
  TooltipTrigger
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
import type { DocumentSummary, DocumentStatus, DocumentApprovalRequest } from '../types'

/** User info for shared users display */
export interface SharedUserInfo {
  userId: string
  userName?: string
  userAvatar?: string
  permission?: 'view' | 'edit' | 'comment'
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
function getStatusBadge(status: DocumentStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
  icon: React.ReactNode
} {
  switch (status) {
    case 'draft':
      return { variant: 'secondary', label: 'Draft', icon: <Pencil className="gba:w-3 gba:h-3" /> }
    case 'saved':
      return { variant: 'outline', label: 'Saved', icon: <FileText className="gba:w-3 gba:h-3" /> }
    case 'pending_approval':
      return { variant: 'default', label: 'Pending Approval', icon: <Clock className="gba:w-3 gba:h-3" /> }
    case 'approved':
      return { variant: 'default', label: 'Approved', icon: <CheckCircle className="gba:w-3 gba:h-3" /> }
    case 'rejected':
      return { variant: 'destructive', label: 'Rejected', icon: <XCircle className="gba:w-3 gba:h-3" /> }
    case 'archived':
      return { variant: 'secondary', label: 'Archived', icon: <FileUp className="gba:w-3 gba:h-3" /> }
    default:
      return { variant: 'secondary', label: status, icon: null }
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }

  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentUserId: _currentUserId,
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
  const statusBadge = getStatusBadge(document.status)
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
  const canDelete = document.isOwner

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
                Open
              </DropdownMenuItem>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(document.id)}>
                  <Pencil className="gba:w-4 gba:h-4 gba:mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(document.id)}>
                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={() => onExport(document.id)}>
                  <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                  Export
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canShare && onShare && (
                <DropdownMenuItem onClick={() => onShare(document.id)}>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              {canShare && onManageShares && (sharedUsers.length > 0 || document.sharedWithCount) && (
                <DropdownMenuItem onClick={() => onManageShares(document.id)}>
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  Manage Sharing
                </DropdownMenuItem>
              )}
              {canSendForApproval && (
                <DropdownMenuItem onClick={() => onSendForApproval!(document.id)}>
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  Send for Approval
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
                    Delete
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
            <span className="gba:text-xs gba:text-muted-foreground">{document.wordCount.toLocaleString()} words</span>
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
                  Awaiting approval from {pendingApprovers.length} {pendingApprovers.length === 1 ? 'person' : 'people'}
                </span>
              </div>
            )}

            {/* Approved */}
            {isApproved && approvedBy.length > 0 && (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
                  <CheckCircle className="gba:w-4 gba:h-4" />
                  <span className="gba:text-xs gba:font-medium">Approved</span>
                </div>
                {approvedBy.map((approver, idx) => (
                  <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:ml-6">
                    <Avatar className="gba:w-5 gba:h-5">
                      <AvatarImage src={getAvatarUrl(approver.userPicture)} alt={approver.userName || 'Approver'} />
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
                  <span className="gba:text-xs gba:font-medium">Rejected</span>
                </div>
                {rejectedBy.map((approver, idx) => (
                  <div key={idx} className="gba:flex gba:items-start gba:gap-2 gba:ml-6">
                    <Avatar className="gba:w-5 gba:h-5 gba:mt-0.5">
                      <AvatarImage src={getAvatarUrl(approver.userPicture)} alt={approver.userName || 'Rejector'} />
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
                      <p>Owner: {sharedByUser.userName || 'Unknown'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Users className="gba:w-4 gba:h-4 gba:text-primary" />
              )}
              <div className="gba:flex-1 gba:min-w-0">
                <span className="gba:text-xs gba:font-medium gba:text-primary">Shared with you</span>
                {sharedByUser?.userName && (
                  <span className="gba:text-xs gba:text-muted-foreground gba:ml-1">by {sharedByUser.userName}</span>
                )}
              </div>
              {/* Always show permission badge for shared documents */}
              <Badge
                variant={document.permission === 'edit' ? 'default' : 'outline'}
                className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0"
              >
                {document.permission === 'edit'
                  ? 'Can edit'
                  : document.permission === 'comment'
                    ? 'Can comment'
                    : 'View only'}
              </Badge>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4 gba:pt-3 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <Clock className="gba:w-3 gba:h-3" />
            <span>{formatDate(document.updatedAt)}</span>
          </div>

          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Owner indicator (for documents I own) */}
            {document.isOwner && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                <User className="gba:w-3 gba:h-3" />
                <span>Owner</span>
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
                        <p className="gba:font-medium">{user.userName || 'Unknown'}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {user.permission === 'edit'
                            ? 'Can edit'
                            : user.permission === 'comment'
                              ? 'Can comment'
                              : 'Can view'}
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
                        <p>{sharedUsers.length - 4} more people</p>
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
                  <span>Shared with {document.sharedWithCount}</span>
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
  return (
    <Card className="gba:p-12 gba:text-center">
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
        <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
          <FileText className="gba:w-10 gba:h-10 gba:text-primary" />
        </div>
        <div className="gba:space-y-2">
          <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">No documents yet</h3>
          <p className="gba:text-muted-foreground gba:max-w-md">
            Create your first document or upload an existing Word file to get started.
          </p>
        </div>
        <Button onClick={onCreateNew} className="gba:mt-2">
          Create New Document
        </Button>
      </div>
    </Card>
  )
}

export default DocumentPreviewCard
