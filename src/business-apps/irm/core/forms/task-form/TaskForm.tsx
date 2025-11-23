import React, { useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskLayout, taskSchema } from '@/common/components/common-relations/form-layouts/task-layout'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { type InvestmentTask, buildInvestmentTaskPayload } from '@/common/data/investment/types/investmentTaskTypes'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentTask } from '@/common/data/investment/hooks/useInvestmentTask'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { ErrorAlert } from '@/components/error-alert/ErrorAlert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const investmentTaskSchema = taskSchema.extend({
  investmentId: z.string().nullable().optional()
})
type TaskFormProps = BusinessAppContextProps

const TaskForm: React.FC<TaskFormProps> = ({ accessToken, userInfo, additionalData }: TaskFormProps) => {
  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const nested =
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters ||
    (additionalData as any)?.psi_initialParameters ||
    {}
  const platformParams = {
    taskId: (additionalData as any)?.taskId || nested?.taskId,
    accountId: (additionalData as any)?.accountId || nested?.accountId,
    contactId: (additionalData as any)?.contactId || nested?.contactId,
    opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
    leadId: (additionalData as any)?.leadId || nested?.leadId,
    investmentId: (additionalData as any)?.investmentId || nested?.investmentId
  } as {
    taskId?: string
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
    investmentId?: string
  }

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities({ accessToken, additionalData })

  // Investment task hook - declarative single-by-PK
  const taskId = platformParams.taskId
  const { task, loading, error } = useInvestmentTask(accessToken || '', taskId)

  // File client for document uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Extract entity IDs from platformParams
  const accountId = platformParams.accountId
  const contactId = platformParams.contactId
  const opportunityId = platformParams.opportunityId
  const leadId = platformParams.leadId
  const investmentId = platformParams.investmentId

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
            dataTestId={formatDataTestId('investment-task-form', `error-alert-${index}`)}
          />
        ))}
      </>
    )
  }

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<z.infer<typeof investmentTaskSchema>>({
    resolver: zodResolver(investmentTaskSchema) as any,
    defaultValues: mapToFormValues(task || {}, investmentTaskSchema) as Partial<InvestmentTask>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Combine context + task IDs (task has priority)
  const relatedEntityIds = React.useMemo(
    () => ({
      accountId: task?.accountId || accountId,
      contactId: task?.contactId || contactId,
      opportunityId: task?.opportunityId || opportunityId,
      leadId: task?.leadId || leadId,
      investmentId: task?.investmentId || investmentId
    }),
    [accountId, contactId, opportunityId, leadId, investmentId, task]
  )

  // Sync form when task changes (following AccountForm pattern)
  const taskRef = useRef(task)
  useEffect(() => {
    if (taskRef.current?.id !== task?.id) {
      form.reset(mapToFormValues(task || {}, investmentTaskSchema) as Partial<InvestmentTask>)
      taskRef.current = task

      // Hydrate first found entity
      const entity = [
        { type: 'investment' as const, id: task?.investmentId },
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
      referenceEntityType: 'account' | 'contact' | 'lead' | 'opportunity' | 'investment' | 'unknown'
    ): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      let fileEntity: any

      switch (referenceEntityType) {
        case 'account':
          fileEntity = FILE_ENTITY.ACCOUNT
          break
        case 'contact':
          fileEntity = FILE_ENTITY.CONTACT
          break
        case 'lead':
          fileEntity = FILE_ENTITY.LEAD
          break
        case 'opportunity':
          fileEntity = FILE_ENTITY.OPPORTUNITY
          break
        case 'investment':
          fileEntity = FILE_ENTITY.INVESTMENT
          break
        default:
          fileEntity = FILE_ENTITY.UNKNOWN
          break
      }

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

  const handleSubmit = useCallback(async (data: z.infer<typeof investmentTaskSchema>) => {
    try {
      delete data.files
      delete data._pendingFiles
      delete data.relatedEntityId

      // Build payload (buildPayload will include creator fields from taskData)
      const { investmentTask } = buildInvestmentTaskPayload(data as Partial<InvestmentTask>)

      return {
        investmentTask
      }
    } catch (error) {
      console.error('Error submitting task:', error)
      throw error
    }
  }, [])

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
          // Determine reference entity from form data (including investmentId)
          const referenceEntityId =
            data.investmentId ||
            data.accountId ||
            data.contactId ||
            data.leadId ||
            data.opportunityId ||
            'temp-' + Date.now()

          const referenceEntityType = data.investmentId
            ? 'investment'
            : data.accountId
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

  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

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
    if (accessToken && !taskId) {
      // Only trigger initial search in create mode
      searchEntities('')
    }
  }, [accessToken, taskId, searchEntities])

  // Handler for investment entity changes (injected into TaskSegment)
  // Also handles initial investmentId from context or loaded task
  const handleAdditionalEntityChange = useCallback(
    (type: string, entityId: string | null) => {
      if (type === 'investment') {
        if (entityId) {
          form.setValue('investmentId', entityId)
          form.setValue('relatedEntityId', entityId)
          hydrateEntityById('investment', entityId)
        } else {
          form.setValue('investmentId', undefined)
        }
      }
    },
    [form, hydrateEntityById]
  )

  // Handle investmentId from context or loaded task (IRM-specific, outside TaskSegment)
  useEffect(() => {
    const contextInvestmentId = relatedEntityIds.investmentId
    if (!contextInvestmentId) return

    const currentInvestmentId = form.getValues('investmentId')
    if (currentInvestmentId !== contextInvestmentId) {
      handleAdditionalEntityChange('investment', contextInvestmentId)
    }
  }, [relatedEntityIds.investmentId, form, handleAdditionalEntityChange])

  const processType = taskId ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        handlePreSubmit={handlePreSubmit}
        onCancel={handleCancel}
        formData={form.getValues()}
        form={form}
        schema={investmentTaskSchema}
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        data-testid={formatDataTestId('investment-task-form', 'Form')}
        isSubmitDisabled={loading}
      >
        <TaskLayout
          // Required props
          accessToken={accessToken}
          businessAppContext={{ accessToken, userInfo, additionalData }}
          assignedEmployee={task?.assignedEmployee}
          entityId={task?.id}
          // Catalogs
          typeCatalog={'InvestmentTaskType:v1'}
          priorityCatalog={'InvestmentTaskPriority:v1'}
          statusCatalog={'InvestmentTaskStatus:v1'}
          // Entity search - hide if any entity is set
          showEntitySelection={
            !(
              relatedEntityIds.accountId ||
              relatedEntityIds.contactId ||
              relatedEntityIds.opportunityId ||
              relatedEntityIds.leadId ||
              relatedEntityIds.investmentId
            )
          }
          entities={entities}
          entitiesLoading={entitiesLoading}
          entitiesHasMore={entitiesHasMore}
          onEntitySearch={handleEntitySearch}
          onEntityLoadMore={loadMoreEntities}
          initialEntityFromContext={{
            // Only pass standard entities to TaskSegment (investmentId handled separately via onAdditionalEntityChange)
            accountId: relatedEntityIds.accountId,
            contactId: relatedEntityIds.contactId,
            opportunityId: relatedEntityIds.opportunityId,
            leadId: relatedEntityIds.leadId
          }}
          onAdditionalEntityChange={handleAdditionalEntityChange}
          // File handling
          onFilesChange={handleFilesChange}
          existingDocuments={form.watch('documents') || []}
          onDocumentRemove={handleDocumentRemove}
          // Loading state
          loading={loading && !!taskId}
          data-testid="investment-task-layout"
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default TaskForm
