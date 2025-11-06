import React, { useState, useEffect, useCallback } from 'react'
import { message, DatePicker } from 'antd'
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
  SelectItem,
  Textarea
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

interface EnterSickLeaveDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

export const EnterSickLeaveDetails: React.FC<EnterSickLeaveDetailsProps> = ({
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
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  // For completed tasks, data is in results. For pending tasks, it might be in parameters or results
  const absence = taskDetails?.results?.employeeAbsence || taskDetails?.parameters?.employeeAbsence

  // State for fetched absence data from database
  const [fetchedAbsence, setFetchedAbsence] = useState<any>(null)
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false)

  console.log('🔍 Task Details:', taskDetails)
  console.log('📝 Absence data from task:', absence)
  console.log('📝 Fetched absence from DB:', fetchedAbsence)
  console.log('✅ Task status:', task.status)
  console.log('🔄 Fetching from DB:', isFetchingFromDb)

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

  // Fetch sick leave absence types (children of AbsenceType:v1:A021)
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

      console.log('📋 Fetched absence types:', response?.data)

      if (response?.data) {
        // For completed tasks, show ALL absence types so we can display any type (vacation, sick leave, etc.)
        // For new/active tasks, filter for sick leave types only
        if (task.status === 'COMPLETED') {
          console.log('✅ Completed task - showing all absence types for display')
          setAbsenceTypes(response.data)
        } else {
          // The parent ID for sick leave group
          const parentId = 'AbsenceType:v1:A021'

          // First, try to find if parentId itself is in the data
          const parentEntry = response.data.find((entry: CatalogEntry) => entry.id === parentId)

          console.log('🔍 Looking for parent:', parentId, 'Found:', parentEntry)

          // Filter for sick leave types (children of the parent)
          // Use the parent's parentEntryId if it exists, otherwise use the parentId
          const targetParentId = parentEntry?.parentEntryId || parentId

          const sickLeaveTypes = response.data.filter((entry: CatalogEntry) => entry.parentEntryId === targetParentId)

          console.log('✅ Filtered sick leave types:', sickLeaveTypes.length, sickLeaveTypes)

          // If no types found with filter, show all types as fallback
          if (sickLeaveTypes.length === 0) {
            console.warn('⚠️ No sick leave types found with parent:', targetParentId, '- showing all types')
            setAbsenceTypes(response.data)
          } else {
            setAbsenceTypes(sickLeaveTypes)
          }
        }
      }
    } catch (err) {
      console.error('❌ Error loading absence types:', err)
      message.error('Failed to load absence types')
    } finally {
      setIsLoadingTypes(false)
    }
  }, [catalogClient, userLocale])

  // Fetch absence from database for completed tasks
  const fetchAbsenceFromDatabase = useCallback(async () => {
    if (!employeeId || task.status !== 'COMPLETED') {
      return
    }

    setIsFetchingFromDb(true)
    try {
      // Query to get the most recent absence for this employee
      // First, try without type filter to see if ANY absences exist
      const query = `
        query GetEmployeeAbsence($employeeId: uuid!) {
          EmployeeAbsence(
            where: {
              employeeId: { _eq: $employeeId }
            }
            orderBy: [{ createdAt: DESC }]
            limit: 5
          ) {
            id
            employeeId
            typeRef
            startDate
            endDate
            substituteEmployeeId
            description
            status
            createdAt
          }
        }
      `

      const result = await graphqlClient.request(query, { employeeId })

      console.log('📊 Fetched absences from database (all types):', result?.EmployeeAbsence)
      console.log('📊 Employee ID queried:', employeeId)

      if (result?.EmployeeAbsence && result.EmployeeAbsence.length > 0) {
        // Try to find a sick leave type first
        const sickLeave = result.EmployeeAbsence.find(
          (absence: any) => absence.typeRef?.includes('A021') || absence.typeRef?.toLowerCase().includes('sick')
        )

        if (sickLeave) {
          console.log('✅ Found sick leave record:', sickLeave)
          setFetchedAbsence(sickLeave)
        } else {
          console.log('⚠️ Found absences but none are sick leave type. Using most recent:', result.EmployeeAbsence[0])
          setFetchedAbsence(result.EmployeeAbsence[0])
        }
      } else {
        console.log('⚠️ No absence records found at all for employee:', employeeId)
      }
    } catch (err) {
      console.error('❌ Error fetching absence from database:', err)
    } finally {
      setIsFetchingFromDb(false)
    }
  }, [graphqlClient, employeeId, task.status])

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
        processName: 'createEmployeeSickLeave',
        payload
      })

      message.success({
        content: 'Sick leave entered successfully',
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
    <div className="gba:space-y-6" data-testid="enter-sick-leave-details">
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
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="enter-sick-leave-title">
              {task.referenceTaskName || 'Enter Sick Leave'}
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

      {/* Sick Leave Form - Show loading, completed message, or form based on state */}
      {isFetchingFromDb ? (
        /* Loading data from database */
        <Card>
          <CardContent className="gba:py-8">
            <div className="gba:text-center gba:space-y-2">
              <PiClock className="gba:h-12 gba:w-12 gba:mx-auto gba:text-primary gba:animate-spin" />
              <p className="gba:text-base gba:font-medium">Loading sick leave details...</p>
            </div>
          </CardContent>
        </Card>
      ) : task.status === 'COMPLETED' && !hasExistingData ? (
        /* Completed task with no data available (after fetching from DB) */
        <Card>
          <CardContent className="gba:py-8">
            <div className="gba:text-center gba:space-y-2">
              <PiCheckCircle className="gba:h-12 gba:w-12 gba:mx-auto gba:text-success" />
              <p className="gba:text-base gba:font-medium">Task Completed</p>
              <p className="gba:text-sm gba:text-muted-foreground">
                This sick leave entry has been completed, but the details are not available in the task data.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Sick Leave Form - Show for both pending (editable) and completed (read-only) tasks */
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              {task.status === 'COMPLETED' ? (
                <PiCheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
              ) : (
                <PiNotePencil className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              )}
              {task.status === 'COMPLETED'
                ? 'Sick Leave Details (Completed)'
                : hasExistingData
                  ? 'Edit Sick Leave Details'
                  : 'Enter Sick Leave Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {/* Type Dropdown */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">
                Type <span className="gba:text-destructive">*</span>
              </Label>
              {isLoadingTypes ? (
                <div className="gba:h-10 gba:w-full gba:bg-muted gba:rounded gba:animate-pulse" />
              ) : task.status === 'COMPLETED' ? (
                /* For completed tasks, show the actual type value as text */
                <div className="gba:h-10 gba:w-full gba:px-3 gba:py-2 gba:border gba:border-input gba:bg-muted gba:rounded-md gba:flex gba:items-center gba:text-sm">
                  {(() => {
                    console.log('🔍 Looking for type:', selectedType, 'in', absenceTypes.length, 'types')
                    console.log(
                      '📋 Available types:',
                      absenceTypes.map(t => ({ id: t.id, value: t.value }))
                    )

                    // Find the type in absenceTypes array
                    const typeEntry = absenceTypes.find(t => t.id === selectedType)

                    console.log('✅ Found type entry:', typeEntry)

                    return typeEntry?.value || selectedType || 'N/A'
                  })()}
                </div>
              ) : (
                <Select value={selectedType} onValueChange={setSelectedType} disabled={hasExistingData}>
                  <SelectTrigger className="gba:w-full" data-testid="type-dropdown">
                    <SelectValue placeholder="Select a type" />
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
                disabled={task.status === 'COMPLETED'}
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
                disabled={task.status === 'COMPLETED'}
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
                  disabled={task.status === 'COMPLETED'}
                  showTeammatesHint={true}
                  className="!gba:bg-transparent !gba:border-transparent hover:!gba:bg-accent/10 [&>span]:!gba:text-muted-foreground [&>span:not(.gba\\:text-muted-foreground)]:!gba:text-foreground"
                  data-testid="substitute-employee-search"
                />
              </div>
            </div>

            {/* Comment */}
            <div>
              <Label className="gba:mb-2 gba:block gba:text-sm gba:font-medium">Comment</Label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment (optional)"
                rows={3}
                maxLength={500}
                data-testid="comment-textarea"
                className="gba:resize-none"
                disabled={task.status === 'COMPLETED'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card - Only show for non-completed tasks */}
      {task.status !== 'COMPLETED' && (
        <Card className="gba:bg-info-secondary gba:border-info">
          <CardContent className="gba:pt-6">
            <div className="gba:flex gba:items-start gba:gap-3">
              <PiWarningCircle className="gba:h-5 gba:w-5 gba:text-info gba:mt-0.5" />
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {hasExistingData ? 'Review and Submit' : 'Complete Sick Leave Entry'}
                </p>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  {hasExistingData
                    ? 'Review the sick leave details above. You can edit if needed, then submit to complete this task.'
                    : 'Please enter the sick leave type, period, and any additional details for the employee.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {task.status !== 'COMPLETED' && (
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
            disabled={isSubmitting || isLoadingTypes || substituteEmployeeSearch.loading}
            data-testid="submit-button"
            className="gba:min-w-[140px]"
          >
            {isSubmitting ? (
              <PiClock className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
            ) : (
              <Send className="gba:mr-2 gba:h-4 gba:w-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      )}

      {/* Completed State */}
      {task.status === 'COMPLETED' && (
        <Alert>
          <PiCheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
          <AlertDescription>This sick leave entry has been completed.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
