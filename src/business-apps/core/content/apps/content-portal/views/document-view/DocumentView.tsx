import React from 'react'
import { useTranslation, Button, Badge, Card, Separator } from '@newwork/nw-design-system'
import { ChevronRight, FileText, Folder, FolderTree, X } from 'lucide-react'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDocumentNavigation } from '../../hooks/useDocumentNavigation'
import { useDocumentAreas, useFolderContents } from '../../hooks/useDocumentData'
import { useContentTypes } from '../../hooks/useContentTypes'
import { useCatalogEntries } from '@/common/data/catalog'
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
 * New Hierarchy:
 * 1. ContentTypes (e.g., "Contracts", "Policies", "Manuals")
 * 2. Categories (optional multi-select filtering)
 * 3. ContentEntries (Document Areas)
 * 4. ContentDocuments (Folders & Files)
 */
const DocumentView: React.FC<DocumentViewProps> = ({ accessToken, hideBanner = false }) => {
  const { t } = useTranslation(translations)
  const navigation = useDocumentNavigation()

  // Load ContentTypes and Categories
  const { typeValues: contentTypes, isLoading: typesLoading } = useContentTypes(accessToken)
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [categories, setCategories] = React.useState<Array<{ id: string; value: string }>>([])
  const [categoriesLoading, setCategoriesLoading] = React.useState(false)

  // Load categories
  React.useEffect(() => {
    const loadCategories = async () => {
      if (!accessToken) return
      setCategoriesLoading(true)
      try {
        const result = await fetchCatalogEntriesByIdentifier('ContentCategory', { limit: 100, offset: 0 })
        setCategories(result.entries.map(e => ({ id: e.id, value: e.value })))
      } catch (err) {
        console.error('Error loading categories:', err)
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  // Fetch document areas (filtered by type and categories)
  const {
    areas,
    isLoading: areasLoading,
    error: areasError
  } = useDocumentAreas(accessToken, navigation.currentType?.id, navigation.selectedCategories)

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
        {/* Left Sidebar - Types > Areas Navigation */}
        <div className="gba:w-[280px] gba:shrink-0">
          <div className="gba:sticky gba:top-6 gba:space-y-4">
            {/* Content Types Section */}
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
                <FolderTree className="gba:w-5 gba:h-5" />
                {t('document_types')}
              </h3>

              {typesLoading && (
                <div className="gba:flex gba:justify-center gba:py-8">
                  <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary"></div>
                </div>
              )}

              {!typesLoading && contentTypes.length > 0 && (
                <div className="gba:space-y-2">
                  {contentTypes
                    .filter(type => type.parentEntryId === 'ContentGroup:v1:DOCUMENT')
                    .map(type => (
                      <button
                        key={type.id}
                        onClick={() => navigation.selectType(type as any)}
                        className={`gba:w-full gba:text-left gba:p-3 gba:rounded-lg gba:transition-colors gba:flex gba:items-center gba:justify-between ${
                          navigation.currentType?.id === type.id
                            ? 'gba:bg-primary gba:text-primary-foreground'
                            : 'gba:bg-muted gba:hover:bg-muted/80'
                        }`}
                        data-testid={`type-button-${type.id}`}
                      >
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <FileText className="gba:w-4 gba:h-4" />
                          <span className="gba:font-medium">{type.name}</span>
                        </span>
                        <ChevronRight className="gba:w-4 gba:h-4" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Document Areas Section (shown when type is selected) */}
            {navigation.currentType && (
              <>
                <Separator />
                <div>
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-3 gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                    <Folder className="gba:w-4 gba:h-4" />
                    {t('document_areas')}
                  </h3>

                  {areasLoading && (
                    <div className="gba:flex gba:justify-center gba:py-4">
                      <div className="gba:animate-spin gba:rounded-full gba:h-6 gba:w-6 gba:border-b-2 gba:border-primary"></div>
                    </div>
                  )}

                  {areasError && (
                    <div className="gba:text-sm gba:text-destructive gba:p-3 gba:border gba:border-destructive gba:rounded-lg">
                      {t('error_loading_areas')}
                    </div>
                  )}

                  {!areasLoading && !areasError && areas.length === 0 && (
                    <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                      {t('no_document_areas')}
                    </div>
                  )}

                  {!areasLoading && !areasError && areas.length > 0 && (
                    <div className="gba:space-y-1">
                      {areas.map(area => (
                        <button
                          key={area.id}
                          onClick={() => navigation.selectArea(area)}
                          className={`gba:w-full gba:text-left gba:p-2 gba:rounded-md gba:transition-colors gba:text-sm ${
                            navigation.currentArea?.id === area.id
                              ? 'gba:bg-primary gba:text-primary-foreground'
                              : 'gba:bg-card gba:hover:bg-accent'
                          }`}
                          data-testid={`area-button-${area.id}`}
                        >
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span>📚</span>
                            <div className="gba:flex-1 gba:min-w-0">
                              <div className="gba:font-medium gba:truncate">{area.title}</div>
                              <div className="gba:text-xs gba:opacity-75 gba:mt-0.5">
                                {area.documentCount} {t('documents')}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Content - Categories Filter + Documents */}
        <div className="gba:flex-1 gba:min-w-0">
          {!navigation.currentType ? (
            <>
              {/* Header with Create Action */}
              <div className="gba:flex gba:items-center gba:justify-end gba:mb-6">
                <AppAction
                  contextsArray={[FlowContextName.contentEntryCreate]}
                  externalContextData={{
                    contentGroup: 'ContentGroup:v1:DOCUMENT'
                  }}
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                  data-testid="document-view-create-area-top"
                >
                  <Button>{t('create_document_area')}</Button>
                </AppAction>
              </div>

              {/* Empty State */}
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:text-center">
                <div className="gba:text-6xl gba:mb-4">📋</div>
                <h3 className="gba:text-xl gba:font-semibold gba:mb-2">{t('select_document_type')}</h3>
                <p className="gba:text-muted-foreground gba:max-w-md">{t('select_document_type_description')}</p>
              </div>
            </>
          ) : !navigation.currentArea ? (
            <>
              {/* Header with Create Action */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
                <div>
                  <h2 className="gba:text-xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
                    <FileText className="gba:w-5 gba:h-5" />
                    {navigation.currentType?.value}
                  </h2>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                    {t('select_or_create_document_area')}
                  </p>
                </div>
                <AppAction
                  contextsArray={[FlowContextName.contentEntryCreate]}
                  externalContextData={{
                    contentGroup: 'ContentGroup:v1:DOCUMENT',
                    contentType: navigation.currentType?.id
                  }}
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                  data-testid="document-view-create-area"
                >
                  <Button>{t('create_document_area')}</Button>
                </AppAction>
              </div>

              {/* Category Filter Bar */}
              {!categoriesLoading && categories.length > 0 && (
                <Card className="gba:p-4 gba:mb-6">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <h4 className="gba:text-sm gba:font-semibold">{t('filter_by_categories')}</h4>
                    {navigation.selectedCategories.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={navigation.clearCategories}
                        className="gba:h-7 gba:px-2"
                        data-testid="clear-categories"
                      >
                        {t('clear_all')}
                      </Button>
                    )}
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {categories.map(category => {
                      const isSelected = navigation.selectedCategories.includes(category.id)
                      return (
                        <Badge
                          key={category.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="gba:cursor-pointer gba:transition-colors gba:px-3 gba:py-1"
                          onClick={() => navigation.toggleCategory(category.id, category.value)}
                          data-testid={`category-filter-${category.id}`}
                        >
                          {category.value}
                          {isSelected && <X className="gba:ml-1 gba:w-3 gba:h-3" />}
                        </Badge>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Empty State - Select Area */}
              {areas.length === 0 && !areasLoading && (
                <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[300px] gba:text-center">
                  <div className="gba:text-6xl gba:mb-4">📁</div>
                  <h3 className="gba:text-xl gba:font-semibold gba:mb-2">{t('no_document_areas')}</h3>
                  <p className="gba:text-muted-foreground gba:max-w-md">{t('create_first_document_area')}</p>
                </div>
              )}

              {/* Areas Grid View */}
              {areas.length > 0 && !areasLoading && (
                <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                  {areas.map(area => (
                    <button
                      key={area.id}
                      onClick={() => navigation.selectArea(area)}
                      className="gba:p-6 gba:bg-card gba:border gba:border-border gba:rounded-lg gba:text-left gba:transition-all gba:hover:shadow-md gba:hover:border-primary"
                      data-testid={`area-card-${area.id}`}
                    >
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <span className="gba:text-4xl">📚</span>
                        <div className="gba:flex-1 gba:min-w-0">
                          <h3 className="gba:font-semibold gba:text-lg gba:truncate gba:mb-2">{area.title}</h3>
                          <div className="gba:flex gba:gap-4 gba:text-sm gba:text-muted-foreground">
                            <span>
                              {area.documentCount} {t('documents')}
                            </span>
                            {area.categoryCount > 0 && (
                              <span>
                                {area.categoryCount} {t('categories')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
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
                        className={`gba:font-medium gba:transition-colors gba:flex gba:items-center gba:gap-1 ${
                          index === navigation.breadcrumbs.length - 1
                            ? 'gba:text-foreground'
                            : 'gba:text-primary gba:hover:underline'
                        }`}
                        data-testid={`breadcrumb-${index}`}
                      >
                        {crumb.type === 'type' && <FileText className="gba:w-4 gba:h-4" />}
                        {crumb.type === 'area' && <span>📚</span>}
                        {crumb.type === 'folder' && <span>📁</span>}
                        <span>{crumb.title}</span>
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
