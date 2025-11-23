import React, { useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, taskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { type CustomerTask, buildCustomerTaskPayload } from '@/common/data/customer/types/customerTaskTypes'
import { useCustomerRelatedEntities } from '@/common/data/customer/hooks/useCustomerRelatedEntities'
import { useCustomerTask } from '@/common/data/customer/hooks/useCustomerTask'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type TaskFormData = z.infer<typeof taskSchema> & {
  id?: string
  version?: number
  documents?: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles?: File[] // Files pending upload (not sent to backend)
}

const TASK_TYPE_CATALOG = 'SalesTaskType:v1'
const TASK_PRIORITY_CATALOG = 'SalesTaskPriority:v1'
const TASK_STATUS_CATALOG = 'SalesTaskStatus:v1'

export interface CustomerTaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: TaskFormData) => void
  onCancel?: () => void
}

const CustomerTaskForm: React.FC<CustomerTaskFormProps> = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess,
  onCancel
}: CustomerTaskFormProps) => {
  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const nested =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
    (additionalData as any)?.psi_initialParameters ||
    {}
  const platformParams = {
    taskId: (additionalData as any)?.taskId || nested?.taskId,
    employeeId: (additionalData as any)?.employeeId || nested?.employeeId,
    accountId: (additionalData as any)?.accountId || nested?.accountId,
    contactId: (additionalData as any)?.contactId || nested?.contactId,
    opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
    leadId: (additionalData as any)?.leadId || nested?.leadId
  } as {
    taskId?: string
    employeeId?: string
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
  }

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useCustomerRelatedEntities({ accessToken, additionalData })

  // Customer task hook - declarative single-by-PK
  const taskId = platformParams.taskId
  const { task, loading: taskLoading, error } = useCustomerTask(accessToken || '', taskId)

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId

  // Collect all errors for centralized early return
  const errors: Array<{ error?: string | unknown; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load task data' })
  }

  // Early return if any errors exist
  if (errors.length > 0) {
    return (
      <>
        {errors.map((err, index) => (
          <ErrorAlert
            key={index}
            error={err.error}
            type={err.type}
            context={err.context}
            dataTestId={formatDataTestId('customer-task-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // Determine if entity selection should be shown
  const hasEntityFromContext = accountId || contactId || opportunityId || leadId
  const shouldShowEntitySelection = !hasEntityFromContext

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: mapToFormValues(task || {}, taskSchema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Combine context + task IDs (task has priority)
  const relatedEntityIds = React.useMemo(
    () => ({
      accountId: task?.accountId || accountId,
      contactId: task?.contactId || contactId,
      opportunityId: task?.opportunityId || opportunityId,
      leadId: task?.leadId || leadId
    }),
    [accountId, contactId, opportunityId, leadId, task]
  )

  // Sync form when task changes (following AccountForm pattern)
  const taskRef = useRef(task)
  useEffect(() => {
    if (taskRef.current?.id !== task?.id) {
      form.reset(mapToFormValues(task || {}, taskSchema) as any)
      taskRef.current = task

      // Sync assignedUserId from assignedEmployee after reset
      const assignedEmployee = form.getValues('assignedEmployee')
      if (assignedEmployee?.userId) {
        form.setValue('assignedUserId', assignedEmployee.userId)
      }

      // Hydrate first found entity
      const entity = [
        { type: 'account' as const, id: task?.accountId },
        { type: 'contact' as const, id: task?.contactId },
        { type: 'opportunity' as const, id: task?.opportunityId },
        { type: 'lead' as const, id: task?.leadId }
      ].find(e => e.id)

      if (entity?.id) {
        hydrateEntityById(entity.type, entity.id)
      }
    }
  }, [task?.id, task, form, hydrateEntityById])

  // Upload files to storage and return document metadata
  const uploadFiles = useCallback(
    async (
      files: File[],
      referenceEntityId: string,
      referenceEntityType: 'account' | 'contact' | 'lead' | 'opportunity' | 'unknown'
    ): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      // Determine FILE_ENTITY based on reference entity type
      const fileEntity =
        referenceEntityType === 'account'
          ? FILE_ENTITY.ACCOUNT
          : referenceEntityType === 'contact'
            ? FILE_ENTITY.CONTACT
            : referenceEntityType === 'lead'
              ? FILE_ENTITY.LEAD
              : referenceEntityType === 'opportunity'
                ? FILE_ENTITY.OPPORTUNITY
                : FILE_ENTITY.UNKNOWN

      const folderPath = buildFilePath(fileEntity, referenceEntityId, FILE_CONTEXT.TASK)

      const uploadPromises = files.map(async file => {
        // Ensure we have a valid MIME type - fallback to octet-stream if empty
        const mimeType = file.type

        const result = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: APP_NAME,
            folderPath: folderPath,
            mimeType: mimeType
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

  const handleSubmit = useCallback(
    async (data: z.infer<typeof taskSchema>) => {
      try {
        delete data.files
        delete data._pendingFiles
        delete data.relatedEntityId

        // Build payload (buildPayload will include creator fields from taskData)
        const { salesTask } = buildCustomerTaskPayload(data as Partial<CustomerTask>)

        // assignedUserId from assignedEmployee
        if (data.assignedEmployee?.userId) {
          salesTask.assignedUserId = data.assignedEmployee.userId
        } else if (data.assignedEmployeeId && data.assignedEmployeeId === userInfo?.employeeDetails?.employeeId) {
          salesTask.assignedUserId = userInfo.id
        }

        return {
          salesTask
        }
      } catch (error) {
        console.error('Error submitting task:', error)
        throw error
      }
    },
    [userInfo]
  )

  // PreSubmit handler - upload files before submission
  const handlePreSubmit = useCallback(
    async (data: any) => {
      // Set creator fields if not present
      if (!data.creatorEmployeeId && userInfo?.employeeDetails?.employeeId) {
        data.creatorEmployeeId = userInfo.employeeDetails.employeeId
      }
      if (!data.creatorUserId && userInfo?.id) {
        data.creatorUserId = userInfo.id
      }

      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (data._pendingFiles && data._pendingFiles.length > 0) {
        try {
          // Determine reference entity from form data
          const referenceEntityId =
            data.accountId || data.contactId || data.leadId || data.opportunityId || 'temp-' + Date.now()
          const referenceEntityType = data.accountId
            ? 'account'
            : data.contactId
              ? 'contact'
              : data.leadId
                ? 'lead'
                : data.opportunityId
                  ? 'opportunity'
                  : 'unknown'

          uploadedDocuments = await uploadFiles(data._pendingFiles, referenceEntityId, referenceEntityType)
        } catch (error) {
          console.error('Failed to upload files:', error)
          throw error
        }
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      const existingDocumentsAsObjects = (data.documents || [])
        .filter((doc: any) => doc.id)
        .map((doc: any) => ({
          id: doc.id,
          version: doc.version
        }))

      const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

      // Return enhanced data with documents
      return {
        ...data,
        documents: allDocuments
      }
    },
    [uploadFiles, userInfo]
  )

  const handleSuccess = useCallback(() => {
    onSuccess?.(form.getValues() as any)
  }, [onSuccess, form])

  const handleCancel = useCallback(async () => {
    await onCancel?.()
  }, [onCancel])

  const handleEntitySearch = useCallback(
    (q: string) => {
      searchEntities(q)
    },
    [searchEntities]
  )

  const handleFilesChange = useCallback(
    (files: File[]) => {
      form.setValue('_pendingFiles', files, { shouldDirty: true })
    },
    [form]
  )

  const handleDocumentRemove = useCallback(
    (documentId: string) => {
      const currentDocs = form.getValues('documents') || []
      form.setValue(
        'documents',
        currentDocs.filter((doc: any) => doc.id !== documentId),
        { shouldDirty: true }
      )
    },
    [form]
  )

  // Trigger initial search to load some default entities
  React.useEffect(() => {
    if (accessToken && !platformParams.taskId) {
      // Only trigger initial search in create mode
      searchEntities('')
    }
  }, [accessToken, platformParams.taskId, searchEntities])

  // Handle customer-specific entity context (extends common TaskSegment behavior)
  React.useEffect(() => {
    if (!accountId && !contactId && !opportunityId && !leadId) return
    const hasEntity = Boolean(
      form.getValues('accountId') ||
        form.getValues('contactId') ||
        form.getValues('opportunityId') ||
        form.getValues('leadId')
    )
    if (hasEntity) return

    // Set entity in form based on what's available
    if (accountId) {
      form.setValue('accountId', accountId)
      form.setValue('relatedEntityId', accountId)
      hydrateEntityById('account', accountId)
    } else if (contactId) {
      form.setValue('contactId', contactId)
      form.setValue('relatedEntityId', contactId)
      hydrateEntityById('contact', contactId)
    } else if (opportunityId) {
      form.setValue('opportunityId', opportunityId)
      form.setValue('relatedEntityId', opportunityId)
      hydrateEntityById('opportunity', opportunityId)
    } else if (leadId) {
      form.setValue('leadId', leadId)
      form.setValue('relatedEntityId', leadId)
      hydrateEntityById('lead', leadId)
    }
  }, [accountId, contactId, opportunityId, leadId, form, hydrateEntityById])

  const processType = taskId ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={taskSchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('customer-task-form', 'Form')}
        isSubmitDisabled={taskLoading}
      >
        <TaskLayout
          // Required props
          accessToken={accessToken}
          businessAppContext={{ accessToken, userInfo, additionalData }}
          assignedEmployee={task?.assignedEmployee}
          entityId={task?.id}
          // Catalogs
          typeCatalog={TASK_TYPE_CATALOG}
          priorityCatalog={TASK_PRIORITY_CATALOG}
          statusCatalog={TASK_STATUS_CATALOG}
          // Entity search - hide if entity provided from context OR updating existing task
          showEntitySelection={shouldShowEntitySelection && !taskId}
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntitySearch={handleEntitySearch}
          onEntityLoadMore={loadMoreEntities}
          initialEntityFromContext={{
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          // File handling
          onFilesChange={handleFilesChange}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={handleDocumentRemove}
          // Loading state
          loading={taskLoading && !!taskId}
          data-testid="customer-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default CustomerTaskForm
