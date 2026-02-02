import React from 'react'
import { MarkdownEntityDisplay } from './MarkdownEntityDisplay'

interface CompanyDisplayProps {
  companyId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

/**
 * Company Display Component
 * Uses unified MarkdownEntityDisplay for consistent rendering
 */
export const CompanyDisplay: React.FC<CompanyDisplayProps> = ({
  textHuman,
  textTitle,
  accessToken,
  companyId,
  operation
}) => {
  return (
    <MarkdownEntityDisplay
      entityType="company"
      entityId={companyId}
      accessToken={accessToken}
      operation={operation}
      textHuman={textHuman}
      textTitle={textTitle}
    />
  )
}

export default CompanyDisplay
