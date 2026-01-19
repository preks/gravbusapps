import React from 'react'
import { MarkdownEntityDisplay } from './MarkdownEntityDisplay'

interface ContactDisplayProps {
  contactId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textHuman?: string
  textTitle?: string
}

/**
 * Contact Display Component
 * Uses unified MarkdownEntityDisplay for consistent rendering
 */
export const ContactDisplay: React.FC<ContactDisplayProps> = ({
  textHuman,
  textTitle,
  accessToken,
  contactId,
  operation
}) => {
  return (
    <MarkdownEntityDisplay
      entityType="contact"
      entityId={contactId}
      accessToken={accessToken}
      operation={operation}
      textHuman={textHuman}
      textTitle={textTitle}
    />
  )
}

export default ContactDisplay
