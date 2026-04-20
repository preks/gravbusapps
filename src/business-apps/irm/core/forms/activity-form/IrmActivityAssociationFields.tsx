import React from 'react'
import {
  ActivityAssociationFields,
  type ActivityAssociationFieldsProps
} from '@/common/components/common-relations/activity-association'

export type IrmActivityAssociationFieldsProps = Omit<ActivityAssociationFieldsProps, 'variant'>

/**
 * IRM activity secondary related account/contact fields (investment GraphQL + investment anchor).
 */
export const IrmActivityAssociationFields: React.FC<IrmActivityAssociationFieldsProps> = props => (
  <ActivityAssociationFields {...props} variant="irm" />
)
