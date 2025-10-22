import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { SalesTaskFormValues, EntityOption, SalesTaskContextState } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesTaskTypes } from '../hooks/useSalesTaskTypes'
import { useSalesTaskPriorities } from '../hooks/useSalesTaskPriorities'
import { useSalesTaskStatuses } from '../hooks/useSalesTaskStatuses'
import { useSalesTaskEmployees } from '../hooks/useSalesTaskEmployees'
import { useSalesTaskEntities } from '../hooks/useSalesTaskEntities'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useFileClient } from '@/common/network/files/useFileClient'
import dayjs from 'dayjs'

interface SalesTaskFormContextValue extends SalesTaskContextState {
  formValues: SalesTaskFormValues
  setFormValues: (updates: Partial<SalesTaskFormValues>) => void
  onSubmit: (values: SalesTaskFormValues) => Promise<void>
  onCancel: () => Promise<void>

  // Data fetching
  taskTypesLoading: boolean
  prioritiesLoading: boolean
  statusesLoading: boolean
  employeesLoading: boolean
  entitiesLoading: boolean

  // Search functions
  searchTaskTypes: (search: string) => void
  searchPriorities: (search: string) => void
  searchStatuses: (search: string) => void
  searchEmployees: (search: string) => void
  searchEntities: (search: string) => void

  // Entity selection
  setSelectedEntity: (entity: EntityOption | null) => void

  // File management
  setFileList: (files: any[]) => void
  uploadFiles: (files: File[], entityId: string) => Promise<Array<{ name: string; fileInfo: any }>>

  // Business app context
  businessAppContext: BusinessAppContextProps
}

const SalesTaskFormContext = createContext<SalesTaskFormContextValue | null>(null)

interface SalesTaskFormProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<SalesTaskFormValues>
  onSubmit?: (values: SalesTaskFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  taskData?: any
}

export const SalesTaskFormProvider: React.FC<SalesTaskFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  taskData
}) => {
  const { accessToken, additionalData } = businessAppContext

  // File upload client
  const fileClient = useFileClient(businessAppContext)

  // Check for update mode based on taskId in additional data
  const taskId = additionalData?.taskId
  const isUpdateMode = !!taskId

  // Customer tasks hook for fetching task data
  const { fetchCustomerTaskById } = useCustomerTasks(businessAppContext)

  // State for fetched task data
  const [fetchedTaskData, setFetchedTaskData] = useState<any>(null)
  const [fetchingTask, setFetchingTask] = useState(false)

  // Get task data from multiple sources (prioritize fetched data for update mode)
  const actualTaskData =
    fetchedTaskData ||
    taskData ||
    additionalData?.taskData ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.taskData

  // Search states
  const [typeSearch, setTypeSearch] = useState('')
  const [prioritySearch, setPrioritySearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  // Check if typeRef is pre-filled from process payload (for approval requests)
  const processTypeRef =
    additionalData?.psi_taskPayload?.psi_initialParameters?.typeRef ||
    additionalData?.typeRef ||
    initialValues?.taskTypeRef ||
    ''

  // Form state
  const [formValues, setFormValuesState] = useState<SalesTaskFormValues>({
    title: '',
    code: '',
    taskTypeRef: processTypeRef,
    priorityRef: '',
    statusRef: 'SalesTaskStatus:v1:PENDING', // Default to "pending" status
    deadline: null,
    templateStartDate: null,
    startDate: null,
    endDate: null,
    description: '',
    assignedEmployeeId: '',
    creatorEmployeeId: businessAppContext.userInfo?.employeeDetails?.employeeId,
    creatorUserId: businessAppContext.userInfo?.id,
    relatedEntityId: '',
    relatedEntityType: '',
    files: [],
    documents: [],
    _pendingFiles: [],
    additionalProperties: {},
    ...initialValues
  })

  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null)
  const [fileList, setFileList] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Data hooks
  const { data: taskTypes, loading: taskTypesLoading } = useSalesTaskTypes(accessToken, { search: typeSearch })
  const { data: priorities, loading: prioritiesLoading } = useSalesTaskPriorities(accessToken, {
    search: prioritySearch
  })
  const { statuses, isLoading: statusesLoading } = useSalesTaskStatuses({ accessToken })
  // Preload a generous list by default so Update forms have employees ready for selection
  const { data: employees, loading: employeesLoading } = useSalesTaskEmployees(accessToken, {
    search: employeeSearch,
    limit: employeeSearch ? 50 : 150
  })
  const { entities, loading: entitiesLoading, searchEntities } = useSalesTaskEntities(accessToken)

  // Fetch task data when in update mode
  useEffect(() => {
    if (isUpdateMode && taskId && !fetchedTaskData && !fetchingTask) {
      setFetchingTask(true)
      fetchCustomerTaskById(taskId)
        .then(taskData => {
          if (taskData) {
            setFetchedTaskData(taskData)
          } else {
            setError('Task not found')
          }
        })
        .catch(error => {
          console.error('Error fetching task data for taskId:', taskId, error)
          setError('Failed to load task data')
        })
        .finally(() => {
          setFetchingTask(false)
        })
    }
  }, [isUpdateMode, taskId, fetchedTaskData, fetchingTask, fetchCustomerTaskById])

  // Check if entity search should be shown
  const hasEntityId = !!(
    additionalData?.leadId ||
    additionalData?.contactId ||
    additionalData?.accountId ||
    additionalData?.opportunityId
  )
  const showEntitySearch = !hasEntityId && !isUpdateMode

  // Initialize form values with entity data from additional context
  useEffect(() => {
    if (additionalData && !isUpdateMode) {
      const updates: Partial<SalesTaskFormValues> = {}

      if (additionalData.leadId) {
        updates.relatedEntityId = additionalData.leadId
        updates.relatedEntityType = 'lead'
      } else if (additionalData.contactId) {
        updates.relatedEntityId = additionalData.contactId
        updates.relatedEntityType = 'contact'
      } else if (additionalData.accountId) {
        updates.relatedEntityId = additionalData.accountId
        updates.relatedEntityType = 'account'
      } else if (additionalData.opportunityId) {
        updates.relatedEntityId = additionalData.opportunityId
        updates.relatedEntityType = 'opportunity'
      }

      if (Object.keys(updates).length > 0) {
        setFormValuesState(prev => ({ ...prev, ...updates }))
      }
    }
  }, [additionalData, isUpdateMode])

  // Map options for selectors
  const mappedTaskTypes = useMemo(
    () =>
      (taskTypes || []).map((entry: any) => ({
        id: entry.id,
        value: entry.id,
        label: entry.value
      })),
    [taskTypes]
  )

  const mappedPriorities = useMemo(
    () =>
      (priorities || []).map((entry: any) => ({
        id: entry.id,
        value: entry.id,
        label: entry.value
      })),
    [priorities]
  )

  const mappedEmployees = useMemo(() => {
    const options = (employees || []).map((employee: any) => ({
      id: employee.id,
      value: employee.id,
      label: employee.displayName,
      extraInfo: {
        displayName: employee.displayName,
        firstName: employee.firstName,
        lastName: employee.lastName,
        userId: employee.userId
      }
    }))

    // In UPDATE mode, ensure assigned employee is in the options
    if (isUpdateMode && actualTaskData?.assignedEmployee && actualTaskData.assignedEmployeeId) {
      const assignedEmployeeExists = options.some(opt => opt.value === actualTaskData.assignedEmployeeId)
      if (!assignedEmployeeExists) {
        options.unshift({
          id: actualTaskData.assignedEmployeeId,
          value: actualTaskData.assignedEmployeeId,
          label:
            actualTaskData.assignedEmployee.displayName ||
            `${actualTaskData.assignedEmployee.firstName || ''} ${actualTaskData.assignedEmployee.lastName || ''}`.trim() ||
            'Unknown Employee',
          extraInfo: {
            displayName: actualTaskData.assignedEmployee.displayName,
            firstName: actualTaskData.assignedEmployee.firstName,
            lastName: actualTaskData.assignedEmployee.lastName,
            userId: actualTaskData.assignedEmployee.userId
          }
        })
      }
    }

    return options
  }, [employees, isUpdateMode, actualTaskData])

  // Populate form with existing task data in UPDATE mode
  useEffect(() => {
    if (isUpdateMode && actualTaskData) {
      const assignedId = actualTaskData.assignedEmployeeId || actualTaskData.assignedEmployee?.id || ''
      // Robust deadline mapping: support multiple possible fields and validate date
      const taskDataRecord = actualTaskData as Record<string, unknown>
      const rawDeadline =
        actualTaskData.dueDate ||
        taskDataRecord.deadline ||
        taskDataRecord.dueDateTime ||
        taskDataRecord.scheduledAt ||
        null
      const formattedDeadline =
        rawDeadline && dayjs(rawDeadline).isValid() ? dayjs(rawDeadline).format('YYYY-MM-DDTHH:mm') : null

      const updateValues: Partial<SalesTaskFormValues> = {
        title: actualTaskData.name || '',
        code: actualTaskData.code || '',
        taskTypeRef: actualTaskData.typeRef || '',
        priorityRef: actualTaskData.priorityRef || '',
        statusRef: actualTaskData.statusRef || 'SalesTaskStatus:v1:PENDING',
        timingType: (actualTaskData.timingType as 'DEADLINE' | 'SCHEDULED') || 'DEADLINE',
        deadline: formattedDeadline,
        templateStartDate:
          actualTaskData.templateStartDate && dayjs(actualTaskData.templateStartDate).isValid()
            ? dayjs(actualTaskData.templateStartDate).format('YYYY-MM-DDTHH:mm')
            : null,
        startDate:
          actualTaskData.startDate && dayjs(actualTaskData.startDate).isValid()
            ? dayjs(actualTaskData.startDate).format('YYYY-MM-DDTHH:mm')
            : null,
        endDate:
          actualTaskData.endDate && dayjs(actualTaskData.endDate).isValid()
            ? dayjs(actualTaskData.endDate).format('YYYY-MM-DDTHH:mm')
            : null,
        description: actualTaskData.description || '',
        assignedEmployeeId: assignedId,
        id: actualTaskData.id,
        version: actualTaskData.version || 0,
        additionalProperties: actualTaskData.additionalProperties || {},
        documents:
          actualTaskData.customerDocument?.map((doc: any) => ({
            id: doc.id,
            name: doc.name || '',
            version: doc.version
          })) || []
      }

      // Preserve existing entity relationship
      if (actualTaskData.account) {
        updateValues.relatedEntityId = actualTaskData.account.id || actualTaskData.account
        updateValues.relatedEntityType = 'account'
        setSelectedEntity({
          id: actualTaskData.account.id || actualTaskData.account,
          name: actualTaskData.account.name || 'Account',
          type: 'account'
        })
      } else if (actualTaskData.contact) {
        updateValues.relatedEntityId = actualTaskData.contact.id || actualTaskData.contact
        updateValues.relatedEntityType = 'contact'
        setSelectedEntity({
          id: actualTaskData.contact.id || actualTaskData.contact,
          name:
            `${actualTaskData.contact.firstName || ''} ${actualTaskData.contact.lastName || ''}`.trim() || 'Contact',
          type: 'contact'
        })
      } else if (actualTaskData.lead) {
        updateValues.relatedEntityId = actualTaskData.lead.id || actualTaskData.lead
        updateValues.relatedEntityType = 'lead'
        setSelectedEntity({
          id: actualTaskData.lead.id || actualTaskData.lead,
          name:
            `${actualTaskData.lead.firstName || ''} ${actualTaskData.lead.lastName || ''}`.trim() ||
            actualTaskData.lead.companyName ||
            'Lead',
          type: 'lead'
        })
      } else if (actualTaskData.opportunity) {
        updateValues.relatedEntityId = actualTaskData.opportunity.id || actualTaskData.opportunity
        updateValues.relatedEntityType = 'opportunity'
        setSelectedEntity({
          id: actualTaskData.opportunity.id || actualTaskData.opportunity,
          name: actualTaskData.opportunity.name || 'Opportunity',
          type: 'opportunity'
        })
      }

      setFormValuesState(prev => ({ ...prev, ...updateValues }))
    }
  }, [isUpdateMode, actualTaskData, mappedTaskTypes, mappedPriorities, mappedEmployees])

  // Helper to update form values
  const setFormValues = useCallback((updates: Partial<SalesTaskFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }))
  }, [])

  // Upload files to storage and return document metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/tasks/${entityId}/documents`

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'customerRelations',
            folderPath: folderPath,
            mimeType: file.type
          }
        )

        return {
          name: file.name,
          fileInfo: result.fileInfo // Pass entire fileInfo JSON
        }
      })

      return await Promise.all(uploadPromises)
    },
    [fileClient]
  )

  const contextValue: SalesTaskFormContextValue = useMemo(
    () => ({
      // State
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      isLoading: fetchingTask,
      error,
      isUpdateMode,

      // Data
      taskTypes: mappedTaskTypes,
      priorities: mappedPriorities,
      statuses,
      employees: mappedEmployees,
      entities,
      selectedEntity,
      fileList,
      showEntitySearch,

      // Loading states
      taskTypesLoading,
      prioritiesLoading,
      statusesLoading,
      employeesLoading,
      entitiesLoading,

      // Search functions
      searchTaskTypes: setTypeSearch,
      searchPriorities: setPrioritySearch,
      searchStatuses: () => {}, // Statuses don't need search
      searchEmployees: setEmployeeSearch,
      searchEntities,

      // Entity management
      setSelectedEntity,

      // File management
      setFileList,
      uploadFiles,

      // Context
      businessAppContext
    }),
    [
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      fetchingTask,
      error,
      isUpdateMode,
      mappedTaskTypes,
      mappedPriorities,
      statuses,
      mappedEmployees,
      entities,
      selectedEntity,
      fileList,
      showEntitySearch,
      taskTypesLoading,
      prioritiesLoading,
      statusesLoading,
      employeesLoading,
      entitiesLoading,
      searchEntities,
      uploadFiles,
      businessAppContext
    ]
  )

  return <SalesTaskFormContext.Provider value={contextValue}>{children}</SalesTaskFormContext.Provider>
}

export const useSalesTaskFormContext = (): SalesTaskFormContextValue => {
  const context = useContext(SalesTaskFormContext)
  if (!context) {
    throw new Error('useSalesTaskFormContext must be used within a SalesTaskFormProvider')
  }
  return context
}
