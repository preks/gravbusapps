import React, { useState, useEffect, useCallback } from 'react'
import { Button, Form, Input, DatePicker, message } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FileUpload } from '@newwork/nw-design-system'
import { useFileClient } from '@/common/network/files/useFileClient'
import dayjs from 'dayjs'

export type NotesFormProps = BusinessAppContextProps

const { TextArea } = Input

const initialValues = {
  noteTitle: '',
  noteText: '',
  reminderDate: null
}

interface DocumentState {
  documents: Array<{
    id: string
    name?: string
    version?: number
  }>
  _pendingFiles: File[]
}

export const NotesForm: React.FC<NotesFormProps> = props => {
  const { accessToken, additionalData } = props
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [documentState, setDocumentState] = useState<DocumentState>({
    documents: [],
    _pendingFiles: []
  })

  // File upload client
  const fileClient = useFileClient({ accessToken } as any)

  // Upload files to file service and return file IDs with metadata
  const uploadFiles = useCallback(
    async (files: File[], entityId: string): Promise<Array<{ name: string; fileInfo: any }>> => {
      if (!files || files.length === 0) return []

      const uploadPromises = files.map(async file => {
        const folderPath = `/customerRelations/notes/${entityId}/documents`

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

  useEffect(() => {
    const handleProcessComplete = () => {
      setLoading(false)
      message.success('Note saved successfully!')
    }

    const handleProcessError = () => {
      setLoading(false)
      message.error('Failed to save note. Please try again.')
    }

    // Listen for process completion events
    window.addEventListener('kogito-process-task-completed', handleProcessComplete)
    window.addEventListener('kogito-process-error', handleProcessError)

    return () => {
      window.removeEventListener('kogito-process-task-completed', handleProcessComplete)
      window.removeEventListener('kogito-process-error', handleProcessError)
    }
  }, [])

  const handleSubmit = async (values: any) => {
    setLoading(true)

    try {
      // Upload pending files if any
      let uploadedDocuments: Array<{ name: string; fileInfo: any }> = []
      if (documentState._pendingFiles && documentState._pendingFiles.length > 0) {
        const tempId = 'temp-' + Date.now()
        uploadedDocuments = await uploadFiles(documentState._pendingFiles, tempId)
      }

      // Combine existing documents (as objects with ID) and newly uploaded documents
      const existingDocumentsAsObjects = (documentState.documents || [])
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
        crmNote: {
          noteTitle: values.noteTitle,
          noteText: values.noteText,
          reminderDate: values.reminderDate ? dayjs(values.reminderDate).toISOString() : null,
          lastEditDate: new Date().toISOString(),
          authorEmployee: additionalData?.employeeId,
          documents: allDocuments, // Always send array (empty array deletes all documents)
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId })
        }
      }

      console.log('NotesForm final payload:', payload)

      dispatchProcessContinueEvent('pse_submit', payload)
      // Note: loading state will be cleared by event listeners
    } catch (error) {
      setLoading(false)
      message.error('Failed to save note. Please try again.')
      console.error('Error submitting note:', error)
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  // Helper: Extract File objects from FileWithPreview
  const extractNewFiles = (files: any[]): File[] => {
    const extractedFiles = files.map(f => (f.file instanceof File ? f.file : null)).filter((f): f is File => f !== null)
    return extractedFiles
  }

  // Helper: Check if a file ID is in the current list
  const isFileIdInList = (fileId: string, currentFileIds: Set<string>): boolean => {
    return currentFileIds.has(fileId)
  }

  // Helper: Check if a document was removed
  const isDocumentRemoved = (docId: string, removedDocs: any[]): boolean => {
    return removedDocs.some(removed => removed.id === docId)
  }

  // Helper: Map documents to initial file format
  const mapDocumentsToInitialFiles = (documents: DocumentState['documents']) => {
    return documents.map(doc => ({
      id: doc.id,
      name: doc.name || 'Unnamed Document',
      size: 0,
      type: '',
      url: doc.id
    }))
  }

  // Handler: Process file changes
  const handleFilesChange = (files: any[]) => {
    // Add new files
    const newFiles = extractNewFiles(files)
    if (newFiles.length > 0) {
      setDocumentState(prev => ({
        ...prev,
        _pendingFiles: [...(prev._pendingFiles || []), ...newFiles]
      }))
    }

    // Handle file removal
    const currentFileIds = new Set(files.map(f => f.id))
    const initialFiles = mapDocumentsToInitialFiles(documentState.documents)
    const removedDocs = initialFiles.filter(initial => !isFileIdInList(initial.id, currentFileIds))

    if (removedDocs.length > 0) {
      setDocumentState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => !isDocumentRemoved(doc.id, removedDocs))
      }))
    }
  }

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="notes-form-container">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="notes-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:notes.newNote', 'New Note')}
        </h2>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}
          name="noteTitle"
          rules={[
            {
              required: true,
              message: getTranslationFromI18nKeyAndLabel('crm:notes.titleRequired', 'Note title is required')
            }
          ]}
        >
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.titlePlaceholder', 'Enter note title...')}
            data-testid="title-input"
            className="gba:w-full"
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}
          name="noteText"
          rules={[
            {
              required: true,
              message: getTranslationFromI18nKeyAndLabel('crm:notes.textRequired', 'Note content is required')
            }
          ]}
        >
          <TextArea
            rows={4}
            placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.textPlaceholder', 'Write your note here...')}
            data-testid="text-textarea"
            className="gba:w-full"
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}
          name="reminderDate"
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={getTranslationFromI18nKeyAndLabel(
              'crm:notes.reminderDatePlaceholder',
              'Select reminder date...'
            )}
            data-testid="reminder-date-picker"
            className="gba:w-full"
          />
        </Form.Item>

        <Form.Item label={getTranslationFromI18nKeyAndLabel('crm:notes.uploadFile', 'Attach Documents')}>
          <FileUpload
            key={documentState.documents.map(d => d.id).join(',') || 'empty'}
            layout="list"
            preview="icon"
            maxFiles={10}
            maxSizeMB={10}
            multiple={true}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
            initialFiles={mapDocumentsToInitialFiles(documentState.documents)}
            onFilesChange={handleFilesChange}
            data-testid="notes-file-upload"
          />
        </Form.Item>

        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6">
          <Button onClick={handleCancel} data-testid="cancel-button" disabled={loading}>
            {getTranslationFromI18nKeyAndLabel('common:cancel', 'Cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} data-testid="submit-button">
            {getTranslationFromI18nKeyAndLabel('crm:notes.saveNote', 'Save Note')}
          </Button>
        </div>
      </Form>
    </div>
  )
}
