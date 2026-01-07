import React from 'react'
import { LeadDeletePopup as CommonLeadDeletePopup } from '@/common/components/common-relations/popups/lead-delete-popup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'

export interface LeadDeletePopupValues {
  leadId: string
}

export interface LeadDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<LeadDeletePopupValues>
}

/**
 * IRM Lead Delete Popup
 * Uses useInvestmentLead hook and passes data to common component
 */
const LeadDeletePopup: React.FC<LeadDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const leadId =
    props.additionalData?.leadId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    props.additionalData?.id ||
    initialValues?.leadId ||
    ''

  const { lead, loading, error } = useInvestmentLead(props.accessToken || '', leadId)

  return (
    <CommonLeadDeletePopup
      {...props}
      initialValues={initialValues}
      domain="investments"
      lead={lead}
      loading={loading}
      error={error}
    />
  )
}

export default LeadDeletePopup
export { LeadDeletePopup }
