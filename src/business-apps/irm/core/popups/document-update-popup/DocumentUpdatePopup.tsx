import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentUpdatePopup as SharedDocumentUpdatePopup } from '@/common/components/common-relations/popups/document-update-popup'

/**
 * IRM-specific props (simpler interface - wrapper extracts context)
 */
export interface IRMDocumentUpdatePopupProps extends BusinessAppContextProps {
  isOpen?: boolean
  onClose?: () => void
  documentId?: string
  documentVersion?: number
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

/**
 * IRM DocumentUpdatePopup - Investment Documents
 * Extracts entity context from additionalData and configures the generic popup with IRM-specific settings
 */
const DocumentUpdatePopup: React.FC<IRMDocumentUpdatePopupProps> = props => {
  // Extract entity context from additionalData
  const { entityType, entityId, entityIdFieldName, folderEntityName, entityAssociations } = useMemo(() => {
    const ad = props.additionalData || {}
    const externalContext = ad?.externalContextData || {}
    const urlParams = new URLSearchParams(globalThis.location.search)

    const accountId = externalContext?.accountId || ad?.accountId || urlParams.get('accountId') || ''
    const contactId = externalContext?.contactId || ad?.contactId || urlParams.get('contactId') || ''
    const leadId = externalContext?.leadId || ad?.leadId || urlParams.get('leadId') || ''
    const opportunityId = externalContext?.opportunityId || ad?.opportunityId || urlParams.get('opportunityId') || ''
    const investmentId = externalContext?.investmentId || ad?.investmentId || urlParams.get('investmentId') || ''

    // Determine active entity (no defaults - must have explicit entity)
    let type = ''
    let id = ''
    let idFieldName = ''
    let folderName = ''

    if (accountId) {
      type = 'account'
      id = accountId
      idFieldName = 'accountId'
      folderName = 'investment-account'
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
      folderName = 'investment-opportunity'
    } else if (investmentId) {
      type = 'investment'
      id = investmentId
      idFieldName = 'investmentId'
      folderName = 'investment'
    }

    // Build entity associations
    const associations: Record<string, string> = {}
    if (accountId) associations.account = accountId
    if (contactId) associations.contact = contactId
    if (leadId) associations.lead = leadId
    if (opportunityId) associations.opportunity = opportunityId
    if (investmentId) associations.investment = investmentId

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
      graphqlEntity="InvestmentDocument"
      payloadKey="investmentDocument"
      groupCatalogIdentifier="InvestmentDocumentGroup"
      typeCatalogIdentifier="InvestmentDocumentType"
      appName="irm"
      entityRelationships={['account', 'contact', 'lead', 'opportunity', 'investment']}
      entityType={entityType}
      entityId={entityId}
      entityIdFieldName={entityIdFieldName}
      folderEntityName={folderEntityName}
      entityAssociations={entityAssociations}
    />
  )
}

export { DocumentUpdatePopup }
export type { IRMDocumentUpdatePopupProps as DocumentUpdatePopupProps }
export default DocumentUpdatePopup
