import React from 'react'
import { MarkdownEntityDisplay } from './MarkdownEntityDisplay'

interface LeadDisplayProps {
  leadId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

/**
 * Lead Display Component
 * Uses unified MarkdownEntityDisplay for consistent rendering
 */
export const LeadDisplay: React.FC<LeadDisplayProps> = ({ textHuman, textTitle, accessToken, leadId, operation }) => {
  return (
    <MarkdownEntityDisplay
      entityType="lead"
      entityId={leadId}
      accessToken={accessToken}
      operation={operation}
      textHuman={textHuman}
      textTitle={textTitle}
    />
  )
}

export default LeadDisplay
