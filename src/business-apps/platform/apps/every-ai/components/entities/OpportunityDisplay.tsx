import React from 'react'
import { MarkdownEntityDisplay } from './MarkdownEntityDisplay'

interface OpportunityDisplayProps {
  opportunityId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

/**
 * Opportunity Display Component
 * Uses unified MarkdownEntityDisplay for consistent rendering
 */
export const OpportunityDisplay: React.FC<OpportunityDisplayProps> = ({
  textHuman,
  textTitle,
  accessToken,
  opportunityId,
  operation
}) => {
  return (
    <MarkdownEntityDisplay
      entityType="opportunity"
      entityId={opportunityId}
      accessToken={accessToken}
      operation={operation}
      textHuman={textHuman}
      textTitle={textTitle}
    />
  )
}

export default OpportunityDisplay
