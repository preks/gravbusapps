import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByInvestmentId } from '@/business-apps/irm/investments/records/investment-record/hooks/useInvestmentDocumentsByInvestmentId'
import { DocumentSection } from '@/components/document-section'
import { getIrmDocumentApiConfig } from '@/business-apps/irm/common/utils/documentUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useInvestmentFolderTemplateNames } from '../hooks/useInvestmentFolderTemplateNames'
import type { DocumentItem } from '@/components/document-section/types'

interface InvestmentPortalDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
}

const InvestmentPortalDocuments: React.FC<InvestmentPortalDocumentsProps> = ({ investmentId, context }) => {
  // Get current user ID for filtering
  const currentUserId = context.userInfo?.id

  // Use the existing hook that supports createdBy filtering
  const { fetchInvestmentDocumentsByInvestmentId } = useGetInvestmentDocumentsByInvestmentId(context)

  // Wrapper to match the expected signature with optional FetchOptions
  const fetchDocuments = useCallback(
    (entityId: string, options?: { createdBy?: string }) => {
      return fetchInvestmentDocumentsByInvestmentId(entityId, options?.createdBy)
    },
    [fetchInvestmentDocumentsByInvestmentId]
  )

  // Use shared hook WITH user filtering (replaces 70+ lines of manual state)
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentId,
    context,
    fetchDocuments,
    fetchOptions: { createdBy: currentUserId }, // 🔑 KEY: Server-side user filtering
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  // REST client for document operations (IRM uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Hide template-skeleton folders: a folder is hidden only when its name
  // matches one of the configured folder-template names (fetched once per
  // page session from the Investment* catalogs and cached at module level)
  // AND its entire subtree contains no files. User-created folders, even
  // empty ones, always remain visible because their names are not in the
  // template list.
  const { templateNames } = useInvestmentFolderTemplateNames(context.accessToken)

  const visibleDocuments = useMemo<DocumentItem[]>(() => {
    if (!documents || documents.length === 0) return documents ?? []
    if (templateNames.size === 0) return documents

    const childrenByParent = new Map<string, DocumentItem[]>()
    for (const doc of documents) {
      const parentId = doc.parentDocument
      if (!parentId) continue
      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        siblings.push(doc)
      } else {
        childrenByParent.set(parentId, [doc])
      }
    }

    const hasFileInSubtree = new Map<string, boolean>()
    const folderHasFile = (folderId: string): boolean => {
      const cached = hasFileInSubtree.get(folderId)
      if (cached !== undefined) return cached
      hasFileInSubtree.set(folderId, false)
      const children = childrenByParent.get(folderId) ?? []
      for (const child of children) {
        const childHasFile = child.folder === true ? folderHasFile(child.id) : true
        if (childHasFile) {
          hasFileInSubtree.set(folderId, true)
          return true
        }
      }
      return false
    }

    return documents.filter(doc => {
      if (doc.folder !== true) return true
      const name = doc.name ?? ''
      const isTemplateName = name.length > 0 && templateNames.has(name)
      if (!isTemplateName) return true
      return folderHasFile(doc.id)
    })
  }, [documents, templateNames])

  // Configure upload action button
  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId
      },
      prefixDataTestId: 'investment-portal-document-upload'
    }),
    [investmentId]
  )

  // Configure folder creation action button
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId,
        folder: true
      },
      prefixDataTestId: 'investment-portal-document-create-folder'
    }),
    [investmentId]
  )

  // API configuration for document operations
  const apiConfig = useMemo(() => getIrmDocumentApiConfig('investment'), [])

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-portal-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-portal-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      documents={visibleDocuments}
      entityId={investmentId}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={apiConfig}
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="investment-portal-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { InvestmentPortalDocuments }
