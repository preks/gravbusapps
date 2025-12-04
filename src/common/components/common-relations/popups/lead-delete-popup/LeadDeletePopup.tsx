import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GenericDeletePopup } from '../utils/GenericDeletePopup'
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

/**
 * Lead Delete Popup Component
 * Uses GenericDeletePopup for all common functionality
 */
const LeadDeletePopup: React.FC<LeadDeletePopupProps> = ({
  initialValues = {},
  domain = 'crm',
  lead,
  loading,
  error,
  ...props
}) => {
  const getDisplayName = (entity: Lead): string => {
    // Check for investmentName (IRM-specific field)
    if (domain === 'investments' && 'investmentName' in entity && (entity as any).investmentName) {
      return (entity as any).investmentName
    }
    // Fallback to firstName + lastName
    const fullName = `${entity.firstName || ''} ${entity.lastName || ''}`.trim()
    return fullName || 'Unnamed Lead'
  }

  const getPayloadKey = (domain: 'crm' | 'investments'): string => {
    return domain === 'investments' ? 'investmentLead' : 'lead'
  }

  return (
    <GenericDeletePopup
      {...props}
      initialValues={initialValues}
      domain={domain}
      entityType="leads"
      entityData={lead}
      loading={loading}
      error={error}
      getDisplayName={getDisplayName}
      getPayloadKey={getPayloadKey}
    />
  )
}

export default LeadDeletePopup
export { LeadDeletePopup }
