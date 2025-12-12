import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import dayjs from 'dayjs'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ContentColumnConfig {
  accessToken: string
  onDeleteEntry?: (entry: ContentEntry) => void
  onClearReactions?: (entryId: string) => void
}

export interface ContentColumn {
  id: string
  accessorKey?: string
  header: string
  size?: number
  enableSorting?: boolean
  cell?: (context: { row: { original: ContentEntry } }) => React.ReactNode
}

export const createContentColumns = (config: ContentColumnConfig): ContentColumn[] => {
  const { accessToken } = config

  return [
    {
      id: 'type',
      accessorKey: 'contentTypeRef',
      header: 'Type',
      size: 120,
      enableSorting: true,
      cell: ({ row }) => {
        const typeRef = row.original.contentTypeRef
        const typeValue = typeof typeRef === 'string' ? typeRef.split(':').pop() : (typeRef as any)?.value || 'Unknown'

        return <Badge variant="outline">{typeValue}</Badge>
      }
    },
    {
      id: 'group',
      accessorKey: 'contentGroupRef',
      header: 'Group',
      size: 120,
      enableSorting: true,
      cell: ({ row }) => {
        const groupRef = row.original.contentGroupRef
        const groupValue =
          typeof groupRef === 'string' ? groupRef.split(':').pop() : (groupRef as any)?.value || 'Unknown'

        const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
          News: 'default',
          Knowledge: 'secondary',
          Document: 'outline',
          Question: 'default'
        }

        return (
          <Badge variant={variantMap[groupValue] || 'outline'} className="gba:capitalize">
            {groupValue}
          </Badge>
        )
      }
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      size: 300,
      enableSorting: true,
      cell: ({ row }) => {
        return (
          <div className="gba:max-w-[300px]">
            <div className="gba:font-medium gba:truncate">{row.original.title}</div>
          </div>
        )
      }
    },
    {
      id: 'author',
      accessorKey: 'creatorEmployee',
      header: 'Author',
      size: 180,
      enableSorting: true,
      cell: ({ row }) => {
        return (
          <div className="gba:text-sm">
            {row.original.creatorEmployee?.displayName || row.original.creatorEmployee?.firstName || 'Unknown'}
          </div>
        )
      }
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created',
      size: 140,
      enableSorting: true,
      cell: ({ row }) => {
        return (
          <div className="gba:text-sm gba:text-muted-foreground">
            {dayjs(row.original.createdAt).format('DD.MM.YYYY HH:mm')}
          </div>
        )
      }
    },
    {
      id: 'status',
      accessorKey: 'isDeleted',
      header: 'Status',
      size: 100,
      enableSorting: true,
      cell: ({ row }) => {
        return (
          <Badge variant={row.original.isDeleted ? 'destructive' : 'default'}>
            {row.original.isDeleted ? 'Deleted' : 'Active'}
          </Badge>
        )
      }
    },
    {
      id: 'reactions',
      accessorKey: 'contentEntryReactionCounts',
      header: 'Reactions',
      size: 100,
      enableSorting: false,
      cell: ({ row }) => {
        const totalReactions =
          row.original.contentEntryReactionCounts?.reduce((sum: number, item: any) => sum + (item.count || 0), 0) || 0
        return <div className="gba:text-center">{totalReactions}</div>
      }
    },
    {
      id: 'comments',
      accessorKey: 'commentCount',
      header: 'Comments',
      size: 100,
      enableSorting: true,
      cell: ({ row }) => {
        return <div className="gba:text-center">{row.original.commentCount || 0}</div>
      }
    },
    {
      id: 'tags',
      accessorKey: 'contentEntryTags',
      header: 'Tags',
      size: 200,
      enableSorting: false,
      cell: ({ row }) => {
        const tags = row.original.contentEntryTags || []
        if (tags.length === 0) return null

        const maxVisible = 2
        const visibleTags = tags.slice(0, maxVisible)
        const remainingCount = tags.length - maxVisible

        return (
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {visibleTags.map((tagEntry: any) => {
              const tagValue = tagEntry.contentTag?.value || tagEntry.value || 'Unknown'
              const tagId = tagEntry.contentTag?.id || tagEntry.id || tagValue
              return (
                <Badge key={`tag-${tagId}`} variant="secondary" className="gba:text-xs">
                  #{tagValue}
                </Badge>
              )
            })}
            {remainingCount > 0 && (
              <Badge variant="outline" className="gba:text-xs">
                +{remainingCount}
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      id: 'actions',
      header: '',
      size: 60,
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppAction
              mode="button"
              contexts={[
                {
                  context: FlowContextName.contentEntryEntity,
                  contextData: {
                    contentEntryId: row.original.id
                  }
                }
              ]}
              prefixDataTestId="content-actions"
              accessToken={accessToken}
              emptyState="enable"
              lazyLoad
              buttonSize="icon"
              buttonVariant="ghost"
              data-testid={`content-actions-menu-${row.original.id}`}
              onClick={e => e.stopPropagation()}
            >
              <svg
                className="gba:w-4 gba:h-4 gba:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Content actions"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </AppAction>
          </div>
        )
      }
    }
  ]
}

export const createContentSortableColumns = () => [
  { id: 'title', label: 'Title' },
  { id: 'createdAt', label: 'Created' },
  { id: 'updatedAt', label: 'Updated' },
  { id: 'type', label: 'Type' },
  { id: 'group', label: 'Group' },
  { id: 'author', label: 'Author' },
  { id: 'status', label: 'Status' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'comments', label: 'Comments' },
  { id: 'tags', label: 'Tags' }
]

// Column visibility configs for different content types
export const getDefaultVisibleColumns = (type: 'all' | 'news' | 'knowledge' | 'document' | 'question'): string[] => {
  const baseColumns = ['title', 'author', 'createdAt', 'status', 'actions']

  switch (type) {
    case 'all':
      return ['type', 'group', ...baseColumns, 'tags', 'reactions', 'comments']
    case 'news':
      return ['type', ...baseColumns, 'tags', 'reactions', 'comments']
    case 'knowledge':
      return ['type', ...baseColumns, 'tags', 'reactions', 'comments']
    case 'document':
      return ['type', ...baseColumns, 'tags']
    case 'question':
      return ['type', ...baseColumns, 'tags', 'reactions', 'comments']
    default:
      return baseColumns
  }
}
