import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentUpdatePopup as SharedDocumentUpdatePopup } from '@/common/components/common-relations/popups/document-update-popup'

/**
 * CRM-specific props (simpler interface - wrapper extracts context)
 */
export interface CRMDocumentUpdatePopupProps extends BusinessAppContextProps {
  isOpen?: boolean
  onClose?: () => void
  documentId?: string
  documentVersion?: number
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

/**
 * CRM DocumentUpdatePopup - Sales Documents
 * Extracts entity context from additionalData and configures the generic popup with CRM-specific settings
 */
const DocumentUpdatePopup: React.FC<CRMDocumentUpdatePopupProps> = props => {
  // Extract entity context from additionalData
  const { entityType, entityId, entityIdFieldName, folderEntityName, entityAssociations } = useMemo(() => {
    const ad = props.additionalData || {}
    const externalContext = ad?.externalContextData || {}
    const urlParams = new URLSearchParams(globalThis.location.search)

    const accountId = externalContext?.accountId || ad?.accountId || urlParams.get('accountId') || ''
    const contactId = externalContext?.contactId || ad?.contactId || urlParams.get('contactId') || ''
    const leadId = externalContext?.leadId || ad?.leadId || urlParams.get('leadId') || ''
    const opportunityId = externalContext?.opportunityId || ad?.opportunityId || urlParams.get('opportunityId') || ''

    // Determine active entity (no defaults - must have explicit entity)
    let type = ''
    let id = ''
    let idFieldName = ''
    let folderName = ''

    if (accountId) {
      type = 'account'
      id = accountId
      idFieldName = 'accountId'
      folderName = 'account'
    } else if (contactId) {
      type = 'contact'
      id = contactId
      idFieldName = 'contactId'
      folderName = 'contact'
    } else if (leadId) {
      type = 'lead'
      id = leadId
      idFieldName = 'leadId'
      folderName = 'lead'
    } else if (opportunityId) {
      type = 'opportunity'
      id = opportunityId
      idFieldName = 'opportunityId'
      folderName = 'opportunity'
    }

    // Build entity associations
    const associations: Record<string, string> = {}
    if (accountId) associations.account = accountId
    if (contactId) associations.contact = contactId
    if (leadId) associations.lead = leadId
    if (opportunityId) associations.opportunity = opportunityId

    return {
      entityType: type,
      entityId: id,
      entityIdFieldName: idFieldName,
      folderEntityName: folderName,
      entityAssociations: associations
    }
  }, [props.additionalData])

  return (
    <SharedDocumentUpdatePopup
      {...props}
      graphqlEntity="CrmDocument"
      payloadKey="crmDocument"
      groupCatalogIdentifier="SalesDocumentGroup"
      typeCatalogIdentifier="SalesDocumentType"
      appName="crm"
      entityRelationships={['account', 'contact', 'lead', 'opportunity']}
      entityType={entityType}
      entityId={entityId}
      entityIdFieldName={entityIdFieldName}
      folderEntityName={folderEntityName}
      entityAssociations={entityAssociations}
    />
  )
}

export { DocumentUpdatePopup }
export type { CRMDocumentUpdatePopupProps as DocumentUpdatePopupProps }
export default DocumentUpdatePopup
