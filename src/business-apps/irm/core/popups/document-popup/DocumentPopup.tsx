import React, { useMemo, useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  DocumentPopup as SharedDocumentPopup,
  type DocumentData
} from '@/common/components/common-relations/popups/document-popup/DocumentPopup'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DocumentPopupProps extends BusinessAppContextProps {
  initialValues?: any
}

/**
 * IRM Document Popup - Wrapper Component
 *
 * Fetches IRM document data for update mode and passes to common presentation component.
 * - Queries InvestmentDocument via GraphQL when documentId is present
 * - Extracts entity context from additionalData
 * - Passes fetched data to common popup
 */
const DocumentPopup: React.FC<DocumentPopupProps> = props => {
  const [loadedDocument, setLoadedDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentLoading, setParentLoading] = useState(false)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  // Extract entity context, documentId, mode, and folder flag from additionalData
  const { entityType, entityId, entityIdFieldName, folderEntityName, entityAssociations, documentId, mode, isFolder } =
    useMemo(() => {
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
      const leadId =
        externalContext?.leadId || ad?.leadId || ad?.lead || invFromAd?.lead || urlParams.get('leadId') || ''
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

      // Extract documentId from additionalData (for update mode)
      const docId =
        ad?.documentId ||
        ad?.externalContextData?.documentId ||
        ad?.payload?.documentId ||
        ad?.psi_taskPayload?.psi_initialParameters?.documentId ||
        invFromAd?.id ||
        ''

      // Extract mode
      const modeValue =
        ad?.mode ||
        ad?.psi_taskPayload?.psi_initialParameters?.mode ||
        ad?.psi_taskPayload?.initialParameters?.mode ||
        (docId ? 'update' : 'create')

      // Extract folder flag
      const folderValue = Boolean(
        ad?.folder === true ||
          ad?.createFolder === true ||
          ad?.createFolder === 'true' ||
          ad?.psi_taskPayload?.psi_initialParameters?.createFolder === true ||
          ad?.psi_taskPayload?.psi_initialParameters?.createFolder === 'true' ||
          ad?.psi_taskPayload?.initialParameters?.createFolder === true ||
          ad?.psi_taskPayload?.initialParameters?.createFolder === 'true' ||
          invFromAd?.format === 'FOLDER' ||
          invFromAd?.folder === true
      )

      return {
        entityType: type,
        entityId: id,
        entityIdFieldName: idFieldName,
        folderEntityName: folderName,
        entityAssociations: associations,
        documentId: docId,
        mode: modeValue,
        isFolder: folderValue
      }
    }, [props.additionalData])

  // Fetch document data for update/rename mode
  useEffect(() => {
    if (!documentId || !props.accessToken || (mode !== 'update' && mode !== 'rename')) {
      setLoading(false)
      return
    }

    const loadDocument = async () => {
      try {
        setLoading(true)
        setError(null)

        const entityFields = ['account', 'contact', 'lead', 'opportunity', 'investment']
          .map(entity => `${entity} { id }`)
          .join(' ')

        const query = `
          query GetInvestmentDocument($id: uuid!) {
            InvestmentDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              documentGroupRef
              documentGroup {
                id
                code
                value
              }
              documentTypeRef
              documentType {
                id
                code
                value
              }
              expirationDate
              parentDocument { id }
              folder
              fileInfo
              mimeType
              ${entityFields}
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentDocument: any[] }>(query, { id: documentId })

        if (!result?.InvestmentDocument || result.InvestmentDocument.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('document.error.notFound', 'Document not found'))
          setLoading(false)
          return
        }

        const doc = result.InvestmentDocument[0]

        setLoadedDocument({
          id: doc.id,
          version: doc.version || 0,
          name: doc.name || '',
          description: doc.description,
          documentGroupRef: doc.documentGroup?.id || doc.documentGroupRef, // Catalog reference string
          documentTypeRef: doc.documentType?.id || doc.documentTypeRef, // Catalog reference string
          expirationDate: doc.expirationDate,
          parentDocument: doc.parentDocument?.id,
          folder: Boolean(doc.folder),
          file: doc.fileInfo?.fileId, // Extract from nested structure
          fileInfo: doc.fileInfo,
          fileSize: doc.fileInfo?.fileMetadata?.size, // Extract from nested metadata
          mimeType: doc.mimeType
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching IRM document:', err)
        setError(getTranslationFromI18nKeyAndLabel('document.error.loadFailed', 'Failed to load document details'))
        setLoading(false)
      }
    }

    loadDocument()
  }, [documentId, mode, props.accessToken, graphqlClient])

  // Fetch parent folders for create mode
  useEffect(() => {
    if (!entityId || !props.accessToken) {
      setParentLoading(false)
      return
    }

    const loadParentFolders = async () => {
      try {
        setParentLoading(true)

        const query = `
          query GetParentFolders($id: uuid!) {
            InvestmentDocument(where: { ${entityIdFieldName}: { _eq: $id }, isDeleted: { _eq: false }, folder: { _eq: true } }) {
              id
              name
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentDocument: { id: string; name: string }[] }>(query, {
          id: entityId
        })

        setParentFolders(Array.isArray(result?.InvestmentDocument) ? result.InvestmentDocument : [])
        setParentLoading(false)
      } catch (err) {
        console.error('Failed to load parent folders:', err)
        setParentFolders([])
        setParentLoading(false)
      }
    }

    loadParentFolders()
  }, [entityId, entityIdFieldName, props.accessToken, graphqlClient])

  return (
    <SharedDocumentPopup
      {...props}
      groupCatalogIdentifier="InvestmentDocumentGroup"
      typeCatalogIdentifier="InvestmentDocumentType"
      appName="irm"
      entityType={entityType}
      entityId={entityId}
      entityIdFieldName={entityIdFieldName}
      folderEntityName={folderEntityName}
      entityAssociations={entityAssociations}
      mode={mode as 'create' | 'update' | 'rename'}
      isFolder={isFolder}
      document={loadedDocument}
      documentLoading={loading}
      documentError={error}
      parentFolders={parentFolders}
      parentFoldersLoading={parentLoading}
      enableAIClassification={true}
      aiClassificationEndpoint="/flowbot/document-autoclassify/classify"
    />
  )
}

export { DocumentPopup }
export default DocumentPopup
