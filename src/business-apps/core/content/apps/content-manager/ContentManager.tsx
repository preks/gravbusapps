import React, { useState, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataDisplay, DataTable, Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { useContentData } from './hooks/useContentData'
import { createContentColumns, createContentSortableColumns } from './config/contentColumns'
import { contentFilterConfigAll, contentFilterConfigSpecific } from './config/contentFilters'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PlusIcon } from '@phosphor-icons/react'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useContentFilterGroups } from '@/common/data/content/hooks/useContentFilterGroups'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import { CONTENT_ENTRY_DESCRIPTORS } from '@/common/data/content/types/contentEntryTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'

type ContentManagerProps = BusinessAppContextProps

const ContentManager: React.FC<ContentManagerProps> = context => {
  const { accessToken } = context

  // Section state
  const [currentSection, setCurrentSection] = useState<
    'all' | 'news' | 'knowledge' | 'policy' | 'document' | 'question'
  >('all')
  const [selectedContent, setSelectedContent] = useState<ContentEntry | null>(null)

  // Data hooks for each section - each maintains its own state
  const allContent = useContentData({ type: 'all', accessToken: accessToken || '' })
  const newsContent = useContentData({ type: 'news', accessToken: accessToken || '' })
  const knowledgeContent = useContentData({ type: 'knowledge', accessToken: accessToken || '' })
  const policyContent = useContentData({ type: 'policy', accessToken: accessToken || '' })
  const documentContent = useContentData({ type: 'document', accessToken: accessToken || '' })
  const questionContent = useContentData({ type: 'question', accessToken: accessToken || '' })

  // Listen for process completion and refresh all sections
  useProcessCompletion({
    onSuccess: () => {
      allContent.refetch()
      newsContent.refetch()
      knowledgeContent.refetch()
      policyContent.refetch()
      documentContent.refetch()
      questionContent.refetch()
    }
  })

  // Get current section data
  const getCurrentSectionData = () => {
    if (currentSection === 'all') return allContent
    if (currentSection === 'news') return newsContent
    if (currentSection === 'knowledge') return knowledgeContent
    if (currentSection === 'policy') return policyContent
    if (currentSection === 'document') return documentContent
    return questionContent
  }
  const current = getCurrentSectionData()

  // Create columns
  const columns = createContentColumns({ accessToken: accessToken || '' })

  // Handle section change
  const handleSectionChange = useCallback((section: string) => {
    setCurrentSection(section as 'all' | 'news' | 'knowledge' | 'policy' | 'document' | 'question')
  }, [])

  // Handle content selection
  const handleSelectContent = useCallback((entry: ContentEntry) => {
    setSelectedContent(entry)
  }, [])

  const activeContentGroup = useMemo(() => {
    const groupMap: Record<'news' | 'knowledge' | 'policy' | 'document' | 'question', ContentGroup> = {
      news: ContentGroup.NEWS,
      knowledge: ContentGroup.KNOWLEDGE,
      policy: ContentGroup.POLICY,
      document: ContentGroup.DOCUMENT,
      question: ContentGroup.QUESTION
    }

    return currentSection === 'all' ? undefined : groupMap[currentSection]
  }, [currentSection])

  const contentFilterGroups = useContentFilterGroups(context, activeContentGroup)

  const currentFilterConfig = useMemo(() => {
    const baseConfig = currentSection === 'all' ? contentFilterConfigAll : contentFilterConfigSpecific

    if (contentFilterGroups.isLoading || Object.keys(contentFilterGroups.filterData || {}).length === 0) {
      return baseConfig
    }

    return buildDynamicFilterConfig(baseConfig, CONTENT_ENTRY_DESCRIPTORS, contentFilterGroups)
  }, [currentSection, contentFilterGroups])

  return (
    <div className="gba:p-6" data-testid="content-management">
      {/* Header */}
      <div className="gba:mb-8" data-testid="content-management-header">
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <h1 className="gba:text-4xl gba:font-bold gba:text-black gba:mb-3 gba:tracking-tight">
              Content Management
            </h1>
            <p className="gba:text-lg gba:text-gray-500 gba:font-normal gba:leading-relaxed">
              Manage and moderate content entries across all groups
            </p>
          </div>
        </div>
      </div>

      {/* Data Display with Multiple Sections */}
      <DataDisplay
        // Section tabs with counts - each section maintains its own count
        titleSections={[
          {
            id: 'all',
            label: 'All Content',
            metadata: {
              count: allContent.total,
              subtitle: 'All content types'
            }
          },
          {
            id: 'news',
            label: 'News',
            metadata: {
              count: newsContent.total,
              subtitle: 'News articles'
            }
          },
          {
            id: 'knowledge',
            label: 'Knowledge',
            metadata: {
              count: knowledgeContent.total,
              subtitle: 'Knowledge base'
            }
          },
          {
            id: 'policy',
            label: 'Policies',
            metadata: {
              count: policyContent.total,
              subtitle: 'Policies'
            }
          },
          {
            id: 'document',
            label: 'Documents',
            metadata: {
              count: documentContent.total,
              subtitle: 'Document library'
            }
          },
          {
            id: 'question',
            label: 'Questions',
            metadata: {
              count: questionContent.total,
              subtitle: 'Q&A forum'
            }
          }
        ]}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        // Primary action - Add Content
        primaryAction={
          <AppAction
            contexts={[
              {
                context: FlowContextName.contentEntryCreate,
                contextData: {}
              }
            ]}
            accessToken={accessToken || ''}
            emptyState="hide"
            lazyLoad={false}
          >
            <Button variant="default">
              <PlusIcon className="gba:w-4 gba:h-4" />
              Add Content
            </Button>
          </AppAction>
        }
        // Search
        searchValue={current.search}
        searchPlaceholder="Search content..."
        onSearchChange={current.setSearch}
        // Filters
        filters={current.filters}
        filterConfiguration={currentFilterConfig}
        onFilterChange={current.setFilters}
        enableLiveFiltering={true}
        filterSheetTitle="Filter Content"
        filterSheetDescription="Apply filters to narrow down the content list"
        toolbarDensity="default"
        // Sorting
        sorting={current.sorting}
        sortableColumns={createContentSortableColumns()}
        onSortingChange={current.setSorting}
        // Column visibility
        availableColumns={columns.map(col => ({
          id: col.id ?? '',
          label: typeof col.header === 'string' ? col.header : ''
        }))}
        visibleColumns={current.visibleColumns}
        onVisibleColumnsChange={current.setVisibleColumns}
        // Selection & bulk actions
        selectedCount={current.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            onClick: () => console.log('Export selected:', current.selectedRows)
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            onClick: () => console.log('Delete selected:', current.selectedRows)
          }
        ]}
        onClearSelection={() => current.setSelectedRows([])}
      >
        {/* DataTable dynamically renders based on current section */}
        <DataTable<ContentEntry>
          data={current.data}
          columns={columns.filter(col => col.id && current.visibleColumns.includes(col.id))}
          loading={current.loading}
          error={current.error?.message}
          totalCount={current.total}
          sorting={current.sorting}
          onSortingChange={current.setSorting}
          pagination={current.pagination}
          onPaginationChange={current.setPagination}
          selectedRows={current.selectedRows}
          onSelectionChange={current.setSelectedRows}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No content entries found"
          onRowClick={handleSelectContent}
          data-testid={`content-table-${currentSection}`}
        />
      </DataDisplay>

      {/* Content Details Sheet */}
      <Sheet
        open={!!selectedContent}
        onOpenChange={open => {
          if (!open) setSelectedContent(null)
        }}
        title="Content Details"
      >
        <SheetContent className="gba:!w-[600px] gba:sm:!w-[600px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedContent?.title || 'Content Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-auto gba:px-6 gba:py-4">
            {selectedContent ? (
              <div className="gba:space-y-4">
                <div>
                  <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Preview</h3>
                  <p className="gba:mt-1">{selectedContent.preview || 'No preview'}</p>
                </div>
                <div>
                  <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Author</h3>
                  <p className="gba:mt-1">
                    {selectedContent.creatorEmployee?.displayName ||
                      selectedContent.creatorEmployee?.firstName ||
                      'Unknown'}
                  </p>
                </div>
                <div>
                  <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Created</h3>
                  <p className="gba:mt-1">{new Date(selectedContent.createdAt).toLocaleString()}</p>
                </div>
                {selectedContent.contentEntryReactionCounts &&
                  selectedContent.contentEntryReactionCounts.length > 0 && (
                    <div>
                      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">Engagement</h3>
                      <p className="gba:mt-1">
                        {selectedContent.contentEntryReactionCounts.reduce(
                          (sum: number, item) => sum + (item.count || 0),
                          0
                        )}{' '}
                        reactions, {selectedContent.descendantContentEntriesAggregate?.aggregate?.count || 0} comments
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="gba:text-center gba:text-muted-foreground">No content selected</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ContentManager
