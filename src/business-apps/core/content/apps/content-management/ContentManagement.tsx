import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { Spinner, Alert, AlertTitle, AlertDescription, Button } from '@newwork/nw-design-system'
import { useContentEntries } from '@/common/data/content'
import ContentListView from './components/ContentListView'

type ContentManagementProps = BusinessAppContextProps

const ContentManagement: React.FC<ContentManagementProps> = context => {
  const { t } = useTranslation('content')
  const [pagination, setPagination] = useState({ pageSize: 20, page: 1 })
  const [search, setSearch] = useState('')
  const [sorter, setSorter] = useState<{ field: string; order: 'ascend' | 'descend' }>({
    field: 'createdAt',
    order: 'descend'
  })

  const offset = (pagination.page - 1 || 0) * pagination.pageSize

  // Build query params for central data hook
  const queryParams = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset,
      search,
      sortBy: sorter.field,
      sortOrder: sorter.order === 'ascend' ? 'ASC' : 'DESC'
    }),
    [pagination.pageSize, offset, search, sorter.field, sorter.order]
  )

  // Use central content data hook
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, context.accessToken)

  if (error) {
    return (
      <div className="gba:p-6" data-testid="content-management-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error_loading_contents')}</AlertTitle>
          <AlertDescription>
            <Button onClick={refetch} variant="outline" className="gba:mt-2">
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:px-7 gba:pt-6" data-testid="content-management">
      {isLoading && (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-10">
          <Spinner />
        </div>
      )}
      {!isLoading && (
        <ContentListView
          entries={entries}
          totalCount={totalCount}
          pagination={pagination}
          setPagination={setPagination}
          search={search}
          setSearch={setSearch}
          sorter={sorter}
          setSorter={setSorter}
          accessToken={context.accessToken || ''}
        />
      )}
    </div>
  )
}

export default ContentManagement
