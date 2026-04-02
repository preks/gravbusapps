import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { CheckCircle2, Shield } from 'lucide-react'
import { AppAction } from '@/components/app-action'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { useInfiniteScroll } from '@/common/hooks/useInfiniteScroll'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContentGroup, ContentRole } from '@/common/data/content/constants/contentConstants'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import Banner, { BannerVariant } from '../../components/shared/Banner'
import SearchInput from '../../components/shared/SearchInput'
import translations from '../../_i18n'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { isPinnedPolicyContentEntry } from '@/business-apps/core/content/utils/policyUtils'

const PAGE_SIZE = 30

const POLICY_VIEW_FIELDS: Array<keyof ContentEntry> = [
  'id',
  'title',
  'preview',
  'picture',
  'contentGroup',
  'contentType',
  'creatorEmployee',
  'contentEntryCategories',
  'contentEntryTags',
  'createdAt',
  'updatedAt',
  'recordState',
  'additionalProperties',
  'allowComment',
  'allowReaction',
  'descendantContentEntriesAggregate',
  'contentEntryReactionCounts',
  'childContentEntriesAggregate'
]

interface PoliciesViewProps extends BusinessAppContextProps {
  hideBanner?: boolean
  currentTab?: string
}

const PoliciesView: React.FC<PoliciesViewProps> = ({ accessToken, hideBanner = false, currentTab = 'policies' }) => {
  const { t } = useTranslation(translations)
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')

  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroups: [ContentGroup.POLICY],
      search: searchQuery,
      limit: PAGE_SIZE,
      offset,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }),
    [offset, searchQuery]
  )

  const contentEntriesOptions = useMemo(
    () => ({
      fields: POLICY_VIEW_FIELDS,
      relationLimit: 20,
      relationOffset: 0
    }),
    []
  )

  const {
    entries: fetchedEntries,
    totalCount,
    isLoading,
    error,
    refetch
  } = useContentEntries(queryParams, accessToken, contentEntriesOptions)

  // Accumulate entries for infinite scroll (same pattern as other views)
  const queryKey = useMemo(() => `${searchQuery}`, [searchQuery])
  const lastQueryKeyRef = useRef(queryKey)
  const [allLoadedEntries, setAllLoadedEntries] = useState<typeof fetchedEntries>([])

  useEffect(() => {
    if (queryKey !== lastQueryKeyRef.current) {
      lastQueryKeyRef.current = queryKey
      setOffset(0)
      setAllLoadedEntries([])
    }
  }, [queryKey])

  useEffect(() => {
    if (offset === 0) {
      setAllLoadedEntries(fetchedEntries)
    } else {
      setAllLoadedEntries(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const newEntries = fetchedEntries.filter(e => e.id && !existingIds.has(e.id))
        return [...prev, ...newEntries]
      })
    }
  }, [fetchedEntries, offset])

  useProcessCompletion({
    onSuccess: () => {
      refetch()
    }
  })

  const filteredPolicies = useMemo(() => {
    return allLoadedEntries.filter(p => {
      const recordState = String((p as any)?.recordState || '').toLowerCase()
      const isDraft = recordState.includes('draft')
      const isActive = !isDraft

      if (statusFilter === 'draft' && !isDraft) return false
      if (statusFilter === 'active' && !isActive) return false

      return true
    })
  }, [allLoadedEntries, statusFilter])

  const isInitialLoad = offset === 0 && allLoadedEntries.length === 0
  const showLoading = isLoading || isInitialLoad
  const hasMore = allLoadedEntries.length > 0 && allLoadedEntries.length < totalCount

  const sentinelRef = useInfiniteScroll({
    onLoadMore: () => setOffset(prev => prev + PAGE_SIZE),
    hasMore,
    isLoading: showLoading
  })

  const handleSearch = (query: string) => setSearchQuery(query)

  if (error) {
    return (
      <div className="gba:p-6" data-testid="policies-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error?.message || String(error)}
            <Button onClick={refetch} variant="outline" className="gba:mt-2 gba:ml-4">
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:w-full"
      data-testid="policies-view"
    >
      {!hideBanner && (
        <div className="gba:w-full">
          <Banner
            variant={BannerVariant.KNOWLEDGE}
            title={t('policies-welcome-title')}
            subtitle={t('policies-welcome-subtitle')}
          />
        </div>
      )}

      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {isLoading ? (
          <div className="gba:mb-6 gba:pt-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <Skeleton className="gba:h-5 gba:w-48" />
            <div className="gba:flex gba:gap-2 gba:items-center">
              <Skeleton className="gba:h-10 gba:w-[300px]" />
              <Skeleton className="gba:h-10 gba:w-32" />
            </div>
          </div>
        ) : (
          <div className="gba:mb-6 gba:pt-6 gba:flex gba:justify-between gba:items-center gba:gap-4">
            <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              {t('policies')}
            </h3>
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:items-center gba:justify-end">
              <SearchInput
                onSearch={handleSearch}
                placeholder={t('search_policies')}
                className="gba:w-[300px]"
                data-testid="policies-view-search"
              />

              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="gba:w-[150px]" data-testid="policies-view-filter-status">
                  <SelectValue placeholder={t('policies_filter_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('policies_filter_status_all')}</SelectItem>
                  <SelectItem value="active">{t('policies_filter_status_active')}</SelectItem>
                  <SelectItem value="draft">{t('policies_filter_status_draft')}</SelectItem>
                </SelectContent>
              </Select>

              <AppAction
                contexts={[
                  {
                    context: FlowContextName.contentEntryCreate,
                    contextData: { contentGroup: ContentGroup.POLICY }
                  }
                ]}
                accessToken={accessToken}
                emptyState="enable"
                lazyLoad
                data-testid="policies-view-create-button"
              >
                <Button>{t('create_policy')}</Button>
              </AppAction>
            </div>
          </div>
        )}

        {/* Policies table */}
        {showLoading ? (
          <div className="gba:space-y-3 gba:mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="gba:h-14 gba:w-full gba:rounded-lg" />
            ))}
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="gba:text-center gba:py-12" data-testid="policies-view-empty">
            <p className="gba:text-muted-foreground">{t('no_policies_found')}</p>
          </div>
        ) : (
          <div
            className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden gba:mb-6"
            data-testid="policies-view-table"
          >
            {/* Table header */}
            <div className="gba:hidden gba:md:grid gba:md:grid-cols-12 gba:gap-4 gba:px-4 gba:py-2.5 gba:bg-muted/50 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
              <div className="gba:col-span-5">{t('policies_col_title')}</div>
              <div className="gba:col-span-2">{t('policies_col_owner')}</div>
              <div className="gba:col-span-2">{t('policies_col_status')}</div>
              <div className="gba:col-span-3 gba:text-right">{t('policies_col_updated')}</div>
            </div>

            {/* Table rows */}
            <div className="gba:divide-y gba:divide-border">
              {filteredPolicies.map(item => {
                const entry = item as any
                const recordState = String(entry?.recordState || '').toLowerCase()
                const isDraft = recordState.includes('draft')
                const ownerName = entry?.creatorEmployee?.displayName || entry?.createdBy || null
                const ownerPic = entry?.creatorEmployee?.pictureThumbnail || entry?.creatorEmployee?.picture || null
                const ownerPicUrl = ownerPic
                  ? ownerPic.startsWith('data:')
                    ? ownerPic
                    : `data:image/png;base64,${ownerPic}`
                  : null
                const updatedAt = entry?.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : '—'
                const isPinned = isPinnedPolicyContentEntry(item)

                const handleRowClick = () => {
                  const url = buildPlatformUrl('/platform/content/intranet/content-record', {
                    contentId: item.id,
                    ...(currentTab && { tab: currentTab })
                  })
                  navigateTo(url)
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={handleRowClick}
                    className="gba:w-full gba:text-left gba:grid gba:grid-cols-1 gba:md:grid-cols-12 gba:gap-2 gba:md:gap-4 gba:px-4 gba:py-3 gba:hover:bg-accent gba:transition-colors gba:cursor-pointer gba:group"
                    data-testid={`policy-row-${item.id}`}
                  >
                    {/* Title + preview */}
                    <div className="gba:col-span-5 gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <div className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted gba:group-hover:bg-accent-foreground/10 gba:transition-colors">
                        <Shield className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      </div>
                      <div className="gba:min-w-0">
                        <div className="gba:font-medium gba:truncate gba:group-hover:text-primary gba:transition-colors">
                          {isPinned && (
                            <span className="gba:text-amber-500 gba:mr-1" title="Pinned">
                              ★
                            </span>
                          )}
                          {item.title}
                        </div>
                        {item.preview && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[400px]">
                            {item.preview}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Owner */}
                    <div className="gba:col-span-2 gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
                      {ownerPicUrl ? (
                        <img
                          src={ownerPicUrl}
                          alt=""
                          className="gba:h-5 gba:w-5 gba:rounded-full gba:object-cover gba:shrink-0"
                        />
                      ) : ownerName ? (
                        <span className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-semibold gba:uppercase gba:text-muted-foreground gba:shrink-0">
                          {ownerName.charAt(0)}
                        </span>
                      ) : null}
                      <span className="gba:text-sm gba:truncate">{ownerName || '—'}</span>
                    </div>

                    {/* Status */}
                    <div className="gba:col-span-2 gba:flex gba:items-center">
                      {isDraft ? (
                        <Badge variant="outline" className="gba:text-amber-600 gba:border-amber-300 gba:bg-amber-50">
                          Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gba:text-green-700 gba:border-green-300 gba:bg-green-50">
                          <CheckCircle2 className="gba:h-3 gba:w-3 gba:mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Updated */}
                    <div className="gba:col-span-3 gba:flex gba:items-center gba:justify-end gba:text-sm gba:text-muted-foreground">
                      {updatedAt}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {hasMore && <div ref={sentinelRef} className="gba:h-4" />}
      </div>
    </div>
  )
}

export default React.memo(PoliciesView)
