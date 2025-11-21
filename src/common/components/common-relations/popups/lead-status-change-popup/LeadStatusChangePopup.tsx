import React from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Base interface for lead data used in status change popup
 * Supports both CRM CustomerLead and IRM InvestmentLead
 */
export interface BaseLeadData {
  id: string
  version: number | string
  // Dynamic status field access (leadStatus, investmentLeadStatus, etc.)
  [key: string]: any
}

export interface LeadStatusChangePopupConfig {
  translationPrefix: string
  entityKey: string
  testIdPrefix: string
  statusFieldName: string
  useLeadDataHook: (
    leadId: string,
    accessToken: string
  ) => {
    lead: BaseLeadData | null
    loading: boolean
    error: string | null
    refetch?: () => void
  }
}

export interface LeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
  config: LeadStatusChangePopupConfig
}

const LeadStatusChangePopup: React.FC<LeadStatusChangePopupProps> = props => {
  const { additionalData, accessToken, config } = props

  // Extract data from additionalData, checking externalContextData, top level and nested psi_taskPayload
  const externalContext = additionalData?.externalContextData || {}
  const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters

  const leadId = (externalContext?.leadId ||
    additionalData?.leadId ||
    taskPayload?.leadId ||
    additionalData?.id ||
    props.initialValues?.leadId) as string

  const newStatusRef = (externalContext?.newStatusRef ||
    additionalData?.newStatusRef ||
    taskPayload?.newStatusRef) as string
  const statusDisplayName = (externalContext?.statusDisplayName ||
    additionalData?.statusDisplayName ||
    taskPayload?.statusDisplayName) as string
  const leadVersion = (externalContext?.leadVersion ||
    additionalData?.leadVersion ||
    taskPayload?.leadVersion) as number

  // Use the configured hook
  const { lead, loading: isLoading, error } = config.useLeadDataHook(leadId, accessToken)

  // Validate required data
  if (!leadId) {
    return (
      <Alert variant="destructive" data-testid={`${config.testIdPrefix}-missing-lead-id`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel(
            `${config.translationPrefix}.status.error.missingId`,
            'No lead ID provided'
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!lead) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(`${config.translationPrefix}.error.dataNotLoaded`, 'Lead data not loaded')
      )
    }

    if (!newStatusRef) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          `${config.translationPrefix}.error.missingStatus`,
          'New status reference is missing'
        )
      )
    }

    const payload = {
      changeMode: 'UPDATE',
      [config.entityKey]: {
        id: leadId,
        version: lead.version ?? leadVersion,
        leadStatusRef: newStatusRef
      }
    }

    return payload
  }

  const handleCancel = () => {
    // AppActionForm will handle closing
  }

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${config.testIdPrefix}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel(`${config.translationPrefix}.status.loading`, 'Loading lead data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${config.testIdPrefix}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Show error if data is missing
  if (!lead) {
    return (
      <Alert variant="destructive" data-testid={`${config.testIdPrefix}-missing-data`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel(`${config.translationPrefix}.error.missingData`, 'Lead data not loaded')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={{}}
      businessAppContext={props}
      data-testid={`${config.testIdPrefix}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.confirm', 'Confirm')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-6" data-testid={`${config.testIdPrefix}-content`}>
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel(
              `${config.translationPrefix}.status.confirmTitle`,
              'Confirm Status Change'
            )}
          </h2>
          <p className="gba:text-base gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              `${config.translationPrefix}.status.confirmChange`,
              'Are you sure you want to change the lead status to'
            )}{' '}
            <strong className="gba:font-semibold">{statusDisplayName}</strong>?
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              `${config.translationPrefix}.status.confirmDescription`,
              "This action will update the lead's current status and may trigger additional workflows."
            )}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
            {getTranslationFromI18nKeyAndLabel(`${config.translationPrefix}.status.current`, 'Current status')}:{' '}
            {lead[config.statusFieldName]?.value || 'Unknown'}
          </p>
        </div>
      </div>
    </AppActionForm>
  )
}

LeadStatusChangePopup.displayName = 'LeadStatusChangePopup'

export { LeadStatusChangePopup }
export default LeadStatusChangePopup
