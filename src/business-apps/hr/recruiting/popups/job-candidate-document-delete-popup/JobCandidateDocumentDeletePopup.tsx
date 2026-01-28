import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobCandidateDocumentDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void

  'data-testid'?: string
}

interface DocumentData {
  id: string
  version: number
  name: string
}

export const JobCandidateDocumentDeletePopup: React.FC<JobCandidateDocumentDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-candidate-document-delete-popup'
}) => {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken || '')

  const documentId =
    additionalData?.jobCandidateDocumentId ||
    additionalData?.documentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobCandidateDocumentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.documentId ||
    additionalData?.id

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId || !accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'recruiting.jobCandidateDocument.delete.error.noId',
            'Document ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetJobCandidateDocument($id: uuid!) {
            JobCandidateDocumentByPk(id: $id) {
              id
              version
              name
            }
          }
        `

        const result = await graphqlClient.request<{ JobCandidateDocumentByPk: any }>(query, { id: documentId })

        if (!result?.JobCandidateDocumentByPk) {
          setError(
            getTranslationFromI18nKeyAndLabel(
              'recruiting.jobCandidateDocument.delete.error.notFound',
              'Document not found'
            )
          )
          return
        }

        const doc = result.JobCandidateDocumentByPk

        setDocument({
          id: doc.id,
          version: doc.version || 0,
          name: doc.name || 'Unnamed Document'
        })
      } catch (err) {
        console.error('Failed to load document:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel(
                'recruiting.jobCandidateDocument.delete.error.loadFailed',
                'Failed to load document'
              )
        )
      } finally {
        setLoading(false)
      }
    }

    loadDocument()
  }, [documentId, accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!document) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobCandidateDocument.delete.error.noData',
          'Document data not loaded'
        )
      )
    }

    return {
      jobCandidateDocument: {
        id: document.id,
        version: document.version,
        isDeleted: true
      }
    }
  }

  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!documentId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobCandidateDocument.delete.missingId',
            'Document ID not found. Cannot delete document.'
          )}
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidateDocument.delete.loading', 'Loading document...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {error}
        </Alert>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobCandidateDocument', 'Job Candidate Document')

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={`${dataTestId}-form`}
    >
      <DeleteLayout itemType={itemType} itemTitle={document.name} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobCandidateDocumentDeletePopup
