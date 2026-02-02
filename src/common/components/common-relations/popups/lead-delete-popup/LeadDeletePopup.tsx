import React from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { renderLoadingState, renderErrorState, renderDeleteWarning } from '../utils/deletePopupHelpers'
import { useDeleteRedirect } from '../utils/useDeleteRedirect'
import type { Lead } from '@/common/data/relations/types/leadTypes'

export interface LeadDeletePopupValues {
  leadId: string
}

export interface LeadDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<LeadDeletePopupValues>
  domain?: 'crm' | 'investments'
  lead: Lead | null
  loading: boolean
  error: string | null
}

const LeadDeletePopup: React.FC<LeadDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  lead,
  loading,
  error,
  ...props
}) => {
  const prefixDataTestId = domain === 'investments' ? 'irm-lead-delete-popup' : 'crm-lead-delete-popup'

  const leadId =
    props.additionalData?.leadId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    props.additionalData?.id ||
    initialValues?.leadId ||
    ''

  const getDisplayName = (): string => {
    if (!lead) return 'Unnamed Lead'

    if (domain === 'investments' && 'investmentName' in lead && (lead as any).investmentName) {
      return (lead as any).investmentName
    }

    const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
    return fullName || 'Unnamed Lead'
  }

  const handleSubmit = async () => {
    if (!lead) {
      throw new Error(getTranslationFromI18nKeyAndLabel('lead.delete.error.noData', 'Lead data not loaded'))
    }

    const deletePayload =
      domain === 'investments'
        ? {
            investmentLead: {
              id: lead.id,
              version: lead.version,
              isDeleted: true
            }
          }
        : {
            lead: {
              id: lead.id,
              version: lead.version,
              isDeleted: true
            }
          }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!lead) {
      return [getTranslationFromI18nKeyAndLabel('lead.delete.error.noData', 'Lead data not loaded')]
    }
    return null
  }

  // Setup redirect after delete (only if deleting the current lead record)
  useDeleteRedirect({
    domain,
    entityType: 'leads',
    recordUrlPattern: '/lead-record',
    entityId: leadId
  })

  if (loading) {
    return renderLoadingState(prefixDataTestId, 'lead')
  }

  if (error || !lead) {
    return renderErrorState(prefixDataTestId, 'lead', error || '')
  }

  const displayName = getDisplayName()
  const ownerName = lead.ownerEmployee
    ? `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}`
    : getTranslationFromI18nKeyAndLabel('common.notAssigned', 'Not Assigned')

  const title =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel('lead.delete.title', 'Delete Investment Lead')
      : getTranslationFromI18nKeyAndLabel('lead.delete.title', 'Delete Lead')

  const confirmationQuestion =
    domain === 'investments'
      ? getTranslationFromI18nKeyAndLabel(
          'lead.delete.confirmation.question',
          'Are you sure you want to delete this investment lead?'
        )
      : getTranslationFromI18nKeyAndLabel(
          'lead.delete.confirmation.question',
          'Are you sure you want to delete this lead?'
        )

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ leadId }}
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

        {renderDeleteWarning(prefixDataTestId, confirmationQuestion, displayName, lead.createdAt, ownerName)}
      </div>
    </AppActionForm>
  )
}

export default LeadDeletePopup
export { LeadDeletePopup }
