import React, { useState, useEffect, useCallback } from 'react'
import { message, DatePicker, Input } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertDescription,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { PiCalendarDuotone, PiClock, PiUser, PiCheckCircle, PiWarningCircle, PiNotePencil } from 'react-icons/pi'
import { Send } from 'lucide-react'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { getModuleInfo } from '../../utils/moduleIcons'
import dayjs, { Dayjs } from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { getInitials } from '../../utils/avatarUtils'
import { useSubstituteEmployeeSearch } from '../../hooks/useSubstituteEmployeeSearch'
import { SearchableEmployeeCombobox } from '@/business-apps/flow/common/components/flow-quick-task/SearchableEmployeeCombobox'

const { TextArea } = Input

interface EnterEmployeeVacationDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

export const EnterEmployeeVacationDetails: React.FC<EnterEmployeeVacationDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  userInfo,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedType, setSelectedType] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [selectedSubstitute, setSelectedSubstitute] = useState('')
  const [comment, setComment] = useState('')

  // Data loading state
  const [absenceTypes, setAbsenceTypes] = useState<CatalogEntry[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [fetchedAbsence, setFetchedAbsence] = useState<any>(null)
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false)

  // Substitute employee search with teammates first
  const substituteEmployeeSearch = useSubstituteEmployeeSearch({
    accessToken,
    currentUserId: userInfo?.id
  })

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {},
    onError: () => {}
  })

  const employeeId = taskDetails?.parameters?.employeeId || task.sourceMetadata?.inputs?.employeeId
  const absenceType = taskDetails?.parameters?.absenceType || task.sourceMetadata?.inputs?.absenceType
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  // For completed tasks, data is in results. For pending tasks, it might be in parameters or results
  const absence = taskDetails?.results?.employeeAbsence || taskDetails?.parameters?.employeeAbsence

  console.log('🔍 Task Details:', taskDetails)
  console.log('📝 Absence data from task:', absence)
  console.log('📝 Fetched absence from DB:', fetchedAbsence)
  console.log('✅ Task status:', task.status)
  console.log('🔄 Fetching from DB:', isFetchingFromDb)
  console.log('📋 Absence Type:', absenceType)

  // Check if there's already data (view mode) or if we need to enter data (edit mode)
  // Use fetched absence if available, otherwise use absence from task details
  const actualAbsence = fetchedAbsence || absence
  const hasExistingData = !!actualAbsence && (actualAbsence.startDate || actualAbsence.endDate)

  // GraphQL and Catalog clients
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  // Fetch employee details for avatar and display name
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: employeeId,
    costCenterId: undefined,
    projectId: undefined,
    accessToken
  })

  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  // Fetch vacation absence types from catalog
  const fetchAbsenceTypes = useCallback(async () => {
    setIsLoadingTypes(true)
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AbsenceType',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true
        }
      )

      if (response?.data) {
        // Filter for vacation types (parent: AbsenceType:v1:A001)
        const parentId = 'AbsenceType:v1:A001'
        const vacationTypes = response.data.filter((entry: CatalogEntry) => entry.parentEntryId === parentId)

        console.log('📋 Fetched absence types:', response.data)
        console.log('📋 Vacation types filtered:', vacationTypes)

        // If no types found with filter, show all types as fallback
        if (vacationTypes.length === 0) {
          setAbsenceTypes(response.data)
        } else {
          setAbsenceTypes(vacationTypes)
        }

        // Auto-select the first vacation type if none is selected
        if (!selectedType && vacationTypes.length > 0) {
          setSelectedType(vacationTypes[0].id)
        }
      }
    } catch (err) {
      console.error('Error loading absence types:', err)
      message.error('Failed to load absence types')
    } finally {
      setIsLoadingTypes(false)
    }
  }, [catalogClient, userLocale, selectedType])

  // Fetch absence from database for completed tasks
  const fetchAbsenceFromDatabase = useCallback(async () => {
    if (!employeeId || !absenceType || task.status !== 'COMPLETED') {
      return
    }

    setIsFetchingFromDb(true)
    try {
      // Query to get the most recent vacation for this employee with the specific absence type
      const query = `
        query GetEmployeeAbsence($employeeId: uuid!, $absenceType: String!) {
          EmployeeAbsence(
            where: {
              employeeId: { _eq: $employeeId }
              typeRef: { _eq: $absenceType }
            }
            orderBy: [{ createdAt: DESC }]
            limit: 1
          ) {
            id
            employeeId
            typeRef
            startDate
            endDate
            description
            status
            createdAt
          }
        }
      `

      const result = await graphqlClient.request(query, { employeeId, absenceType })

      console.log('📊 Fetched vacation from database:', result?.EmployeeAbsence?.[0])

      if (result?.EmployeeAbsence && result.EmployeeAbsence.length > 0) {
        setFetchedAbsence(result.EmployeeAbsence[0])
      } else {
        console.log('⚠️ No vacation records found for employee:', employeeId, 'with type:', absenceType)
      }
    } catch (err) {
      console.error('❌ Error fetching vacation from database:', err)
    } finally {
      setIsFetchingFromDb(false)
    }
  }, [graphqlClient, employeeId, absenceType, task.status])

  // Load data on mount
  useEffect(() => {
    fetchAbsenceTypes()
    // For completed tasks, try to fetch the absence from the database
    if (task.status === 'COMPLETED' && !absence) {
      fetchAbsenceFromDatabase()
    }
  }, [fetchAbsenceTypes, fetchAbsenceFromDatabase, task.status, absence])

  // Initialize form with existing data if available
  useEffect(() => {
    if (hasExistingData && actualAbsence) {
      if (actualAbsence.typeRef) {
        setSelectedType(actualAbsence.typeRef)
      }
      if (actualAbsence.startDate) {
        setStartDate(dayjs(actualAbsence.startDate))
      }
      if (actualAbsence.endDate) {
        setEndDate(dayjs(actualAbsence.endDate))
      }
      if (actualAbsence.substituteEmployeeId) {
        setSelectedSubstitute(actualAbsence.substituteEmployeeId)
      } else if (actualAbsence.substituteEmployee) {
        // Fallback for data from task details which might have the full object
        setSelectedSubstitute(actualAbsence.substituteEmployee)
      }
      if (actualAbsence.description) {
        setComment(actualAbsence.description)
      }
    }
  }, [hasExistingData, actualAbsence])

  // Initialize type from task parameters if available
  useEffect(() => {
    if (absenceType && !selectedType) {
      setSelectedType(absenceType)
    }
  }, [absenceType, selectedType])

  const handleSubmit = async () => {
    // Validation
    if (!selectedType) {
      message.error('Please select an absence type')
      return
    }
    if (!startDate) {
      message.error('Please select a start date')
      return
    }
    if (!endDate) {
      message.error('Please select an end date')
      return
    }
    if (endDate.isBefore(startDate)) {
      message.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: any = {
        event: 'pse_submit',
        employeeAbsence: {
          employeeId: employeeId,
          typeRef: selectedType,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          substituteEmployee: selectedSubstitute || undefined,
          description: comment || undefined,
          status: 'PENDING'
        }
      }

      await continueProcess({
        domain: 'employee-time',
        processName: 'createEmployeeVacation',
        payload
      })

      message.success({
        content: 'Vacation entered successfully',
        duration: 3
      })

      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit'
      message.error({
        content: `Failed to submit: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCompleted = task.status === 'COMPLETED'

  return (
    <div className="gba:space-y-6" data-testid="enter-vacation-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <PiCalendarDuotone className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="enter-vacation-title">
              {task.referenceTaskName || 'Enter Employee Vacation'}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="task-code">
            Code: {task.sourceMetadata?.inputs?.TaskName || task.name}
          </p>
        </div>
        <Badge variant={isCompleted ? 'success' : 'warning'} data-testid="task-status-badge">
          {isCompleted ? 'Completed' : task.assignment?.currentStatus || 'Open'}
        </Badge>
      </div>

      <Separator />

      {/* Employee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Employee Details
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
                  {(() => {
                    const name = entities.employee?.displayName || creatorName
                    const parts = name.split(' ')
                    return getInitials(parts[0], parts[1])
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:font-medium">{entities.employee?.displayName || creatorName}</p>
                <p className="gba:text-sm gba:text-muted-foreground">Employee</p>
              </div>
            </div>
          )}

          {employeeId && (
            <>
              <Separator />
              <div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Employee ID</p>
                <p className="gba:text-sm gba:font-mono gba:text-foreground">{employeeId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <PiCheckCircle className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            Task Information
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Created By</p>
            <p className="gba:text-sm gba:font-medium">{creatorName}</p>
          </div>

          {task.createdAt && (
            <>
              <Separator />
              <div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Created At</p>
                <p className="gba:text-sm gba:font-medium">
                  {new Date(task.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </>
          )}

          {task.assignment?.assigneeNames && task.assignment.assigneeNames.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Assigned To</p>
                <div className="gba:flex gba:flex-wrap gba:gap-1">
                  {task.assignment.assigneeNames.map((assignee, index) => (
                    <Badge key={index} variant="secondary" className="gba:text-xs">
                      {assignee}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Vacation Form - Show loading, completed message, or form based on state */}
      {isFetchingFromDb ? (
        /* Loading data from database */
        <Card>
          <CardContent className="gba:py-8">
            <div className="gba:text-center gba:space-y-2">
              <PiClock className="gba:h-12 gba:w-12 gba:mx-auto gba:text-primary gba:animate-spin" />
              <p className="gba:text-base gba:font-medium">Loading vacation details...</p>
            </div>
          </CardContent>
        </Card>
      ) : isCompleted && !hasExistingData ? (
        /* Completed task with no data available (after fetching from DB) */
        <Card>
          <CardContent className="gba:py-8">
            <div className="gba:text-center gba:space-y-2">
              <PiCheckCircle className="gba:h-12 gba:w-12 gba:mx-auto gba:text-success" />
              <p className="gba:text-base gba:font-medium">Task Completed</p>
              <p className="gba:text-sm gba:text-muted-foreground">
                This vacation entry has been completed, but the details are not available in the task data.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Vacation Form - Show for both pending (editable) and completed (read-only) tasks */
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              {isCompleted ? (
                <PiCheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
              ) : (
                <PiNotePencil className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              )}
              {isCompleted
                ? 'Vacation Details (Completed)'
                : hasExistingData
                  ? 'Edit Vacation Details'
                  : 'Enter Vacation Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {/* Type Dropdown - Always disabled and pre-selected with Vacation */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">
                Type <span className="gba:text-destructive">*</span>
              </Label>
              {isLoadingTypes ? (
                <div className="gba:h-10 gba:w-full gba:bg-muted gba:rounded gba:animate-pulse" />
              ) : (
                <Select value={selectedType} onValueChange={setSelectedType} disabled={true}>
                  <SelectTrigger className="gba:w-full" data-testid="type-dropdown">
                    <SelectValue placeholder="Vacation" />
                  </SelectTrigger>
                  <SelectContent>
                    {absenceTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Start Date */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">
                Start Date <span className="gba:text-destructive">*</span>
              </Label>
              <DatePicker
                value={startDate}
                onChange={date => setStartDate(date)}
                format="DD/MM/YYYY"
                className="gba:w-full [&_input]:!gba:text-foreground [&_input]:!gba:bg-background [&_.ant-picker-input>input[disabled]]:!gba:text-foreground [&_.ant-picker-input>input[disabled]]:!gba:bg-background"
                placeholder="Select Start Date"
                data-testid="start-date-picker"
                disabled={isCompleted}
              />
            </div>

            {/* End Date */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">
                End Date <span className="gba:text-destructive">*</span>
              </Label>
              <DatePicker
                value={endDate}
                onChange={date => setEndDate(date)}
                format="DD/MM/YYYY"
                className="gba:w-full [&_input]:!gba:text-foreground [&_input]:!gba:bg-background [&_.ant-picker-input>input[disabled]]:!gba:text-foreground [&_.ant-picker-input>input[disabled]]:!gba:bg-background"
                placeholder="Select End Date"
                data-testid="end-date-picker"
                disabled={isCompleted}
              />
            </div>

            {/* Substitute Employee Search */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">Substitute</Label>
              <div
                style={{
                  backgroundColor: 'var(--muted)',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--input)'
                }}
              >
                <SearchableEmployeeCombobox
                  options={substituteEmployeeSearch.employees.map(emp => ({
                    value: emp.id,
                    label: `${emp.firstName} ${emp.lastName}`,
                    displayName: emp.displayName,
                    avatar: emp.pictureThumbnail
                  }))}
                  value={selectedSubstitute}
                  onValueChange={value => setSelectedSubstitute(typeof value === 'string' ? value : '')}
                  onSearchChange={substituteEmployeeSearch.searchEmployees}
                  placeholder="Select substitute..."
                  searchPlaceholder="Search employees..."
                  emptyText="No employees found"
                  loading={substituteEmployeeSearch.loading}
                  disabled={isCompleted}
                  showTeammatesHint={true}
                  className="!gba:bg-transparent !gba:border-transparent hover:!gba:bg-accent/10 [&>span]:!gba:text-muted-foreground [&>span:not(.gba\\:text-muted-foreground)]:!gba:text-foreground"
                  data-testid="substitute-employee-search"
                />
              </div>
            </div>

            {/* Comment */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">Comment</Label>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment (optional)"
                rows={3}
                maxLength={500}
                data-testid="comment-textarea"
                className="gba:resize-none"
                disabled={isCompleted}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card - Only show for non-completed tasks */}
      {!isCompleted && (
        <Card className="gba:bg-info-secondary gba:border-info">
          <CardContent className="gba:pt-6">
            <div className="gba:flex gba:items-start gba:gap-3">
              <PiWarningCircle className="gba:h-5 gba:w-5 gba:text-info gba:mt-0.5" />
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {hasExistingData ? 'Review and Submit' : 'Complete Vacation Entry'}
                </p>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  {hasExistingData
                    ? 'Review the vacation details above. You can edit if needed, then submit to complete this task.'
                    : 'Please enter the vacation period and any additional details for the employee.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!isCompleted && (
        <div
          className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="cancel-button">
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="submit-button"
            className="gba:min-w-[140px]"
          >
            {isSubmitting ? (
              <PiClock className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
            ) : (
              <Send className="gba:mr-2 gba:h-4 gba:w-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit Entry'}
          </Button>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <Alert>
          <PiCheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
          <AlertDescription>This vacation entry has been completed.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
