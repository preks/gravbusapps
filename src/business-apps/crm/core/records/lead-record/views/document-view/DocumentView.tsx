import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadDocuments } from '../../components/LeadDocuments'

interface DocumentViewProps extends BusinessAppContextProps {
  leadId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ leadId, ...context }) => {
  return (
    <div data-testid="document-view">
      <LeadDocuments leadId={leadId} context={context} />
    </div>
  )
}
