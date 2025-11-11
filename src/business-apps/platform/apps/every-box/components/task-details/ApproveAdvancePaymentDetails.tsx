import React, { useState, useEffect } from 'react'
import { message, Spin } from 'antd'
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
import {
  DollarSign,
  FolderOpen,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react'
import { PiReceipt, PiUser, PiBuilding, PiFolder } from 'react-icons/pi'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { getModuleInfo } from '../../utils/moduleIcons'
import { getInitials as getAvatarInitials } from '../../utils/avatarUtils'
import dayjs from 'dayjs'

interface ApproveAdvancePaymentDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string
}

interface AdvancePaymentData {
  id: string
  amount: number
  currencyRef: string
  paymentMethod: string
  status: string
  description?: string
  expensePlan?: string
  costCenter?: string
  project?: string | null
  transactionDate?: string | null
  decisionDate?: string | null
}

export const ApproveAdvancePaymentDetails: React.FC<ApproveAdvancePaymentDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  employeeId
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [expensePlanDetails, setExpensePlanDetails] = useState<any>(null)
  const [costCenterDetails, setCostCenterDetails] = useState<any>(null)
  const [projectDetails, setProjectDetails] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      message.success('Advance payment reviewed successfully!')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      message.error(`Failed to review advance payment: ${error.message || 'Unknown error'}`)
    }
  })

  // Extract advance payment data from task parameters
  const advancePayment: AdvancePaymentData = taskDetails?.parameters?.advancePayment || {}
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'
  const creatorUserId = task.sourceMetadata?.creatorUserId

  // Fetch employee details for avatar and full information
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: creatorUserId,
    costCenterId: advancePayment.costCenter,
    projectId: advancePayment.project,
    accessToken
  })

  const isCompleted = task.status === 'COMPLETED'

  // Fetch expense plan, cost center, and project details
  useEffect(() => {
    const fetchRelatedDetails = async () => {
      if (!accessToken) return

      setIsLoadingDetails(true)
      try {
        // Get structure ID from user info (needed for cost center and project queries)
        const structureIdQuery = `
          query GetStructureId($creatorUserId: uuid!) {
            EmployeePosition(where: {employeeId: {_eq: $creatorUserId}}, limit: 1) {
              structureId
            }
          }
        `

        const creatorUserId = task.sourceMetadata?.creatorUserId
        let structureId = null

        if (creatorUserId) {
          const structureResponse = await graphqlClient.request<{ EmployeePosition: any[] }>(structureIdQuery, {
            creatorUserId
          })
          structureId = structureResponse.EmployeePosition?.[0]?.structureId
        }

        // Fetch Expense Plan details
        if (advancePayment.expensePlan) {
          const expensePlanQuery = `
            query GetExpensePlan($expensePlanId: uuid!) {
              ExpensePlan(where: {id: {_eq: $expensePlanId}}, limit: 1) {
                id
                code
                title
                description
                startDate
                endDate
                totalAmount
                status
                requestType {
                  value
                }
                currency {
                  code
                }
                employee {
                  fullName
                  firstName
                  lastName
                }
              }
            }
          `
          const expensePlanResponse = await graphqlClient.request<{ ExpensePlan: any[] }>(expensePlanQuery, {
            expensePlanId: advancePayment.expensePlan
          })

          if (expensePlanResponse.ExpensePlan && expensePlanResponse.ExpensePlan.length > 0) {
            setExpensePlanDetails(expensePlanResponse.ExpensePlan[0])
          }
        }

        // Fetch Cost Center details
        if (advancePayment.costCenter && structureId) {
          const costCenterQuery = `
            query GetCostCenter($costCenterId: uuid!, $structureId: uuid!) {
              CostCenter(
                where: { 
                  id: { _eq: $costCenterId },
                  structureId: { _eq: $structureId }
                }, 
                limit: 1
              ) {
                id
                name
                code
              }
            }
          `
          const costCenterResponse = await graphqlClient.request<{ CostCenter: any[] }>(costCenterQuery, {
            costCenterId: advancePayment.costCenter,
            structureId
          })

          if (costCenterResponse.CostCenter && costCenterResponse.CostCenter.length > 0) {
            setCostCenterDetails(costCenterResponse.CostCenter[0])
          }
        }

        // Fetch Project details
        if (advancePayment.project && structureId) {
          const projectQuery = `
            query GetProject($projectId: uuid!, $structureId: uuid!) {
              Project(
                where: { 
                  id: { _eq: $projectId },
                  structureId: { _eq: $structureId }
                }, 
                limit: 1
              ) {
                id
                name
                code
              }
            }
          `
          const projectResponse = await graphqlClient.request<{ Project: any[] }>(projectQuery, {
            projectId: advancePayment.project,
            structureId
          })

          if (projectResponse.Project && projectResponse.Project.length > 0) {
            setProjectDetails(projectResponse.Project[0])
          }
        }
      } catch (error) {
        console.error('Error fetching related details:', error)
      } finally {
        setIsLoadingDetails(false)
      }
    }

    fetchRelatedDetails()
  }, [
    accessToken,
    advancePayment.expensePlan,
    advancePayment.costCenter,
    advancePayment.project,
    task.sourceMetadata?.creatorUserId,
    graphqlClient
  ])

  // Extract currency code from format (Currency:v1:EUR -> EUR)
  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }

  const currencyCode = extractCurrencyCode(advancePayment.currencyRef)

  // Format currency for display
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format payment method for display
  const formatPaymentMethod = (method: string): string => {
    if (!method) return 'N/A'
    return method
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get status badge variant
  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'success'
      case 'REJECTED':
        return 'destructive'
      case 'PENDING':
        return 'warning'
      default:
        return 'default'
    }
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await continueProcess({
        domain: 'employee-expense',
        processName: 'approveAdvancePayment',
        payload: {
          event: 'approve',
          advancePaymentComment: {
            commentDate: new Date().toISOString().slice(0, 19),
            comment: comment || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            advancePayment: advancePayment.id
          }
        }
      })
    } catch (error) {
      console.error('Error approving advance payment:', error)
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
        domain: 'employee-expense',
        processName: 'approveAdvancePayment',
        payload: {
          event: 'reject',
          advancePaymentComment: {
            commentDate: new Date().toISOString().slice(0, 19),
            comment: comment,
            commentType: 'REJECT_COMMENT',
            authorEmployee: employeeId,
            advancePayment: advancePayment.id
          }
        }
      })
    } catch (error) {
      console.error('Error rejecting advance payment:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  // Get module info for badge
  const moduleInfo = getModuleInfo(task.sourceMetadata?.domain)
  const ModuleIcon = moduleInfo.icon

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return { label: 'Approved', variant: 'success' as const }
      case 'REJECTED':
        return { label: 'Rejected', variant: 'destructive' as const }
      case 'PENDING':
        return { label: 'In Approval', variant: 'warning' as const }
      default:
        return { label: status || 'Pending', variant: 'default' as const }
    }
  }

  const statusDisplay = getStatusDisplay(advancePayment.status)

  // Generate title from task reference name
  const taskTitle = task.referenceTaskName || 'Approve Advance Payment'

  return (
    <div className="gba:space-y-6" data-testid="approve-advance-payment-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <PiReceipt className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="advance-payment-title">
              {taskTitle}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="payment-method">
            {advancePayment.paymentMethod || 'Payment Request'}
          </p>
        </div>
        <Badge variant={statusDisplay.variant} data-testid="advance-payment-status-badge">
          {statusDisplay.label}
        </Badge>
      </div>

      {expensePlanDetails?.description && (
        <>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground gba:italic" data-testid="expense-plan-description">
              {expensePlanDetails.description}
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Employee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Employee
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          {isLoadingEntities ? (
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:animate-pulse" />
              <div className="gba:flex-1">
                <div className="gba:h-5 gba:w-32 gba:bg-muted gba:rounded gba:animate-pulse gba:mb-2" />
                <div className="gba:h-4 gba:w-24 gba:bg-muted gba:rounded gba:animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="gba:flex gba:items-start gba:gap-3">
              <Avatar className="gba:h-10 gba:w-10">
                {entities.employee?.avatarUrl ? (
                  <AvatarImage src={entities.employee.avatarUrl} alt={entities.employee.displayName} />
                ) : null}
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {entities.employee?.displayName
                    ? getAvatarInitials(entities.employee.displayName)
                    : getAvatarInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:font-medium">{entities.employee?.displayName || creatorName}</p>
                {(entities.employee?.position || entities.employee?.organizationalUnit) && (
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {[entities.employee?.position, entities.employee?.organizationalUnit].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Cost Center */}
          <div className="gba:flex gba:items-start gba:gap-2">
            <PiBuilding className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Cost Center</Label>
              {entities.costCenter ? (
                <p className="gba:text-sm">
                  {entities.costCenter.name}
                  {entities.costCenter.code && (
                    <span className="gba:text-muted-foreground"> ({entities.costCenter.code})</span>
                  )}
                </p>
              ) : costCenterDetails ? (
                <p className="gba:text-sm">
                  {costCenterDetails.name}
                  {costCenterDetails.code && (
                    <span className="gba:text-muted-foreground"> ({costCenterDetails.code})</span>
                  )}
                </p>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground">N/A</p>
              )}
            </div>
          </div>

          {/* Project */}
          {(advancePayment.project || projectDetails || entities.project) && (
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiFolder className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Project</Label>
                {entities.project ? (
                  <p className="gba:text-sm">{entities.project.name}</p>
                ) : projectDetails ? (
                  <p className="gba:text-sm">{projectDetails.name}</p>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">N/A</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert */}
      <Alert>
        <AlertCircle className="gba:h-4 gba:w-4" />
        <AlertDescription>Please review the advance payment details below and provide your decision.</AlertDescription>
      </Alert>

      {/* Payment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
            <DollarSign className="gba:h-5 gba:w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Amount - Prominent Display */}
          <div className="gba:bg-primary/5 gba:border gba:border-primary/20 gba:rounded-lg gba:p-4">
            <Label className="gba:text-muted-foreground gba:text-sm">Payment Amount</Label>
            <div className="gba:text-3xl gba:font-bold gba:text-primary gba:mt-1">
              {formatCurrency(advancePayment.amount || 0, currencyCode)}
            </div>
          </div>

          <Separator />

          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {/* Payment Method */}
            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Payment Method</Label>
              <div className="gba:text-base">{formatPaymentMethod(advancePayment.paymentMethod)}</div>
            </div>

            {/* Currency */}
            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Currency</Label>
              <div className="gba:text-base">{currencyCode}</div>
            </div>

            {/* Payment Status */}
            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Payment Status</Label>
              <div className="gba:text-base">
                <Badge variant={getStatusVariant(advancePayment.status)}>{advancePayment.status}</Badge>
              </div>
            </div>

            {/* Transaction Confirmed */}
            <div className="gba:space-y-1">
              <Label className="gba:text-muted-foreground">Transaction Confirmed</Label>
              <div className="gba:text-base">
                {advancePayment.transactionConfirmed ? (
                  <Badge variant="success">✓ Confirmed</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Additional Payment Information */}
          {(advancePayment.decisionDate || advancePayment.transactionDate || advancePayment.transactionNumber) && (
            <>
              <Separator />
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                {advancePayment.decisionDate && (
                  <div className="gba:space-y-1">
                    <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Decision Date
                    </Label>
                    <div className="gba:text-base">{dayjs(advancePayment.decisionDate).format('MMM D, YYYY')}</div>
                  </div>
                )}

                {advancePayment.transactionDate && (
                  <div className="gba:space-y-1">
                    <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <Calendar className="gba:h-4 gba:w-4" />
                      Transaction Date
                    </Label>
                    <div className="gba:text-base">{dayjs(advancePayment.transactionDate).format('MMM D, YYYY')}</div>
                  </div>
                )}

                {advancePayment.transactionNumber && (
                  <div className="gba:space-y-1">
                    <Label className="gba:text-muted-foreground">Transaction Number</Label>
                    <div className="gba:text-sm gba:font-mono gba:bg-muted/20 gba:p-2 gba:rounded">
                      {advancePayment.transactionNumber}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Description */}
          {advancePayment.description && advancePayment.description.trim() && (
            <>
              <Separator />
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <FileText className="gba:h-4 gba:w-4" />
                  Description
                </Label>
                <div className="gba:text-sm gba:bg-muted/20 gba:p-3 gba:rounded">{advancePayment.description}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Expense Plan Details Card */}
      {(expensePlanDetails || costCenterDetails || projectDetails || advancePayment.expensePlan) && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <FolderOpen className="gba:h-5 gba:w-5" />
              {expensePlanDetails ? 'Expense Plan Details' : 'Assignment Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {isLoadingDetails && (
              <div className="gba:flex gba:justify-center gba:py-4">
                <Spin size="default" />
              </div>
            )}

            {!isLoadingDetails && expensePlanDetails && (
              <>
                {/* Expense Plan Header */}
                <div className="gba:bg-primary/5 gba:border gba:border-primary/20 gba:rounded-lg gba:p-4">
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                      <div className="gba:flex-1">
                        <Label className="gba:text-muted-foreground gba:text-xs">Plan Title</Label>
                        <div className="gba:text-lg gba:font-semibold gba:mt-1">
                          {expensePlanDetails.title || 'Untitled Plan'}
                        </div>
                      </div>
                      {expensePlanDetails.status && (
                        <Badge variant={getStatusVariant(expensePlanDetails.status)}>{expensePlanDetails.status}</Badge>
                      )}
                    </div>

                    {expensePlanDetails.code && (
                      <div>
                        <Label className="gba:text-muted-foreground gba:text-xs">Plan Code</Label>
                        <div className="gba:text-sm gba:font-mono gba:mt-1">{expensePlanDetails.code}</div>
                      </div>
                    )}

                    {expensePlanDetails.description && (
                      <div>
                        <Label className="gba:text-muted-foreground gba:text-xs">Description</Label>
                        <div className="gba:text-sm gba:mt-1">{expensePlanDetails.description}</div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Plan Dates and Amounts */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {expensePlanDetails.startDate && (
                    <div className="gba:space-y-1">
                      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:h-4 gba:w-4" />
                        Start Date
                      </Label>
                      <div className="gba:text-base">{dayjs(expensePlanDetails.startDate).format('MMM D, YYYY')}</div>
                    </div>
                  )}

                  {expensePlanDetails.endDate && (
                    <div className="gba:space-y-1">
                      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:h-4 gba:w-4" />
                        End Date
                      </Label>
                      <div className="gba:text-base">{dayjs(expensePlanDetails.endDate).format('MMM D, YYYY')}</div>
                    </div>
                  )}

                  {expensePlanDetails.totalAmount !== null && expensePlanDetails.totalAmount !== undefined && (
                    <div className="gba:space-y-1">
                      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                        <DollarSign className="gba:h-4 gba:w-4" />
                        Total Amount
                      </Label>
                      <div className="gba:text-base gba:font-semibold">
                        {formatCurrency(expensePlanDetails.totalAmount, expensePlanDetails.currency?.code || 'EUR')}
                      </div>
                    </div>
                  )}

                  {expensePlanDetails.requestType?.value && (
                    <div className="gba:space-y-1">
                      <Label className="gba:text-muted-foreground">Request Type</Label>
                      <div className="gba:text-base">{expensePlanDetails.requestType.value}</div>
                    </div>
                  )}
                </div>

                {expensePlanDetails.employee && (
                  <>
                    <Separator />
                    <div className="gba:space-y-1">
                      <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                        <PiUser className="gba:h-4 gba:w-4" />
                        Employee
                      </Label>
                      <div className="gba:text-base">
                        {expensePlanDetails.employee.fullName ||
                          `${expensePlanDetails.employee.firstName} ${expensePlanDetails.employee.lastName}`}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Project Details */}
            {!isLoadingDetails && projectDetails && (
              <>
                {expensePlanDetails && <Separator />}
                <div className="gba:space-y-1">
                  <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                    <FolderOpen className="gba:h-4 gba:w-4" />
                    Project
                  </Label>
                  <div className="gba:text-base gba:font-medium">{projectDetails.name}</div>
                  {projectDetails.code && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:font-mono">{projectDetails.code}</div>
                  )}
                </div>
              </>
            )}

            {/* Fallback to raw IDs if details not loaded */}
            {!isLoadingDetails && !expensePlanDetails && !projectDetails && (
              <div className="gba:space-y-4">
                {advancePayment.expensePlan && (
                  <div className="gba:space-y-1">
                    <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <FolderOpen className="gba:h-4 gba:w-4" />
                      Expense Plan ID
                    </Label>
                    <div
                      className="gba:text-xs gba:font-mono gba:bg-muted/20 gba:p-2 gba:rounded gba:truncate"
                      title={advancePayment.expensePlan}
                    >
                      {advancePayment.expensePlan}
                    </div>
                  </div>
                )}

                {advancePayment.project && (
                  <div className="gba:space-y-1">
                    <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <FolderOpen className="gba:h-4 gba:w-4" />
                      Project ID
                    </Label>
                    <div
                      className="gba:text-xs gba:font-mono gba:bg-muted/20 gba:p-2 gba:rounded gba:truncate"
                      title={advancePayment.project}
                    >
                      {advancePayment.project}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
