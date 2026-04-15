import React from 'react'
import {
  ActivityAssociationFields,
  type ActivityAssociationFieldsProps
} from '@/common/components/common-relations/activity-association'

export type CrmActivityAssociationFieldsProps = Omit<ActivityAssociationFieldsProps, 'variant'>

/**
 * CRM activity secondary related contact/account fields (customer GraphQL).
 */
export const CrmActivityAssociationFields: React.FC<CrmActivityAssociationFieldsProps> = props => (
  <ActivityAssociationFields {...props} variant="crm" />
)
