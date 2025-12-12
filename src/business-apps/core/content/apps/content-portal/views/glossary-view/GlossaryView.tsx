import React, { useState, useMemo } from 'react'
import {
  useTranslation,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Input,
  Label
} from '@newwork/nw-design-system'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentRole, ContentGroup } from '@/common/data/content/types/contentEnums'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { Book, Plus, RefreshCw } from 'lucide-react'
import translations from '../../_i18n'

const PAGE_SIZE = 100

interface GlossaryViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
}

const statusToBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'info' => {
  switch (status) {
    case 'PUBLISHED':
      return 'success'
    case 'DRAFT':
      return 'info'
    default:
      return 'default'
  }
}

const GlossaryView: React.FC<GlossaryViewProps> = ({
  accessToken,
  userInfo,
  hideBanner = false,
  currentTab = 'glossary'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL')

  const currentUserName =
    [userInfo?.givenName, userInfo?.familyName].filter(Boolean).join(' ') || userInfo?.userName || 'Unknown'

  // Memoize params
  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroupRef: ContentGroup.GLOSSARY,
      search: searchQuery,
      limit: PAGE_SIZE,
      offset: 0,
      sortBy: 'title' as const,
      sortOrder: 'ASC' as const
    }),
    [searchQuery]
  )

  // Use central content data
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Listen for process completion to refresh data
  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  // Filter entries by status client-side
  const visibleTerms = useMemo(() => {
    let filtered = entries
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(item => item.status === statusFilter)
    }
    return filtered
  }, [entries, statusFilter])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _hideBanner = hideBanner
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _currentTab = currentTab

  return (
    <div
      className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:w-full"
      data-testid="glossary-view"
    >
      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mt-6 gba:mb-6">
          <div className="gba:flex gba:items-start gba:gap-3">
            <div className="gba:mt-1 gba:bg-muted gba:rounded-lg gba:p-2" data-testid="glossary-view-icon">
              <Book className="gba:w-5 gba:h-5 gba:text-foreground" />
            </div>
            <div>
              <h2
                className="gba:text-2xl gba:md:text-3xl gba:text-foreground gba:font-semibold"
                data-testid="glossary-view-title"
              >
                {t('glossary')}
              </h2>
              <p className="gba:text-muted-foreground" data-testid="glossary-view-subtitle">
                {t('glossary-subtitle')}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1" data-testid="glossary-view-user">
                {t('viewing-as')}: {currentUserName}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:gap-2 gba:shrink-0">
            <Button onClick={() => refetch()} variant="outline" data-testid="glossary-refresh-button">
              <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('refresh')}
            </Button>
            <AppAction
              contexts={[
                {
                  context: FlowContextName.contentEntryCreate,
                  contextData: { contentGroup: ContentGroup.GLOSSARY }
                }
              ]}
              accessToken={accessToken}
              emptyState="enable"
              lazyLoad
              data-testid="glossary-create-button"
            >
              <Button data-testid="glossary-add-term-button">
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('glossary-add-term')}
              </Button>
            </AppAction>
          </div>
        </div>

        {/* Search + Status Filters */}
        <div
          className="gba:grid gba:grid-cols-1 gba:md:grid-cols-[1fr_auto] gba:gap-4 gba:mb-6"
          data-testid="glossary-controls"
        >
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label htmlFor="glossary-search" className="gba:sr-only">
              {t('search')}
            </Label>
            <Input
              id="glossary-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('glossary-search-placeholder')}
              data-testid="glossary-search-input"
            />
            <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="glossary-status-filters">
              <Button
                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
                data-testid="glossary-filter-all-button"
              >
                {t('all')} ({totalCount})
              </Button>
              <Button
                variant={statusFilter === 'PUBLISHED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('PUBLISHED')}
                data-testid="glossary-filter-published-button"
              >
                {t('glossary-published')}
              </Button>
              <Button
                variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('DRAFT')}
                data-testid="glossary-filter-draft-button"
              >
                {t('glossary-draft')}
              </Button>
            </div>
          </div>

          <div
            className="gba:flex gba:items-center gba:justify-end gba:text-sm gba:text-muted-foreground"
            data-testid="glossary-results-count"
          >
            {t('glossary-results-count', { count: visibleTerms.length })}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="gba:text-center gba:py-12" data-testid="glossary-loading">
            <p className="gba:text-muted-foreground">{t('loading')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="gba:py-6" data-testid="glossary-error">
            <Alert variant="destructive">
              <AlertTitle>{t('error')}</AlertTitle>
              <AlertDescription>
                {error.message || String(error)}
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="gba:mt-2 gba:ml-4"
                  data-testid="glossary-retry-button"
                >
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && visibleTerms.length === 0 && (
          <div
            className="gba:text-center gba:py-12 gba:bg-card gba:rounded-lg gba:border gba:border-border"
            data-testid="glossary-empty-state"
          >
            <Book className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
            <p className="gba:text-muted-foreground gba:mb-4" data-testid="glossary-empty-message">
              {t('glossary-empty')}
            </p>
            <AppAction
              contexts={[
                {
                  context: FlowContextName.contentEntryCreate,
                  contextData: { contentGroup: ContentGroup.GLOSSARY }
                }
              ]}
              accessToken={accessToken}
              emptyState="enable"
              lazyLoad
              data-testid="glossary-empty-create-button"
            >
              <Button data-testid="glossary-empty-add-term-button">
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('glossary-add-term')}
              </Button>
            </AppAction>
          </div>
        )}

        {/* Terms list */}
        <div className="gba:space-y-4" data-testid="glossary-list">
          {!isLoading &&
            !error &&
            visibleTerms.map(item => (
              <div
                key={item.id}
                className="gba:bg-card gba:rounded-lg gba:border gba:border-border gba:p-6"
                data-testid={`glossary-item-${item.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                  <div className="gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-2 gba:mb-2">
                      <h3
                        className="gba:text-lg gba:md:text-xl gba:font-bold gba:text-foreground"
                        data-testid={`glossary-item-title-${item.id}`}
                      >
                        {item.title}
                      </h3>
                      <Badge
                        variant={statusToBadgeVariant(item.status)}
                        className="gba:text-xs"
                        data-testid={`glossary-item-status-${item.id}`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    {item.preview ? (
                      <p
                        className="gba:text-muted-foreground gba:mb-3"
                        data-testid={`glossary-item-definition-${item.id}`}
                      >
                        {item.preview}
                      </p>
                    ) : (
                      <p
                        className="gba:text-muted-foreground gba:italic gba:mb-3"
                        data-testid={`glossary-item-definition-empty-${item.id}`}
                      >
                        {t('glossary-no-definition')}
                      </p>
                    )}

                    <div
                      className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-1 gba:text-sm gba:text-muted-foreground"
                      data-testid={`glossary-item-meta-${item.id}`}
                    >
                      {item.authorName && (
                        <span data-testid={`glossary-item-author-${item.id}`}>
                          {t('glossary-created-by')}: {item.authorName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default GlossaryView
