import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Switch
} from '@newwork/nw-design-system'
import { MessageSquare, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react'
import { PiUser } from 'react-icons/pi'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getModuleInfo } from '../../utils/moduleIcons'
import dayjs from 'dayjs'

interface ApproveFeedbackDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string
}

interface FeedbackData {
  id?: string | null
  feedback: string
  feedbackDate: string
  feedbackPublic: boolean
  employeeId: string // Receiver of feedback
  senderEmployeeId: string // Sender of feedback
  rating?: string | null
  typeRef?: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  picture?: string
}

export const ApproveFeedbackDetails: React.FC<ApproveFeedbackDetailsProps> = ({
  task,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [senderEmployee, setSenderEmployee] = useState<EmployeeData | null>(null)
  const [receiverEmployee, setReceiverEmployee] = useState<EmployeeData | null>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      message.success('Feedback reviewed successfully!')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      message.error(`Failed to review feedback: ${error.message || 'Unknown error'}`)
    }
  })

  // Extract feedback data from task inputs (not taskDetails parameters for this task type)
  // The feedback data is in task.sourceMetadata.inputs.feedback, not taskDetails.parameters
  const feedbackInput = task.sourceMetadata?.inputs?.feedback
  const feedback: FeedbackData = feedbackInput
    ? {
        id: feedbackInput.id,
        feedback: feedbackInput.feedback,
        feedbackDate: feedbackInput.feedbackDate,
        feedbackPublic: feedbackInput.feedbackPublic,
        employeeId: feedbackInput.employeeId,
        senderEmployeeId: feedbackInput.senderEmployeeId,
        rating: feedbackInput.rating,
        typeRef: feedbackInput.typeRef
      }
    : ({} as FeedbackData)

  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  const isCompleted = task.status === 'COMPLETED'

  // Fetch employee details for sender and receiver
  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!accessToken || !feedback.senderEmployeeId || !feedback.employeeId) return

      setIsLoadingEmployees(true)
      try {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
              id
              firstName
              lastName
              displayName
              pictureThumbnail
              picture
            }
          }
        `

        // Fetch sender employee
        const senderResponse = await graphqlClient.request<{ Employee: EmployeeData[] }>(employeeQuery, {
          employeeId: feedback.senderEmployeeId
        })

        if (senderResponse.Employee && senderResponse.Employee.length > 0) {
          setSenderEmployee(senderResponse.Employee[0])
        }

        // Fetch receiver employee
        const receiverResponse = await graphqlClient.request<{ Employee: EmployeeData[] }>(employeeQuery, {
          employeeId: feedback.employeeId
        })

        if (receiverResponse.Employee && receiverResponse.Employee.length > 0) {
          setReceiverEmployee(receiverResponse.Employee[0])
        }
      } catch (error) {
        console.error('Error fetching employee details:', error)
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployeeDetails()
  }, [accessToken, feedback.senderEmployeeId, feedback.employeeId, graphqlClient])

  // Helper to get employee initials for avatar fallback
  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Format feedback type
  const formatFeedbackType = (typeRef: string | null | undefined): string => {
    if (!typeRef) return 'General Feedback'

    // Extract the type from format like "FeedbackType:v1:POSITIVE"
    const type = typeRef.split(':').pop() || typeRef
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await continueProcess({
        domain: 'employee',
        processName: 'giveFeedback',
        payload: {
          approval: 'approved',
          comment: comment || undefined
        }
      })
    } catch (error) {
      console.error('Error approving feedback:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning('Please add a comment explaining the reason for rejection')
      setShowComment(true) // Auto-enable comment box
      return
    }

    setIsRejecting(true)
    try {
      await continueProcess({
        domain: 'employee',
        processName: 'giveFeedback',
        payload: {
          approval: 'rejected',
          comment: comment
        }
      })
    } catch (error) {
      console.error('Error rejecting feedback:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  // Get module info for badge
  const moduleInfo = getModuleInfo(task.sourceMetadata?.domain)
  const ModuleIcon = moduleInfo.icon

  // Generate title from task reference name
  const taskTitle = task.referenceTaskName || 'Approve Feedback'

  // Format feedback date
  const formattedDate = feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMMM D, YYYY [at] h:mm A') : 'N/A'

  return (
    <div className="gba:space-y-6" data-testid="approve-feedback-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <MessageSquare className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="feedback-title">
              {taskTitle}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="feedback-subtitle">
            Review and approve employee feedback
          </p>
        </div>
        <Badge variant="warning" data-testid="feedback-status-badge">
          Pending Approval
        </Badge>
      </div>

      <Separator />

      {/* Sender & Receiver Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Feedback Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {isLoadingEmployees ? (
            <p className="gba:text-sm gba:text-muted-foreground">Loading employee details...</p>
          ) : (
            <>
              {/* Sender */}
              <div>
                <Label className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                  From (Sender)
                </Label>
                {senderEmployee ? (
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
                    <Avatar>
                      {senderEmployee.pictureThumbnail || senderEmployee.picture ? (
                        <AvatarImage
                          src={senderEmployee.pictureThumbnail || senderEmployee.picture}
                          alt={senderEmployee.displayName}
                        />
                      ) : null}
                      <AvatarFallback>{getInitials(senderEmployee.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="gba:font-medium">{senderEmployee.displayName}</p>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {senderEmployee.firstName} {senderEmployee.lastName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Employee: {creatorName}</p>
                )}
              </div>

              <Separator />

              {/* Receiver */}
              <div>
                <Label className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                  To (Receiver)
                </Label>
                {receiverEmployee ? (
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
                    <Avatar>
                      {receiverEmployee.pictureThumbnail || receiverEmployee.picture ? (
                        <AvatarImage
                          src={receiverEmployee.pictureThumbnail || receiverEmployee.picture}
                          alt={receiverEmployee.displayName}
                        />
                      ) : null}
                      <AvatarFallback>{getInitials(receiverEmployee.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="gba:font-medium">{receiverEmployee.displayName}</p>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {receiverEmployee.firstName} {receiverEmployee.lastName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Loading...</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alert */}
      <Alert>
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertDescription>
          Please review the feedback message below and decide whether to approve or reject it.
        </AlertDescription>
      </Alert>

      {/* Feedback Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
            <MessageSquare className="gba:h-5 gba:w-5" />
            Feedback Details
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Feedback Metadata */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4" />
                Feedback Date
              </Label>
              <div className="gba:text-base">{formattedDate}</div>
            </div>

            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Feedback Type</Label>
              <div className="gba:text-base">{formatFeedbackType(feedback.typeRef)}</div>
            </div>

            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Visibility</Label>
              <div className="gba:text-base">
                <Badge variant={feedback.feedbackPublic ? 'default' : 'secondary'}>
                  {feedback.feedbackPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
            </div>

            {feedback.rating && (
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground">Rating</Label>
                <div className="gba:text-base">{feedback.rating}</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Feedback Message - Prominent Display */}
          <div className="gba:space-y-2">
            <Label className="gba:text-muted-foreground gba:text-sm gba:font-semibold">Feedback Message</Label>
            <div className="gba:bg-muted/30 gba:border gba:border-muted gba:rounded-lg gba:p-4">
              <p className="gba:text-base gba:leading-relaxed gba:whitespace-pre-wrap">
                {feedback.feedback || 'No feedback message provided'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Section - Only for active tasks */}
      {!isCompleted && (
        <>
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch id="show-comment" checked={showComment} onCheckedChange={setShowComment} />
              <Label
                htmlFor="show-comment"
                className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
              >
                <MessageSquare className="gba:h-4 gba:w-4" />
                Add Comment {!showComment && '(Optional)'}
              </Label>
            </div>

            {showComment && (
              <Textarea
                id="comment"
                placeholder="Enter your approval comment or rejection reason..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className="gba:w-full"
                data-testid="review-comment-input"
              />
            )}
          </div>
        </>
      )}

      {/* Action Buttons - Hidden for completed tasks */}
      {!isCompleted && (
        <div className="gba:flex gba:justify-end gba:gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
            data-testid="reject-button"
          >
            {isRejecting ? (
              <>Rejecting...</>
            ) : (
              <>
                <XCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                Reject
              </>
            )}
          </Button>

          <Button onClick={handleApprove} disabled={isApproving || isRejecting} data-testid="approve-button">
            {isApproving ? (
              <>Approving...</>
            ) : (
              <>
                <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                Approve
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
