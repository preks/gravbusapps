import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation, Button, Card, Skeleton } from '@newwork/nw-design-system'
import { Folder, Home, FileText, Share2, FilePlus, ArrowLeft } from 'lucide-react'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import SearchInput from '../../components/shared/SearchInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDocumentNavigation } from '../../hooks/useDocumentNavigation'
import { useDocumentAreas, useFolderContents } from '../../hooks/useDocumentData'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import translations from '../../_i18n'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DocumentSection, type DocumentItem } from '@/components/document-section/DocumentSection'
import { EmployeeHoverCard } from '@/common/components/employee'
import { getEntityTypeFromContentGroup, buildContentRecordUrl } from '@/business-apps/core/content/utils/shareUtils'
import DocumentCreator from '@/business-apps/core/documents/apps/document-creator'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface DocumentViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  targetLanguage?: string | null
  translatedItems?: Record<string, { id: string; title?: string; preview?: string }>
  onTranslate?: (items: any[], targetLanguage: string) => Promise<void>
}

/**
 * Document View - Hierarchical Document Management
 *
 * Hierarchy:
 * 1. ContentEntries (Document Areas) - shown as cards
 * 2. DocumentSection component handles folders and documents with full features
 */
const DocumentView: React.FC<DocumentViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  targetLanguage,
  translatedItems,
  onTranslate
}) => {
  const { t } = useTranslation(translations)
  const navigation = useDocumentNavigation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDocumentCreator, setShowDocumentCreator] = useState(false)

  // REST client for document operations (Content uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Fetch document areas (ContentEntries with DOCUMENT group)
  const {
    areas,
    isLoading: areasLoading,
    error: areasError,
    refetch: refetchAreas
  } = useDocumentAreas(accessToken, null, [], searchQuery)

  // Fetch folders/documents for current location
  const {
    allDocuments,
    isLoading: contentsLoading,
    error: contentsError,
    refetch: refetchContents
  } = useFolderContents(accessToken, navigation.currentArea?.id || null, navigation.currentFolderId)

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetchAreas()
      refetchContents()
    }
  })

  // Handle search for document areas
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Collect all areas for translation
  const allAreas = useMemo(() => {
    return areas || []
  }, [areas])

  // Trigger translation when targetLanguage is set
  useEffect(() => {
    if (targetLanguage && onTranslate && allAreas.length > 0) {
      onTranslate(allAreas, targetLanguage)
    }
  }, [targetLanguage, allAreas, onTranslate])

  // Transform ALL documents to DocumentItem format for DocumentSection
  // This includes all folders and files, not just the current level
  // DocumentSection will handle filtering based on tree/list view
  const documentItems: DocumentItem[] = useMemo(() => {
    if (!allDocuments) return []

    return allDocuments.map(doc => {
      if (doc.folder) {
        // Folder
        return {
          id: doc.id,
          name: doc.name || 'Unnamed Folder',
          folder: true,
          version: doc.version,
          parentDocument: doc.parentDocumentId || null,
          createdAt: doc.createdAt
        }
      } else {
        // Document/File
        const fileName = doc.fileInfo?.fileMetadata?.originalFileName || doc.name || 'Unnamed File'
        const fileSize =
          typeof doc.fileInfo?.fileMetadata?.size === 'number' ? doc.fileInfo.fileMetadata.size : undefined
        const mimeType = doc.fileInfo?.fileMetadata?.mimeType

        return {
          id: doc.id,
          name: fileName,
          description: doc.description,
          folder: false,
          version: doc.version,
          parentDocument: doc.parentDocumentId || null,
          fileInfo: doc.fileInfo,
          fileSize: fileSize,
          mimeType: mimeType,
          createdAt: doc.createdAt
        }
      }
    })
  }, [allDocuments])

  // If Document Creator is open, show it as a full view (not overlay)
  if (showDocumentCreator) {
    return (
      <div
        className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full"
        data-testid="document-creator-view"
      >
        {/* Back button header */}
        <div className="gba:p-4 gba:border-b gba:border-border gba:bg-background">
          <Button variant="ghost" onClick={() => setShowDocumentCreator(false)} className="gba:gap-2">
            <ArrowLeft className="gba:w-4 gba:h-4" />
            Back to Documents
          </Button>
        </div>

        {/* Document Creator - Full height */}
        <div className="gba:flex-1 gba:overflow-hidden">
          <DocumentCreator
            accessToken={accessToken}
            userInfo={userInfo}
            onClose={() => setShowDocumentCreator(false)}
            onSave={doc => {
              console.log('Document saved:', doc)
              setShowDocumentCreator(false)
              // TODO: Save document to backend
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full" data-testid="document-view">
      {/* Banner */}
      {!hideBanner && !navigation.currentArea && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.DOCUMENT}
            title={t('document-welcome-title')}
            subtitle={t('document-welcome-subtitle')}
          />
        </div>
      )}

      {/* ContentEntry Header (when selected) */}
      {navigation.currentArea && (
        <div className="gba:w-full gba:relative">
          {navigation.currentArea.picture && (
            <div
              className="gba:w-full gba:h-80 gba:bg-cover gba:bg-center gba:relative"
              style={{ backgroundImage: `url(${navigation.currentArea.picture})` }}
            >
              <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-black/30 gba:to-black/60" />
            </div>
          )}
          <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:max-w-[1300px] gba:mx-auto gba:px-4 gba:py-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigation.selectArea(null)}
              className="gba:mb-4 gba:text-white gba:hover:bg-white/20 [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000,_0_2px_4px_rgba(0,0,0,0.9)]"
            >
              <Home className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('back_to_areas')}
            </Button>
            <h1 className="gba:text-4xl gba:font-bold gba:mb-2 gba:text-white [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000,_0_3px_6px_rgba(0,0,0,0.9)]">
              {translatedItems?.[navigation.currentArea.id || '']?.title || navigation.currentArea.title}
            </h1>
            {(translatedItems?.[navigation.currentArea.id || '']?.preview || navigation.currentArea.preview) && (
              <p className="gba:text-lg gba:text-white [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000,_0_2px_4px_rgba(0,0,0,0.9)]">
                {translatedItems?.[navigation.currentArea.id || '']?.preview || navigation.currentArea.preview}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4 ${navigation.currentArea ? 'gba:mt-8' : ''}`}
      >
        {/* Level 1: Document Areas (Cards) */}
        {!navigation.currentArea && (
          <div>
            {/* Header with Search */}
            {areasLoading ? (
              <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Skeleton className="gba:h-8 gba:w-8 gba:rounded-md" />
                  <Skeleton className="gba:h-9 gba:w-64" />
                </div>
                <div className="gba:flex gba:gap-2 gba:items-center">
                  <Skeleton className="gba:h-10 gba:w-[300px]" />
                  <Skeleton className="gba:h-10 gba:w-32" />
                </div>
              </div>
            ) : (
              <div className="gba:mb-6 gba:py-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <FileText className="gba:w-8 gba:h-8 gba:text-primary" />
                  <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">{t('document_areas')}</h1>
                </div>
                <div className="gba:flex gba:gap-2 gba:items-center">
                  <SearchInput onSearch={handleSearch} placeholder={t('search_documents')} className="gba:w-[300px]" />
                  <Button
                    onClick={() => setShowDocumentCreator(true)}
                    className="gba:gap-2"
                    data-testid="create-document-button"
                  >
                    <FilePlus className="gba:w-4 gba:h-4" />
                    Create Document
                  </Button>
                  <AppAction
                    variant="create-primary"
                    contexts={[
                      {
                        context: FlowContextName.contentEntryCreate,
                        contextData: { contentGroup: ContentGroup.DOCUMENT }
                      }
                    ]}
                    accessToken={accessToken}
                    data-testid="create-document-area-button"
                  >
                    {t('create_area')}
                  </AppAction>
                </div>
              </div>
            )}

            {areasLoading && (
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="gba:overflow-hidden">
                    <Skeleton className="gba:h-40 gba:w-full" />
                    <div className="gba:p-6 gba:space-y-3">
                      <Skeleton className="gba:h-6 gba:w-3/4" />
                      <Skeleton className="gba:h-4 gba:w-full" />
                      <Skeleton className="gba:h-4 gba:w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {areasError && (
              <div className="gba:text-center gba:py-12 gba:text-destructive">{t('error_loading_areas')}</div>
            )}

            {!areasLoading && !areasError && areas.length === 0 && (
              <div className="gba:text-center gba:py-12">
                <Folder className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mb-4 gba:mx-auto" />
                <p className="gba:text-muted-foreground">{t('no_document_areas')}</p>
              </div>
            )}

            {!areasLoading && !areasError && areas.length > 0 && (
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
                {areas.map(area => {
                  const entityType = getEntityTypeFromContentGroup(area.contentGroup)
                  return (
                    <Card
                      key={area.id}
                      className="gba:cursor-pointer gba:transition-all gba:hover:shadow-lg gba:hover:-translate-y-1"
                      onClick={() => navigation.selectArea(area)}
                      data-testid={`area-card-${area.id}`}
                    >
                      {area.picture && (
                        <div
                          className="gba:w-full gba:h-40 gba:bg-cover gba:bg-center gba:rounded-t-lg"
                          style={{ backgroundImage: `url(${area.picture})` }}
                        />
                      )}
                      <div className="gba:p-6">
                        <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                          <h3 className="gba:text-xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
                            <Folder className="gba:w-5 gba:h-5 gba:text-primary" />
                            {translatedItems?.[area.id || '']?.title || area.title}
                          </h3>
                          {entityType && (
                            <AppAction
                              variant="custom"
                              mode="button"
                              buttonSize="sm"
                              buttonVariant="ghost"
                              shareContext={{
                                entityType,
                                entityId: area.id || '',
                                entityName: area.title || '',
                                entityUrl: buildContentRecordUrl(area.id || '', 'documents')
                              }}
                              accessToken={accessToken}
                              className="gba:p-1 gba:h-auto gba:flex-shrink-0"
                              onClick={e => e.stopPropagation()}
                              data-testid={`document-area-share-${area.id}`}
                            >
                              <Share2 className="gba:w-4 gba:h-4" />
                            </AppAction>
                          )}
                        </div>
                        {(translatedItems?.[area.id || '']?.preview || area.preview) && (
                          <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-3 gba:mb-3">
                            {translatedItems?.[area.id || '']?.preview || area.preview}
                          </p>
                        )}
                        {/* Responsible */}
                        {area.creatorEmployee && (
                          <div className="gba:flex gba:items-center gba:text-sm">
                            <span className="gba:text-muted-foreground gba:mr-1">Responsible:</span>
                            <EmployeeHoverCard employee={area.creatorEmployee}>
                              <span className="gba:cursor-pointer hover:gba:text-primary hover:gba:underline gba:text-foreground">
                                {area.creatorEmployee.displayName ||
                                  `${area.creatorEmployee.firstName || ''} ${area.creatorEmployee.lastName || ''}`.trim()}
                              </span>
                            </EmployeeHoverCard>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Level 2+: Document Management with Full Features */}
        {navigation.currentArea && (
          <div>
            <DocumentSection
              entityId={navigation.currentArea.id}
              documents={documentItems}
              isLoading={contentsLoading}
              error={contentsError ? String(contentsError) : null}
              onRefresh={refetchContents}
              accessToken={accessToken}
              userInfo={userInfo}
              restClient={restClient}
              apiConfig={{
                baseEndpoint: '/content',
                entityFieldName: 'contentEntry',
                documentFieldName: 'contentDocument',
                createEndpoint: 'createContentDocument'
              }}
              uploadActionProps={{
                contextsArray: [FlowContextName.contentDocumentCreate],
                externalContextData: { contentEntryId: navigation.currentArea.id },
                prefixDataTestId: 'content-document-upload'
              }}
              deleteActionProps={{
                contextsArray: [FlowContextName.contentDocumentDelete],
                externalContextData: { contentEntryId: navigation.currentArea.id },
                prefixDataTestId: 'content-document-delete'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentView
