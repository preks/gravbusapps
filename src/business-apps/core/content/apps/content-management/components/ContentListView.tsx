import React from 'react'
import { useTranslation } from 'react-i18next'
import { Content } from '../../content-hub/types/content.types'
import { Button } from '@newwork/nw-design-system'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'

interface ContentListViewProps {
  data: Content[]
  totalCount: number
  pagination: { pageSize: number; page: number }
  setPagination: (pagination: { pageSize: number; page: number }) => void
  search: string
  setSearch: (search: string) => void
  sorter: { field: string; order: 'ascend' | 'descend' }
  setSorter: (sorter: { field: string; order: 'ascend' | 'descend' }) => void
  accessToken: string
}

const ContentListView: React.FC<ContentListViewProps> = ({ data, totalCount, pagination, setPagination }) => {
  const { t } = useTranslation('content')

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
          {data.map(content => (
            <TableRow key={content.articleId} data-testid={`content-row-${content.articleId}`}>
              <TableCell>{content.articleGroupRef}</TableCell>
              <TableCell>{content.title}</TableCell>
              <TableCell>{content.authorFullName}</TableCell>
              <TableCell>{content.createdAtText}</TableCell>
              <TableCell>{content.status}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  {t('edit')}
                </Button>
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
