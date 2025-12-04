import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  Label,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@newwork/nw-design-system'
import {
  Users,
  CheckCircle,
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Shield,
  ChevronDown
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useRelationshipReviewData } from './hooks/useRelationshipReviewData'

/**
 * Extended interface for additionalData with form-specific properties
 */
interface ExtendedAdditionalData {
  [k: string]: unknown
  psi_taskCompletedAt?: string
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
}

interface ChangeRelationshipReviewProps extends BusinessAppContextProps {
  onClose?: () => void
}

interface EmployeeRelationshipData {
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  email?: string | null
  notes?: string | null
  typeRef?: string | null
  birthDate?: string | null
  emergencyContact?: boolean | null
  relationshipDocument?: string | null
}

const ChangeRelationshipReviewContent: React.FC<ChangeRelationshipReviewProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [isUnchangedExpanded, setIsUnchangedExpanded] = useState(false)

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Review Relationship Change'
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || (processMetadata?.endpoint ? 'kogito' : 'kogito')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Extract relationship data from payload
  const newRelationship: EmployeeRelationshipData = taskPayload?.employeeRelationship || {}
  const oldRelationship: EmployeeRelationshipData = taskPayload?.oldEmployeeRelationship || {}
  const employeeIdFromPayload: string | undefined = taskPayload?.employeeId || userInfo?.employeeDetails?.employeeId

  // Fetch employee and catalog data
  const { employeeData, catalogMap, loading, error, refetch } = useRelationshipReviewData({
    accessToken,
    employeeId: employeeIdFromPayload,
    newRelationship,
    oldRelationship
  })

  // Detect if we're in every-box context
  const isEveryBoxContext = !!onClose

  // Helper: check if old relationship exists
  const hasOldRelationship = Boolean(
    oldRelationship?.firstName || oldRelationship?.lastName || oldRelationship?.phoneNumber || oldRelationship?.typeRef
  )

  const changeMode = hasOldRelationship ? 'UPDATE' : 'INSERT'
  const isInsertMode = changeMode === 'INSERT'

  // Count total changes - MUST BE BEFORE CONDITIONAL RETURNS
  const changesCount = useMemo(() => {
    if (!hasOldRelationship) return 0

    const fields: (keyof EmployeeRelationshipData)[] = [
      'firstName',
      'lastName',
      'phoneNumber',
      'email',
      'notes',
      'typeRef',
      'birthDate',
      'emergencyContact'
    ]

    const compareField = (newVal: any, oldVal: any): boolean => {
      const format = (v: any) => String(v || 'N/A')
      return format(newVal) !== format(oldVal)
    }

    return fields.reduce((count, field) => {
      return compareField(newRelationship[field], oldRelationship[field]) ? count + 1 : count
    }, 0)
  }, [newRelationship, oldRelationship, hasOldRelationship])

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    try {
      dispatchProcessContinueEvent('pse_submit', {
        acknowledge: 'acknowledged'
      })
    } catch (err) {
      console.error('Error acknowledging relationship change:', err)
    } finally {
      setIsAcknowledging(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="change-relationship-review-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="change-relationship-review-error">
        <AlertTitle>Error Loading Relationship Data</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={refetch}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  // Helper functions
  const getCatalogValue = (ref?: string | null): string => {
    if (!ref) return 'N/A'
    const entry = catalogMap[ref]
    if (!entry) return ref.split(':').pop() || ref

    // Use translation if available, otherwise use default value
    return entry.translations?.[0]?.value || entry.value || entry.code || ref
  }

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Field comparison
  interface FieldComparison {
    changed: boolean
    oldValue: string
    newValue: string
  }

  const compareField = (newVal: any, oldVal: any, formatter?: (val: any) => string): FieldComparison => {
    const format = formatter || ((v: any) => String(v || 'N/A'))
    const newFormatted = format(newVal)
    const oldFormatted = format(oldVal)

    return {
      changed: newFormatted !== oldFormatted,
      oldValue: oldFormatted,
      newValue: newFormatted
    }
  }

  const displayName = employeeData
    ? `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() || 'Employee'
    : 'Employee'

  const relationshipName =
    `${newRelationship.firstName || ''} ${newRelationship.lastName || ''}`.trim() || 'Relationship'

  // Render comparison field - Show changed fields OR all fields with values in insert mode
  const renderComparisonField = (label: string, comparison: FieldComparison, icon?: React.ReactNode) => {
    const isNewRelationship = !hasOldRelationship || isInsertMode

    // For insert mode: show all fields that have a value
    // For update mode: only show changed fields
    if (isNewRelationship) {
      // Skip empty values in insert mode
      if (!comparison.newValue || comparison.newValue === 'N/A') return null
    } else {
      // Only show changed fields in update mode
      if (!comparison.changed) return null
    }

    // Display "Not set" if old value was empty/null/N/A
    const displayOldValue = comparison.oldValue === 'N/A' || !comparison.oldValue ? 'Not set' : comparison.oldValue

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
          <Badge variant={isNewRelationship ? 'success' : 'warning'} className="gba:ml-2">
            {isNewRelationship ? 'New' : 'Changed'}
          </Badge>
        </Label>

        {/* Always show old → new for changed fields */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          {!isNewRelationship && (
            <>
              <div className="gba:px-3 gba:py-2 gba:bg-destructive/10 gba:text-destructive gba:rounded gba:text-sm gba:line-through">
                {displayOldValue}
              </div>
              <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            </>
          )}
          <div className="gba:px-3 gba:py-2 gba:bg-success/10 gba:text-success gba:rounded gba:text-sm gba:font-medium">
            {comparison.newValue}
          </div>
        </div>
      </div>
    )
  }

  // Render unchanged field - Show current value for unchanged fields
  const renderUnchangedField = (label: string, value: string, icon?: React.ReactNode) => {
    // Skip empty values
    if (!value || value === 'N/A') return null

    return (
      <div className="gba:space-y-2">
        <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          {icon}
          {label}
        </Label>
        <div className="gba:px-3 gba:py-2 gba:bg-muted gba:rounded gba:text-sm">{value}</div>
      </div>
    )
  }

  return (
    <TaskFormLayout
      data-testid="change-relationship-review-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          showEmployeeInfo={true}
          employeeData={
            employeeData
              ? {
                  displayName,
                  firstName: employeeData.firstName,
                  lastName: employeeData.lastName,
                  avatarUrl: employeeData.pictureThumbnail
                    ? `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
                    : undefined,
                  position: employeeData.employeePosition?.jobPosition?.name
                }
              : undefined
          }
          isLoadingEmployee={loading}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
          customBadges={
            <Badge variant={isInsertMode ? 'success' : 'info'} data-testid="relationship-change-mode-badge">
              {isInsertMode ? 'New Relationship' : 'Relationship Update'}
            </Badge>
          }
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="change-relationship-review-actions"
            actions={[
              {
                label: 'Acknowledge',
                onClick: handleAcknowledge,
                variant: 'default' as const,
                disabled: isAcknowledging,
                loading: isAcknowledging,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-4"
    >
      {/* Change Mode Alert */}
      <Alert variant="default">
        <FileText className="gba:h-4 gba:w-4" />
        <AlertDescription>
          {isInsertMode
            ? `This is a new relationship being added for ${relationshipName}.`
            : hasOldRelationship && changesCount > 0
              ? `This is an update with ${changesCount} ${changesCount === 1 ? 'change' : 'changes'} to the existing relationship. Changed fields are highlighted below.`
              : 'This is an update to an existing relationship.'}
        </AlertDescription>
      </Alert>

      {/* Relationship Comparison Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <Users className="gba:h-5 gba:w-5" />
              {isInsertMode ? 'New Relationship Details' : 'Relationship Changes'}
            </CardTitle>
            {hasOldRelationship && changesCount > 0 && (
              <Badge variant="warning">
                {changesCount} {changesCount === 1 ? 'Change' : 'Changes'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Personal Information */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              'First Name',
              compareField(newRelationship.firstName, oldRelationship.firstName),
              <User className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              'Last Name',
              compareField(newRelationship.lastName, oldRelationship.lastName),
              <User className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              'Phone Number',
              compareField(newRelationship.phoneNumber, oldRelationship.phoneNumber),
              <Phone className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              'Email',
              compareField(newRelationship.email, oldRelationship.email),
              <Mail className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Relationship Details */}
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {renderComparisonField(
              'Relationship Type',
              compareField(newRelationship.typeRef, oldRelationship.typeRef, getCatalogValue),
              <Users className="gba:h-4 gba:w-4" />
            )}
            {renderComparisonField(
              'Birth Date',
              compareField(newRelationship.birthDate, oldRelationship.birthDate, formatDate),
              <Calendar className="gba:h-4 gba:w-4" />
            )}
          </div>

          <Separator />

          {/* Emergency Contact */}
          {renderComparisonField(
            'Emergency Contact',
            compareField(
              String(newRelationship.emergencyContact || false),
              String(oldRelationship.emergencyContact || false)
            ),
            <Shield className="gba:h-4 gba:w-4" />
          )}

          {/* Notes - only show if present */}
          {(newRelationship.notes || oldRelationship.notes) && (
            <>
              <Separator />
              {renderComparisonField('Notes', compareField(newRelationship.notes, oldRelationship.notes))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Unchanged Fields - Collapsible Section */}
      {!isInsertMode && hasOldRelationship && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <Users className="gba:h-5 gba:w-5" />
                    All Other Fields
                    <Badge variant="secondary" className="gba:ml-2">
                      Unchanged
                    </Badge>
                  </CardTitle>
                  <ChevronDown
                    className={`gba:h-5 gba:w-5 gba:transition-transform ${
                      isUnchangedExpanded ? 'gba:rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="gba:space-y-4 gba:pt-0">
                {/* Personal Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.firstName, oldRelationship.firstName)
                    return (
                      !comparison.changed &&
                      renderUnchangedField('First Name', comparison.newValue, <User className="gba:h-4 gba:w-4" />)
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.lastName, oldRelationship.lastName)
                    return (
                      !comparison.changed &&
                      renderUnchangedField('Last Name', comparison.newValue, <User className="gba:h-4 gba:w-4" />)
                    )
                  })()}
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.phoneNumber, oldRelationship.phoneNumber)
                    return (
                      !comparison.changed &&
                      renderUnchangedField('Phone Number', comparison.newValue, <Phone className="gba:h-4 gba:w-4" />)
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.email, oldRelationship.email)
                    return (
                      !comparison.changed &&
                      renderUnchangedField('Email', comparison.newValue, <Mail className="gba:h-4 gba:w-4" />)
                    )
                  })()}
                </div>

                <Separator />

                {/* Relationship Details */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(() => {
                    const comparison = compareField(newRelationship.typeRef, oldRelationship.typeRef, getCatalogValue)
                    return (
                      !comparison.changed &&
                      renderUnchangedField(
                        'Relationship Type',
                        comparison.newValue,
                        <Users className="gba:h-4 gba:w-4" />
                      )
                    )
                  })()}

                  {(() => {
                    const comparison = compareField(newRelationship.birthDate, oldRelationship.birthDate, formatDate)
                    return (
                      !comparison.changed &&
                      renderUnchangedField('Birth Date', comparison.newValue, <Calendar className="gba:h-4 gba:w-4" />)
                    )
                  })()}
                </div>

                <Separator />

                {/* Emergency Contact */}
                {(() => {
                  const comparison = compareField(
                    String(newRelationship.emergencyContact || false),
                    String(oldRelationship.emergencyContact || false)
                  )
                  return (
                    !comparison.changed &&
                    renderUnchangedField(
                      'Emergency Contact',
                      comparison.newValue,
                      <Shield className="gba:h-4 gba:w-4" />
                    )
                  )
                })()}

                {/* Notes */}
                {(newRelationship.notes || oldRelationship.notes) &&
                  (() => {
                    const comparison = compareField(newRelationship.notes, oldRelationship.notes)
                    if (!comparison.changed) {
                      return (
                        <>
                          <Separator />
                          {renderUnchangedField('Notes', comparison.newValue)}
                        </>
                      )
                    }
                    return null
                  })()}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Not Set Fields - Collapsible Section for Insert Mode */}
      {isInsertMode && (
        <Card>
          <Collapsible open={isUnchangedExpanded} onOpenChange={setIsUnchangedExpanded}>
            <CollapsibleTrigger asChild>
              <CardHeader className="gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                    <Users className="gba:h-5 gba:w-5" />
                    All Other Fields
                    <Badge variant="secondary" className="gba:ml-2">
                      Not Set
                    </Badge>
                  </CardTitle>
                  <ChevronDown
                    className={`gba:h-5 gba:w-5 gba:transition-transform ${
                      isUnchangedExpanded ? 'gba:rotate-180' : ''
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="gba:space-y-4 gba:pt-0">
                {/* Contact Information - show if not set */}
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                  {(!newRelationship.phoneNumber || newRelationship.phoneNumber === 'N/A') &&
                    renderUnchangedField('Phone Number', 'Not set', <Phone className="gba:h-4 gba:w-4" />)}

                  {(!newRelationship.email || newRelationship.email === 'N/A') &&
                    renderUnchangedField('Email', 'Not set', <Mail className="gba:h-4 gba:w-4" />)}
                </div>

                <Separator />

                {/* Emergency Contact - show if not set */}
                {!newRelationship.emergencyContact &&
                  renderUnchangedField('Emergency Contact', 'Not set', <Shield className="gba:h-4 gba:w-4" />)}

                {/* Notes - show if not set */}
                {!newRelationship.notes && (
                  <>
                    <Separator />
                    {renderUnchangedField('Notes', 'Not set')}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </TaskFormLayout>
  )
}

const ChangeRelationshipReview: React.FC<ChangeRelationshipReviewProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing
  const fallbackAdditionalData = additionalData || {
    psi_taskPayload: {
      employeeRelationship: {},
      oldEmployeeRelationship: {}
    }
  }

  return (
    <div className="gba:h-full" data-testid="change-relationship-review-wrapper">
      <ChangeRelationshipReviewContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ChangeRelationshipReview
