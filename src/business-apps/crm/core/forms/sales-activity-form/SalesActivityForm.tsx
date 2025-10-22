import React, { useMemo, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ActivitySegment, {
  createActivitySegmentResolver,
  Activity
} from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { useFileClient } from '@/common/network/files/useFileClient'

export type SalesActivityFormProps = BusinessAppContextProps

// Removed unused TextArea destructure to satisfy linter

type SalesActivityFormValues = Activity & {
  id?: string
  version?: number
}

const initialValues: SalesActivityFormValues = {
  title: '',
  activityTypeRef: '',
  occurredAt: '',
  description: '',
  files: [],
  documents: [],
  _pendingFiles: []
}

const SALES_ACTIVITY_TYPE_CATALOG = 'SalesActivityType'
const SALES_ACTIVITY_TYPE_VERSION = 'v1'

export const SalesActivityForm: React.FC<SalesActivityFormProps> = props => {
  const { accessToken, additionalData } = props

  const [formData, setFormData] = useState<SalesActivityFormValues>(initialValues)

  // File upload client
  const fileClient = useFileClient({ accessToken } as any)

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/activities/${entityId}/documents`

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

  const resolver = useMemo(() => createActivitySegmentResolver() as any, [])
  const form = useForm<any>({
    defaultValues: initialValues,
    resolver,
    mode: 'onChange'
  })

  const handleSubmit = async (values: SalesActivityFormValues) => {
    // Upload pending files if any
    let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
    if (formData._pendingFiles && formData._pendingFiles.length > 0) {
      const tempId = formData.id || 'temp-' + Date.now()
      uploadedDocuments = await uploadFiles(formData._pendingFiles, tempId)
    }

    // Combine existing documents (as objects with ID) and newly uploaded documents
    const existingDocumentsAsObjects = (formData.documents || [])
      .filter(doc => doc.id)
      .map(doc => ({
        id: doc.id,
        version: doc.version
      }))

    const allDocuments = [...existingDocumentsAsObjects, ...uploadedDocuments]

    const payload = {
      employeeId: additionalData?.employeeId,
      managerId: additionalData?.managerId,
      structureId: additionalData?.structureId,
      locationId: additionalData?.locationId,
      organizationalUnitId: additionalData?.organizationalUnitId,
      ...(additionalData?.contactId && { contactId: additionalData.contactId }),
      changeMode: 'INSERT',
      salesActivity: {
        version: 0,
        activityTypeRef: values.activityTypeRef,
        title: values.title,
        occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : null,
        ...(additionalData?.leadId && { lead: additionalData.leadId }),
        ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
        ...(additionalData?.contactId && { contact: additionalData.contactId }),
        ...(additionalData?.accountId && { account: additionalData.accountId }),
        description: values.description || '',
        ownerEmployee: additionalData?.employeeId,
        documents: allDocuments // Always send array (empty array deletes all documents)
      }
    }
    return payload
  }

  const accountId = additionalData?.accountId
  const contactId = additionalData?.contactId
  const opportunityId = additionalData?.opportunityId
  const leadId = additionalData?.leadId

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      form={form as any}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="sales-activity-process-dialog"
    >
      <div className="gba:w-full" data-testid="sales-activity-form-container">
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
        </h2>

        <ActivitySegment
          accessToken={accessToken}
          typeCatalog={{ identifier: SALES_ACTIVITY_TYPE_CATALOG, version: SALES_ACTIVITY_TYPE_VERSION }}
          showEntitySelection={false}
          initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
          titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Name')}
          typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
          dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date')}
          descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
          uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Attach Documents')}
          // File upload handlers
          onFilesChange={(files: File[]) => {
            setFormData(prev => ({
              ...prev,
              _pendingFiles: [...(prev._pendingFiles || []), ...files]
            }))
          }}
          existingDocuments={formData.documents || []}
          onDocumentRemove={(documentId: string) => {
            setFormData(prev => ({
              ...prev,
              documents: prev.documents?.filter(doc => doc.id !== documentId) || []
            }))
          }}
          data-testid="sales-activity-segment"
        />
      </div>
    </AppActionForm>
  )
}

export default SalesActivityForm
