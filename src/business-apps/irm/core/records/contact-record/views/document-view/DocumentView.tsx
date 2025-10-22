import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactDocuments } from '../../components/ContactDocuments'

interface DocumentViewProps extends BusinessAppContextProps {
  contactId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ contactId, ...context }) => {
  return (
    <div data-testid="document-view">
      <ContactDocuments contactId={contactId} context={context} />
    </div>
  )
}
