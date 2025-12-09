import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentPopup as SharedDocumentPopup } from '@/common/components/common-relations/popups/document-popup'

export interface DocumentPopupProps extends BusinessAppContextProps {
  initialValues?: any
}

/**
 * CRM Document Popup
 * Thin wrapper that extracts entity context from additionalData and configures
 * the shared DocumentPopup with CRM-specific settings
 */
const DocumentPopup: React.FC<DocumentPopupProps> = props => {
  // Extract entity context from additionalData
  const { entityType, entityId, entityIdFieldName, folderEntityName, entityAssociations } = useMemo(() => {
    const ad = props.additionalData || {}
    const externalContext = ad?.externalContextData || {}
    const payload =
      ad?.payload ||
      ad?.psi_taskPayload?.psi_initialParameters?.payload ||
      ad?.psi_taskPayload?.initialParameters?.payload ||
      {}
    const crmFromAd =
      ad?.crmDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.crmDocument ||
      ad?.psi_taskPayload?.initialParameters?.crmDocument ||
      payload?.crmDocument

    // Check URL parameters and additionalData for entity IDs
    const urlParams = new URLSearchParams(globalThis.location.search)

    const accountId =
      externalContext?.accountId ||
      ad?.accountId ||
      ad?.account ||
      crmFromAd?.account ||
      urlParams.get('accountId') ||
      ''
    const contactId =
      externalContext?.contactId ||
      ad?.contactId ||
      ad?.contact ||
      crmFromAd?.contact ||
      urlParams.get('contactId') ||
      ''
    const leadId = externalContext?.leadId || ad?.leadId || ad?.lead || crmFromAd?.lead || urlParams.get('leadId') || ''
    const opportunityId =
      externalContext?.opportunityId ||
      ad?.opportunityId ||
      ad?.opportunity ||
      crmFromAd?.opportunity ||
      urlParams.get('opportunityId') ||
      ''

    // Determine active entity (priority order: account > contact > lead > opportunity)
    let type = ''
    let id = ''
    let idFieldName = ''
    let folderName = ''

    if (accountId) {
      type = 'account'
      id = accountId
      idFieldName = 'accountId'
      folderName = 'accounts'
    } else if (contactId) {
      type = 'contact'
      id = contactId
      idFieldName = 'contactId'
      folderName = 'contacts'
    } else if (leadId) {
      type = 'lead'
      id = leadId
      idFieldName = 'leadId'
      folderName = 'leads'
    } else if (opportunityId) {
      type = 'opportunity'
      id = opportunityId
      idFieldName = 'opportunityId'
      folderName = 'opportunities'
    }

    // Build entity associations (document can belong to multiple entities)
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
    <SharedDocumentPopup
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
      enableAIClassification={true}
      aiClassificationEndpoint="/flowbot/document-autoclassify/classify"
    />
  )
}

export { DocumentPopup }
export default DocumentPopup
