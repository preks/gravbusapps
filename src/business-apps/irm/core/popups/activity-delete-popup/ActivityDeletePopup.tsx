import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ActivityDeletePopupValues {
  activityId: string
}

export interface ActivityDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<ActivityDeletePopupValues>
}

interface ActivityData {
  id: string
  version: number
  title: string
  description?: string
  occurredAt?: string
  activityType?: {
    id: string
    value: string
  }
}

const prefixDataTestId = 'activity-delete-popup'

const ActivityDeletePopup: React.FC<ActivityDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  const activityId =
    props.additionalData?.activityId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.activityId ||
    props.additionalData?.id ||
    initialValues?.activityId ||
    ''

  useEffect(() => {
    const loadActivity = async () => {
      if (!activityId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel(
            'activity.delete.error.noId',
            'Activity ID not provided or access token missing'
          )
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetActivity($id: uuid!) {
            InvestmentActivity(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              title
              description
              occurredAt
              activityType {
                id
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentActivity: any[] }>(query, { id: activityId })

        if (!result?.InvestmentActivity || result.InvestmentActivity.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('activity.delete.error.notFound', 'Activity not found'))
          return
        }

        const act = result.InvestmentActivity[0]

        setActivity({
          id: act.id,
          version: act.version || 0,
          title: act.title || 'Unnamed Activity',
          description: act.description,
          occurredAt: act.occurredAt,
          activityType: act.activityType
        })
      } catch (err) {
        console.error('Failed to load activity:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('activity.delete.error.loadFailed', 'Failed to load activity')
        )
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [activityId, props.accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!activity) {
      throw new Error(getTranslationFromI18nKeyAndLabel('activity.delete.error.noData', 'Activity data not loaded'))
    }

    const deletePayload = {
      investmentActivity: {
        id: activity.id,
        version: activity.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!activity) {
      return [getTranslationFromI18nKeyAndLabel('activity.delete.error.noData', 'Activity data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('activity.delete.loading', 'Loading activity...')}</p>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('activity.delete.error.failed', 'Failed to load activity')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ activityId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel('activity.delete.title', 'Delete Activity')}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">
                {getTranslationFromI18nKeyAndLabel(
                  'activity.delete.confirmation.question',
                  'Are you sure you want to delete this activity?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.title', 'Title')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {activity.title}
                  </Badge>
                </p>
                {activity.activityType && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('activity.type', 'Type')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {activity.activityType.value}
                    </Badge>
                  </p>
                )}
                {activity.occurredAt && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('activity.occurredAt', 'Occurred At')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {new Date(activity.occurredAt).toLocaleString()}
                    </Badge>
                  </p>
                )}
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default ActivityDeletePopup
export { ActivityDeletePopup }
