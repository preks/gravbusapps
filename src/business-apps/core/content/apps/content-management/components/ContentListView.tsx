import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContentEntry } from '@/common/data/content/types/contentTypes'
import { Button, Badge } from '@newwork/nw-design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { toast } from 'sonner'
import dayjs from 'dayjs'

interface ContentListViewProps {
  entries: ContentEntry[]
  totalCount: number
  pagination: { pageSize: number; page: number }
  setPagination: (pagination: { pageSize: number; page: number }) => void
  search: string
  setSearch: (search: string) => void
  sorter: { field: string; order: 'ascend' | 'descend' }
  setSorter: (sorter: { field: string; order: 'ascend' | 'descend' }) => void
  accessToken: string
}

const ContentListView: React.FC<ContentListViewProps> = ({
  entries,
  totalCount,
  pagination,
  setPagination,
  accessToken
}) => {
  const { t } = useTranslation('content')
  const graphqlClient = useGraphQLClient(accessToken)
  const kogitoUrl = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')
  const restClient = useRestClient(kogitoUrl)
  const [clearingReactions, setClearingReactions] = useState<Record<string, boolean>>({})
  const [deletingEntries, setDeletingEntries] = useState<Record<string, boolean>>({})

  const handleDeleteEntry = async (entry: ContentEntry) => {
    setDeletingEntries(prev => ({ ...prev, [entry.id]: true }))

    try {
      await restClient.post(
        '/content/deleteContentEntry',
        {
          contentEntry: {
            id: entry.id,
            version: entry.version
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      toast.success(t('content_entry_deleted'))
    } catch (error) {
      console.error('Error deleting content entry:', error)
      toast.error(t('error_deleting_content_entry'))
    } finally {
      setDeletingEntries(prev => ({ ...prev, [entry.id]: false }))
    }
  }

  const handleClearReactions = async (contentEntryId: string) => {
    setClearingReactions(prev => ({ ...prev, [contentEntryId]: true }))

    try {
      // Fetch all reactions for this content entry
      const query = `
        query GetContentEntryReactions($contentEntryId: uuid!) {
          ContentEntryReaction(
            where: {
              contentEntryId: { _eq: $contentEntryId }
              isDeleted: { _eq: false }
            }
          ) {
            id
            version
          }
        }
      `

      const result = await graphqlClient.request<{ ContentEntryReaction: Array<{ id: string; version: number }> }>(
        query,
        {
          contentEntryId
        }
      )

      const reactions = result.ContentEntryReaction || []

      if (reactions.length === 0) {
        toast.info(t('no_reactions_to_delete'))
        return
      }

      // Delete all reactions in sequence
      let deletedCount = 0
      for (const reaction of reactions) {
        try {
          await restClient.post(
            '/content/deleteContentEntryReaction',
            {
              contentEntryReaction: {
                id: reaction.id,
                version: reaction.version
              }
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          )
          deletedCount++
        } catch (err) {
          console.error(`Failed to delete reaction ${reaction.id}:`, err)
        }
      }

      toast.success(t('reactions_cleared', { count: deletedCount }))
    } catch (error) {
      console.error('Error clearing reactions:', error)
      toast.error(t('error_clearing_reactions'))
    } finally {
      setClearingReactions(prev => ({ ...prev, [contentEntryId]: false }))
    }
  }

  return (
    <div data-testid="content-list-view">
      <div className="gba:mb-4">
        <h1 className="gba:text-2xl gba:font-bold">{t('content_library')}</h1>
        <p className="gba:text-muted-foreground">{t('total_contents', { count: totalCount })}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('type')}</TableHead>
            <TableHead>{t('title')}</TableHead>
            <TableHead>{t('author')}</TableHead>
            <TableHead>{t('created_at')}</TableHead>
            <TableHead>{t('status')}</TableHead>
            <TableHead>{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(entry => (
            <TableRow key={entry.id} data-testid={`content-row-${entry.id}`}>
              <TableCell>
                <Badge variant="outline">
                  {typeof entry.contentTypeRef === 'string'
                    ? entry.contentTypeRef
                    : (entry.contentTypeRef as any)?.value || t('unknown')}
                </Badge>
              </TableCell>
              <TableCell className="gba:font-medium">{entry.title}</TableCell>
              <TableCell>{entry.creatorEmployee?.displayName || t('unknown')}</TableCell>
              <TableCell>{dayjs(entry.createdAt).format('DD.MM.YYYY HH:mm')}</TableCell>
              <TableCell>
                <Badge variant={entry.isDeleted ? 'destructive' : 'default'}>
                  {entry.isDeleted ? t('deleted') : t('active')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="gba:flex gba:gap-2">
                  <Button variant="outline" size="sm">
                    {t('edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry)}
                    disabled={deletingEntries[entry.id]}
                    data-testid={`delete-entry-${entry.id}`}
                  >
                    {deletingEntries[entry.id] ? t('deleting') : t('delete')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleClearReactions(entry.id)}
                    disabled={clearingReactions[entry.id]}
                    data-testid={`clear-reactions-${entry.id}`}
                  >
                    {clearingReactions[entry.id] ? t('clearing') : t('clear_reactions')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="gba:mt-4 gba:flex gba:justify-between gba:items-center">
        <div className="gba:text-sm gba:text-muted-foreground">
          {t('showing_results', {
            from: (pagination.page - 1) * pagination.pageSize + 1,
            to: Math.min(pagination.page * pagination.pageSize, totalCount),
            total: totalCount
          })}
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          >
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page * pagination.pageSize >= totalCount}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          >
            {t('next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ContentListView
