import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentPopup as SharedDocumentPopup } from '@/common/components/common-relations/popups/document-popup'

export interface DocumentPopupProps extends BusinessAppContextProps {
  initialValues?: any
}

/**
 * IRM Document Popup
 * Thin wrapper that extracts entity context from additionalData and configures
 * the shared DocumentPopup with IRM-specific settings
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
    const invFromAd =
      ad?.investmentDocument ||
      ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument ||
      ad?.psi_taskPayload?.initialParameters?.investmentDocument ||
      payload?.investmentDocument

    // Check URL parameters and additionalData for entity IDs
    const urlParams = new URLSearchParams(globalThis.location.search)

    const accountId =
      externalContext?.accountId ||
      ad?.accountId ||
      ad?.account ||
      invFromAd?.account ||
      urlParams.get('accountId') ||
      ''
    const contactId =
      externalContext?.contactId ||
      ad?.contactId ||
      ad?.contact ||
      invFromAd?.contact ||
      urlParams.get('contactId') ||
      ''
    const leadId = externalContext?.leadId || ad?.leadId || ad?.lead || invFromAd?.lead || urlParams.get('leadId') || ''
    const opportunityId =
      externalContext?.opportunityId ||
      ad?.opportunityId ||
      ad?.opportunity ||
      invFromAd?.opportunity ||
      urlParams.get('opportunityId') ||
      ''
    const investmentId =
      externalContext?.investmentId ||
      ad?.investmentId ||
      ad?.investment ||
      invFromAd?.investment ||
      urlParams.get('investmentId') ||
      ''

    // Determine active entity (priority: account > contact > lead > opportunity > investment)
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

    // Build entity associations (document can belong to multiple entities)
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
    <SharedDocumentPopup
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
      enableAIClassification={false}
    />
  )
}

export { DocumentPopup }
export default DocumentPopup
