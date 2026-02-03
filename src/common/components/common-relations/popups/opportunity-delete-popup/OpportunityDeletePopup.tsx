import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { renderLoadingState, renderErrorState, renderDeleteWarning } from '../utils/deletePopupHelpers'
import { useDeleteRedirect } from '../utils/useDeleteRedirect'
import type { Opportunity } from '@/common/data/relations/types/opportunityTypes'

export interface OpportunityDeletePopupValues {
  opportunityId: string
}

export interface OpportunityDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<OpportunityDeletePopupValues>
  domain?: 'crm' | 'investments'
  opportunity: Opportunity | null
  loading: boolean
  error: string | null
}

const OpportunityDeletePopup: React.FC<OpportunityDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  opportunity,
  loading,
  error,
  ...props
}) => {
  const prefixDataTestId = domain === 'investments' ? 'irm-opportunity-delete-popup' : 'crm-opportunity-delete-popup'

  const opportunityId =
    props.additionalData?.opportunityId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
    props.additionalData?.id ||
    initialValues?.opportunityId ||
    ''

  const handleSubmit = async () => {
    if (!opportunity) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('opportunity.delete.error.noData', 'Opportunity data not loaded')
      )
    }

    const deletePayload =
      domain === 'investments'
        ? {
            investmentOpportunity: {
              id: opportunity.id,
              version: opportunity.version,
              isDeleted: true
            }
          }
        : {
            opportunity: {
              id: opportunity.id,
              version: opportunity.version,
              isDeleted: true
            }
          }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!opportunity) {
      return [getTranslationFromI18nKeyAndLabel('opportunity.delete.error.noData', 'Opportunity data not loaded')]
    }
    return null
  }

  // Setup redirect after delete (only if deleting the current opportunity record)
  useDeleteRedirect({
    domain,
    entityType: 'opportunities',
    recordUrlPattern: '/opportunity-record',
    entityId: opportunityId
  })

  if (loading) {
    return renderLoadingState(prefixDataTestId, 'opportunity')
  }

  if (error || !opportunity) {
    return renderErrorState(prefixDataTestId, 'opportunity', error || '')
  }

  const displayName = opportunity.name || 'Unnamed Opportunity'
  const ownerName = opportunity.ownerEmployee
    ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`
    : getTranslationFromI18nKeyAndLabel('common.notAssigned', 'Not Assigned')

  const title =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel('opportunity.delete.title', 'Delete Investment Opportunity')
      : getTranslationFromI18nKeyAndLabel('opportunity.delete.title', 'Delete Opportunity')

  const confirmationQuestion =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel(
          'opportunity.delete.confirmation.question',
          'Are you sure you want to delete this investment opportunity?'
        )
      : getTranslationFromI18nKeyAndLabel(
          'opportunity.delete.confirmation.question',
          'Are you sure you want to delete this opportunity?'
        )

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ opportunityId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {title}
          </h2>
        </div>

        {renderDeleteWarning(prefixDataTestId, confirmationQuestion, displayName, opportunity.createdAt, ownerName)}
      </div>
    </AppActionForm>
  )
}

export default OpportunityDeletePopup
export { OpportunityDeletePopup }
