import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobPostingPublicationDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

interface PublicationData {
  id: string
  version: number
  url: string
}

export const JobPostingPublicationDeletePopup: React.FC<JobPostingPublicationDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-posting-publication-delete-popup'
}) => {
  const [publication, setPublication] = useState<PublicationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken || '')

  const publicationId =
    additionalData?.jobPostingPublicationId ||
    additionalData?.publicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingPublicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.publicationId ||
    additionalData?.id

  useEffect(() => {
    const loadPublication = async () => {
      if (!publicationId || !accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'recruiting.jobPostingPublication.delete.error.noId',
            'Publication ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetJobPostingPublication($id: uuid!) {
            JobPostingPublicationByPk(id: $id) {
              id
              version
              url
            }
          }
        `

        const result = await graphqlClient.request<{ JobPostingPublicationByPk: any }>(query, { id: publicationId })

        if (!result?.JobPostingPublicationByPk) {
          setError(
            getTranslationFromI18nKeyAndLabel(
              'recruiting.jobPostingPublication.delete.error.notFound',
              'Publication not found'
            )
          )
          return
        }

        const pub = result.JobPostingPublicationByPk

        setPublication({
          id: pub.id,
          version: pub.version || 0,
          url: pub.url || 'Unnamed Publication'
        })
      } catch (err) {
        console.error('Failed to load publication:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel(
                'recruiting.jobPostingPublication.delete.error.loadFailed',
                'Failed to load publication'
              )
        )
      } finally {
        setLoading(false)
      }
    }

    loadPublication()
  }, [publicationId, accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!publication) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobPostingPublication.delete.error.noData',
          'Publication data not loaded'
        )
      )
    }

    return {
      jobPostingPublication: {
        id: publication.id,
        version: publication.version,
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

  if (!publicationId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobPostingPublication.delete.missingId',
            'Publication ID not found. Cannot delete publication.'
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
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobPostingPublication.delete.loading',
            'Loading publication...'
          )}
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

  if (!publication) {
    return null
  }

  const publicationTitle =
    publication.url || getTranslationFromI18nKeyAndLabel('recruiting.publication.unnamed', 'Unnamed Publication')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobPostingPublication', 'Job Posting Publication')

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
      <DeleteLayout itemType={itemType} itemTitle={publicationTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobPostingPublicationDeletePopup
