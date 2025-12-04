import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenericDeletePopup } from '../utils/GenericDeletePopup'
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

/**
 * Opportunity Delete Popup Component
 * Uses GenericDeletePopup for all common functionality
 */
const OpportunityDeletePopup: React.FC<OpportunityDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  opportunity,
  loading,
  error,
  ...props
}) => {
  const getDisplayName = (entity: Opportunity): string => {
    return entity.name || 'Unnamed Opportunity'
  }

  const getPayloadKey = (domain: 'crm' | 'investments'): string => {
    return domain === 'investments' ? 'investmentOpportunity' : 'opportunity'
  }

  return (
    <GenericDeletePopup
      {...props}
      initialValues={initialValues}
      domain={domain}
      entityType="opportunities"
      entityData={opportunity}
      loading={loading}
      error={error}
      getDisplayName={getDisplayName}
      getPayloadKey={getPayloadKey}
    />
  )
}

export default OpportunityDeletePopup
export { OpportunityDeletePopup }
