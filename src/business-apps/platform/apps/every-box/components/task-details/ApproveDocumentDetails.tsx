import React, { useState } from 'react'
import { UnifiedTask } from '../../types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Label,
  Separator,
  Alert,
  AlertDescription,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Switch,
  Badge
} from '@newwork/nw-design-system'
import { PiCheckCircle, PiXCircle, PiFile, PiDownload } from 'react-icons/pi'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { DocumentPreview } from './DocumentPreview'

interface ApproveDocumentDetailsProps {
  task: UnifiedTask
  accessToken: string
}

interface DocumentRequest {
  documentDescription?: string
  documentName?: string
  documentType?: string
  fileInfo?: {
    appName?: string
    fileId?: string
    folderPath?: string
    accessScope?: string
    path?: string
    fileMetadata?: {
      mimeType?: string
      originalFileName?: string
      keyValues?: any[]
    }
  }
}

interface Submitter {
  id?: string
  userId?: string
  firstName?: string
  lastName?: string
  callName?: string
  pictureUrl?: string
}

export const ApproveDocumentDetails: React.FC<ApproveDocumentDetailsProps> = ({ task, accessToken }) => {
  const [comment, setComment] = useState('')
  const [includeComment, setIncludeComment] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [validationError, setValidationError] = useState('')

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      console.log('Document approval/rejection successful')
    },
    onError: error => {
      console.error('Failed to process document:', error)
    }
  })

  // Extract data from task
  const documentRequest = task.sourceMetadata?.inputs?.documentRequest as DocumentRequest | undefined
  const submitter = task.sourceMetadata?.inputs?.submitter as Submitter | undefined

  const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType?.startsWith('application/pdf')) return '📄'
    if (mimeType?.startsWith('application/vnd.')) return '📊'
    if (mimeType?.startsWith('text/')) return '📝'
    return '📎'
  }

  const handleApprove = async () => {
    if (!task.sourceMetadata?.endpoint) {
      console.error('No endpoint available for task completion')
      return
    }

    setIsApproving(true)
    setValidationError('')

    try {
      const payload = {
        event: 'pse_approve', // Add event property like other approval processes
        approveRequest: {
          approved: true
        },
        messageOut: includeComment && comment.trim() ? comment.trim() : null
      }

      console.log('🚀 Calling continueProcess with payload:', payload)
      // Hook uses original endpoint from task.sourceMetadata - no need for domain/processName
      await continueProcess({ payload })
    } catch (error) {
      console.error('Failed to approve document:', error)
      setValidationError('Failed to approve document. Please try again.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      setValidationError('A comment is required when rejecting a document.')
      setIncludeComment(true)
      return
    }

    if (!task.sourceMetadata?.endpoint) {
      console.error('No endpoint available for task completion')
      return
    }

    setIsRejecting(true)
    setValidationError('')

    try {
      const payload = {
        event: 'pse_reject', // Add event property like other approval processes
        approveRequest: {
          approved: false
        },
        messageOut: comment.trim()
      }

      console.log('🚀 Calling continueProcess with payload:', payload)
      // Hook uses original endpoint from task.sourceMetadata - no need for domain/processName
      await continueProcess({ payload })
    } catch (error) {
      console.error('Failed to reject document:', error)
      setValidationError('Failed to reject document. Please try again.')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleDownload = () => {
    if (documentRequest?.fileInfo?.path) {
      // Construct the full download URL
      const baseUrl = window.location.origin
      const downloadUrl = `${baseUrl}${documentRequest.fileInfo.path}`
      window.open(downloadUrl, '_blank')
    }
  }

  return (
    <div className="gba:space-y-6">
      {/* Header */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded-md gba:bg-blue-100 gba:text-blue-700">
            <PiFile className="gba:h-4 gba:w-4" />
            <span className="gba:text-xs gba:font-medium">Documents</span>
          </div>
        </div>

        <div className="gba:flex gba:justify-between gba:items-start">
          <div className="gba:flex-1">
            <h2 className="gba:text-2xl gba:font-semibold gba:mb-1">{task.referenceTaskName || 'Approve Document'}</h2>
          </div>
          <Badge variant="warning" data-testid="document-approval-status-badge">
            Pending Approval
          </Badge>
        </div>

        {/* Submitter Info */}
        {submitter && (
          <Card>
            <CardContent className="gba:pt-6">
              <div className="gba:flex gba:items-center gba:gap-4">
                <Avatar className="gba:h-12 gba:w-12">
                  {submitter.pictureUrl && (
                    <AvatarImage src={submitter.pictureUrl} alt={`${submitter.firstName} ${submitter.lastName}`} />
                  )}
                  <AvatarFallback>{getInitials(submitter.firstName, submitter.lastName)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">Submitted by</div>
                  <div className="gba:font-medium">
                    {submitter.firstName} {submitter.lastName}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Details */}
      {documentRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
              {documentRequest.documentName && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Document Name:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium">{documentRequest.documentName}</span>
                </div>
              )}

              {documentRequest.documentType && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Document Type:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{documentRequest.documentType}</span>
                </div>
              )}

              {documentRequest.documentDescription && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Description:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {documentRequest.documentDescription}
                  </span>
                </div>
              )}

              {documentRequest.fileInfo && (
                <>
                  <Separator />
                  <div className="gba:space-y-3">
                    <div className="gba:text-sm gba:font-medium">Attached File</div>

                    <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-background gba:rounded-lg gba:border">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <div className="gba:text-2xl">
                          {getFileIcon(documentRequest.fileInfo.fileMetadata?.mimeType)}
                        </div>
                        <div>
                          <div className="gba:text-sm gba:font-medium">
                            {documentRequest.fileInfo.fileMetadata?.originalFileName || 'Document'}
                          </div>
                          {documentRequest.fileInfo.fileMetadata?.mimeType && (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {documentRequest.fileInfo.fileMetadata.mimeType}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        disabled={!documentRequest.fileInfo.path}
                      >
                        <PiDownload className="gba:h-4 gba:w-4 gba:mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Preview */}
      {documentRequest?.fileInfo && (
        <DocumentPreview
          fileInfo={documentRequest.fileInfo}
          documentName={documentRequest.documentName}
          accessToken={accessToken}
        />
      )}

      {/* Comment Section */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <Label htmlFor="comment">Add Comment (Required for rejection)</Label>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Label htmlFor="include-comment" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                Include comment
              </Label>
              <Switch id="include-comment" checked={includeComment} onCheckedChange={setIncludeComment} />
            </div>
          </div>
        </CardHeader>
        {includeComment && (
          <CardContent>
            <Textarea
              id="comment"
              value={comment}
              onChange={e => {
                setComment(e.target.value)
                setValidationError('')
              }}
              placeholder="Enter your approval comment or rejection reason..."
              rows={4}
              className="gba:resize-none"
            />
          </CardContent>
        )}
      </Card>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="gba:flex gba:gap-3">
        <Button onClick={handleApprove} disabled={isApproving || isRejecting} className="gba:flex-1" variant="default">
          {isApproving ? (
            <>
              <Spinner size="sm" className="gba:mr-2" />
              Approving...
            </>
          ) : (
            <>
              <PiCheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
              Approve
            </>
          )}
        </Button>
        <Button
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="gba:flex-1"
          variant="destructive"
        >
          {isRejecting ? (
            <>
              <Spinner size="sm" className="gba:mr-2" />
              Rejecting...
            </>
          ) : (
            <>
              <PiXCircle className="gba:h-4 gba:w-4 gba:mr-2" />
              Reject
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
