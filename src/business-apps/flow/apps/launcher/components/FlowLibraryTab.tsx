import React, { useMemo } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  Spinner
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useServicePortalCategories, type CategoryGroup } from '@/business-apps/ser/hooks/useServicePortalCategories'
import { useFlowTemplateLibrary } from '../hooks/useFlowTemplateLibrary'
import { FlowLibraryCategoryTile } from './FlowLibraryCategoryTile'
import { FlowTemplateLibraryCard } from './FlowTemplateLibraryCard'
import { computeItemsByCategory } from './flowLibraryUtils'

export interface FlowLibraryTabProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  selectedCategoryId: string | null
  onCategorySelect: (categoryId: string) => void
  onStartTemplate: (templateId: string) => void
  onViewTemplateDetails?: (templateId: string) => void
  'data-testid'?: string
}

const matchesQuery = (value: string | undefined, query: string): boolean => {
  if (!query.trim()) return true
  return (value || '').toLowerCase().includes(query.toLowerCase())
}

const filterGroupsByQuery = (
  groups: CategoryGroup[],
  query: string,
  categoryToCount: Map<string, number>
): CategoryGroup[] => {
  if (!query.trim()) {
    return groups
  }

  return groups
    .map(group => {
      const filteredCategories = group.categories.filter(c => {
        const count = categoryToCount.get(c.id) || 0
        const categoryMatches = matchesQuery(c.name, query) || matchesQuery(c.description, query)
        return categoryMatches || count > 0
      })
      return { ...group, categories: filteredCategories }
    })
    .filter(g => g.categories.length > 0)
}

export const FlowLibraryTab: React.FC<FlowLibraryTabProps> = ({
  accessToken,
  selectedCategoryId,
  onCategorySelect,
  onStartTemplate,
  onViewTemplateDetails,
  'data-testid': testId = 'flow-launcher-library'
}) => {
  const {
    categories,
    categoryGroups,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useServicePortalCategories({ accessToken })

  const { items, isLoading, error, search, debouncedSearch, setSearch, hasNextPage, loadMore } = useFlowTemplateLibrary(
    accessToken,
    {
      enabled: Boolean(accessToken),
      limit: 100,
      includeDrafts: true,
      onlyLatest: true
    }
  )

  const knownCategoryIds = useMemo(() => new Set(categories.map(c => c.id)), [categories])
  const { byCategoryId, uncategorized } = useMemo(
    () => computeItemsByCategory(items, knownCategoryIds),
    [items, knownCategoryIds]
  )

  const categoryToCount = useMemo(() => {
    const map = new Map<string, number>()
    categories.forEach(c => map.set(c.id, (byCategoryId.get(c.id) || []).length))
    return map
  }, [byCategoryId, categories])

  const visibleGroups = useMemo(() => {
    return filterGroupsByQuery(categoryGroups, debouncedSearch, categoryToCount)
  }, [categoryGroups, categoryToCount, debouncedSearch])

  const selectedItems = useMemo(() => {
    if (!selectedCategoryId) return []
    if (selectedCategoryId === 'uncategorized') return uncategorized
    return byCategoryId.get(selectedCategoryId) || []
  }, [byCategoryId, selectedCategoryId, uncategorized])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'uncategorized') return null
    return categories.find(c => c.id === selectedCategoryId) || null
  }, [categories, selectedCategoryId])

  const headerTitle = selectedCategoryId
    ? selectedCategoryId === 'uncategorized'
      ? 'Uncategorized'
      : selectedCategory?.name || 'Category'
    : 'Categories'

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" data-testid={testId}>
      <Card className="gba:bg-background gba:border gba:border-border">
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <span data-testid={`${testId}-header-title`}>{headerTitle}</span>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                data-testid={`${testId}-search`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearch('')}
                disabled={!search.trim()}
                data-testid={`${testId}-search-clear`}
              >
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:pt-0 gba:space-y-3">
          <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-summary`}>
            {selectedCategoryId ? (
              <span>
                Showing {selectedItems.length} flow{selectedItems.length === 1 ? '' : 's'}
              </span>
            ) : (
              <span>{items.length > 0 ? `${items.length} templates loaded` : 'Browse flow categories'}</span>
            )}
          </div>

          {(categoriesLoading || isLoading) && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10" data-testid={`${testId}-loading`}>
              <Spinner size="lg" />
            </div>
          )}

          {categoriesError ? (
            <Alert variant="destructive" data-testid={`${testId}-categories-error`}>
              <div className="gba:space-y-2">
                <div className="gba:font-medium">Failed to load categories</div>
                <div className="gba:text-sm">{categoriesError}</div>
              </div>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive" data-testid={`${testId}-templates-error`}>
              <div className="gba:space-y-2">
                <div className="gba:font-medium">Failed to load templates</div>
                <div className="gba:text-sm">{error}</div>
              </div>
            </Alert>
          ) : null}

          {!selectedCategoryId ? (
            <div className="gba:flex gba:flex-col gba:gap-6" data-testid={`${testId}-groups`}>
              {visibleGroups.map(group => (
                <div key={group.id} className="gba:space-y-3" data-testid={`${testId}-group-${group.id}`}>
                  <div>
                    <div className="gba:text-sm gba:font-medium">{group.name}</div>
                    {group.description ? (
                      <div className="gba:text-sm gba:text-muted-foreground">{group.description}</div>
                    ) : null}
                  </div>
                  <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-3">
                    {group.categories.map(category => (
                      <FlowLibraryCategoryTile
                        key={category.id}
                        category={category}
                        templateCount={categoryToCount.get(category.id) || 0}
                        onClick={() => onCategorySelect(category.id)}
                        testId={`${testId}-category-${category.id}`}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {uncategorized.length > 0 ? (
                <div className="gba:space-y-3" data-testid={`${testId}-group-uncategorized`}>
                  <Separator />
                  <div>
                    <div className="gba:text-sm gba:font-medium">Uncategorized</div>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      Templates without a valid service category tag
                    </div>
                  </div>
                  <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-3">
                    <Card
                      className="gba:bg-background gba:border gba:border-border"
                      data-testid={`${testId}-category-uncategorized-card`}
                    >
                      <CardContent className="gba:p-0">
                        <button
                          type="button"
                          onClick={() => onCategorySelect('uncategorized')}
                          className="gba:w-full gba:p-4 gba:flex gba:items-center gba:justify-between gba:text-left gba:hover:bg-accent/10 gba:transition-colors gba:!cursor-pointer gba:rounded-lg gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring"
                          data-testid={`${testId}-category-uncategorized`}
                        >
                          <div className="gba:font-medium">Uncategorized</div>
                          <div className="gba:text-sm gba:text-muted-foreground">{uncategorized.length}</div>
                        </button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}

              {hasNextPage ? (
                <div className="gba:flex gba:justify-center" data-testid={`${testId}-load-more`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadMore()}
                    data-testid={`${testId}-load-more-button`}
                  >
                    Load more templates
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${testId}-category-detail`}>
              <div className="gba:flex gba:items-center gba:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onCategorySelect('')}
                  data-testid={`${testId}-back-to-categories`}
                >
                  Back to categories
                </Button>
              </div>

              {selectedItems.length === 0 ? (
                <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-empty-category`}>
                  No flows found for this category.
                </div>
              ) : (
                <div
                  className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-3 gba:gap-4"
                  data-testid={`${testId}-template-list`}
                >
                  {selectedItems.map(item => (
                    <FlowTemplateLibraryCard
                      key={item.templateId}
                      item={item}
                      onStart={onStartTemplate}
                      onViewDetails={onViewTemplateDetails}
                      data-testid={`${testId}-template-${item.templateId}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FlowLibraryTab
