import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import dayjs from 'dayjs'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
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
      accessorKey: 'reactionCount',
      header: 'Reactions',
      size: 100,
      enableSorting: true,
      cell: ({ row }) => {
        return <div className="gba:text-center">{row.original.reactionCount || 0}</div>
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
      id: 'actions',
      header: '',
      size: 60,
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppActionMenu
              data-testid={`content-actions-menu-${row.original.id}`}
              contextsArray={[FlowContextName.contentEntryEntity]}
              externalContextData={{
                contentEntryId: row.original.id
              }}
              prefixDataTestId="content-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="Content actions"
                data-testid={`content-actions-trigger-${row.original.id}`}
                onClick={e => e.stopPropagation()}
              >
                <svg
                  className="gba:w-4 gba:h-4 gba:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </Button>
            </AppActionMenu>
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
  { id: 'comments', label: 'Comments' }
]

// Column visibility configs for different content types
export const getDefaultVisibleColumns = (type: 'all' | 'news' | 'knowledge' | 'document' | 'question'): string[] => {
  const baseColumns = ['title', 'author', 'createdAt', 'status', 'actions']

  switch (type) {
    case 'all':
      return ['type', 'group', ...baseColumns, 'reactions', 'comments']
    case 'news':
      return ['type', ...baseColumns, 'reactions', 'comments']
    case 'knowledge':
      return ['type', ...baseColumns, 'reactions', 'comments']
    case 'document':
      return ['type', ...baseColumns]
    case 'question':
      return ['type', ...baseColumns, 'reactions', 'comments']
    default:
      return baseColumns
  }
}
