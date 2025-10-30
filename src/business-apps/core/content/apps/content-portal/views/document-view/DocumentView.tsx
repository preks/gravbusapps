import React from 'react'
import { useTranslation, Button } from '@newwork/nw-design-system'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDocumentNavigation } from '../../hooks/useDocumentNavigation'
import { useDocumentAreas, useFolderContents } from '../../hooks/useDocumentData'
import translations from '../../_i18n'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface DocumentViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
  allowedReactions?: string[]
  reactionCatalogMap?: Record<string, string>
}

/**
 * Document View - Complete Document Management System
 *
 * Architecture:
 * - Left Sidebar: Document Areas (Content Entries) + Folder Tree
 * - Right Content: Breadcrumb + Grid/List View of Folders & Documents
 * - App Actions: Upload, Create Folder, Move, Delete
 */
const DocumentView: React.FC<DocumentViewProps> = ({ accessToken, hideBanner = false }) => {
  const { t } = useTranslation(translations)
  const navigation = useDocumentNavigation()

  // Fetch document areas (Content Entries)
  const { areas, isLoading: areasLoading, error: areasError } = useDocumentAreas(accessToken)

  // Fetch folders/documents for current location
  const {
    folders,
    documents,
    isLoading: contentsLoading,
    error: contentsError
  } = useFolderContents(accessToken, navigation.currentArea?.id || null, navigation.currentFolderId)

  return (
    <div className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:w-full" data-testid="document-view">
      {/* Banner */}
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.DOCUMENT}
            title={t('document-welcome-title')}
            subtitle={t('document-welcome-subtitle')}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="gba:flex gba:flex-1 gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-4 gba:py-6 gba:gap-6">
        {/* Left Sidebar - Areas + Folder Tree */}
        <div className="gba:w-[280px] gba:shrink-0">
          <div className="gba:sticky gba:top-6">
            <h3 className="gba:text-lg gba:font-semibold gba:mb-4">{t('document_areas')}</h3>

            {areasLoading && (
              <div className="gba:flex gba:justify-center gba:py-8">
                <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
              </div>
            )}

            {areasError && (
              <div className="gba:text-sm gba:text-destructive gba:p-4 gba:border gba:border-destructive gba:rounded-lg">
                {t('error_loading_areas')}
              </div>
            )}

            {!areasLoading && !areasError && areas.length === 0 && (
              <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
                {t('no_document_areas')}
              </div>
            )}

            {!areasLoading && !areasError && areas.length > 0 && (
              <div className="gba:space-y-2">
                {areas.map(area => (
                  <button
                    key={area.id}
                    onClick={() => navigation.selectArea(area as any)}
                    className={`gba:w-full gba:text-left gba:p-3 gba:rounded-lg gba:transition-colors ${
                      navigation.currentArea?.id === area.id
                        ? 'gba:bg-primary gba:text-primary-foreground'
                        : 'gba:bg-muted gba:hover:bg-muted/80'
                    }`}
                    data-testid={`area-button-${area.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-lg">📚</span>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:font-medium gba:truncate">{area.title}</div>
                        <div className="gba:text-xs gba:opacity-75 gba:mt-1">
                          {area.documentCount} {t('documents')}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Documents */}
        <div className="gba:flex-1 gba:min-w-0">
          {!navigation.currentArea ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:text-center">
              <div className="gba:text-6xl gba:mb-4">📁</div>
              <h3 className="gba:text-xl gba:font-semibold gba:mb-2">{t('select_document_area')}</h3>
              <p className="gba:text-muted-foreground gba:max-w-md">{t('select_document_area_description')}</p>
            </div>
          ) : (
            <>
              {/* Header with Breadcrumb + Action Buttons */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                {/* Breadcrumb Navigation */}
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                  {navigation.breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id}>
                      {index > 0 && <span className="gba:text-muted-foreground">/</span>}
                      <button
                        onClick={() => navigation.navigateToBreadcrumb(index)}
                        className={`gba:font-medium gba:transition-colors ${
                          index === navigation.breadcrumbs.length - 1
                            ? 'gba:text-foreground'
                            : 'gba:text-primary gba:hover:underline'
                        }`}
                        data-testid={`breadcrumb-${index}`}
                      >
                        {crumb.type === 'area' ? '📚' : '📁'} {crumb.title}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="gba:flex gba:gap-2">
                  <AppAction
                    contextsArray={[FlowContextName.contentDocumentCreate]}
                    externalContextData={{
                      contentEntryId: navigation.currentArea?.id,
                      parentFolderId: navigation.currentFolderId
                    }}
                    accessToken={accessToken}
                    emptyStateBehavior="enable"
                    deferMainContextRequestsUntilClick
                    data-testid="document-view-create-document"
                  >
                    <Button>{t('create_document')}</Button>
                  </AppAction>
                </div>
              </div>

              {/* Loading State */}
              {contentsLoading && (
                <div className="gba:flex gba:justify-center gba:py-12">
                  <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary"></div>
                </div>
              )}

              {/* Error State */}
              {contentsError && (
                <div className="gba:text-sm gba:text-destructive gba:p-6 gba:border gba:border-destructive gba:rounded-lg">
                  {t('error_loading_contents')}
                </div>
              )}

              {/* Empty State */}
              {!contentsLoading && !contentsError && folders.length === 0 && documents.length === 0 && (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
                  <div className="gba:text-4xl gba:mb-4">📂</div>
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('no_content_yet')}</h3>
                  <p className="gba:text-muted-foreground gba:max-w-md gba:mb-6">{t('no_content_yet_description')}</p>
                  {/* TODO: Add create folder/upload buttons */}
                </div>
              )}

              {/* Folders + Documents Grid */}
              {!contentsLoading && !contentsError && (folders.length > 0 || documents.length > 0) && (
                <div className="gba:space-y-6">
                  {/* Folders Section */}
                  {folders.length > 0 && (
                    <div>
                      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3">{t('folders')}</h3>
                      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
                        {folders.map(folder => (
                          <button
                            key={folder.id}
                            onClick={() => navigation.navigateToFolder(folder)}
                            className="gba:p-4 gba:bg-card gba:border gba:border-border gba:rounded-lg gba:text-left gba:transition-all gba:hover:shadow-md gba:hover:border-primary"
                            data-testid={`folder-${folder.id}`}
                          >
                            <div className="gba:flex gba:items-start gba:gap-3">
                              <span className="gba:text-3xl">📁</span>
                              <div className="gba:flex-1 gba:min-w-0">
                                <div className="gba:font-medium gba:truncate">{folder.name}</div>
                                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                                  {folder.childDocuments?.length || 0} {t('items')}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {documents.length > 0 && (
                    <div>
                      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3">
                        {t('documents')}
                      </h3>
                      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
                        {documents.map(doc => {
                          // Extract file extension from originalFileName or mimeType
                          const originalFileName = doc.fileInfo?.fileMetadata?.originalFileName
                          const fileExtension = originalFileName
                            ? originalFileName.split('.').pop()?.toUpperCase()
                            : doc.fileInfo?.fileMetadata?.mimeType?.split('/')[1]?.toUpperCase()

                          return (
                            <div
                              key={doc.id}
                              className="gba:p-4 gba:bg-card gba:border gba:border-border gba:rounded-lg gba:transition-all gba:hover:shadow-md"
                              data-testid={`document-${doc.id}`}
                            >
                              <div className="gba:flex gba:items-start gba:gap-3">
                                <span className="gba:text-3xl">📄</span>
                                <div className="gba:flex-1 gba:min-w-0">
                                  <div className="gba:font-medium gba:truncate">{doc.name}</div>
                                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                                    {fileExtension || 'FILE'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentView
