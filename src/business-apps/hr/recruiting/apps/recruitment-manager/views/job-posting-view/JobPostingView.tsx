import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobPostingViewProps = BusinessAppContextProps

export const JobPostingView: React.FC<JobPostingViewProps> = context => {
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  const { jobPostings, total, loading, error, refetch } = useJobPostings(context.accessToken, {
    search: searchTerm,
    limit,
    offset
  })

  const columns = useMemo(
    () => [
      {
        title: getTranslationFromI18nKeyAndLabel('code', 'Code'),
        key: 'code',
        dataIndex: 'code'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('title', 'Title'),
        key: 'title',
        dataIndex: 'title'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('publishedDate', 'Published Date'),
        key: 'publishedDate',
        dataIndex: 'publishedDate'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('status', 'Status'),
        key: 'status',
        dataIndex: 'jobPostingStatus',
        render: (status: any) => status?.value || '-'
      },
      {
        title: '',
        key: 'actions',
        width: '60px',
        render: (_: any, record: any) => (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppActionButton
              data-testid={`job-posting-update-button-${record.id}`}
              size="icon"
              contextsArray={[]}
              externalContextData={{ jobPostingId: record.id }}
              prefixDataTestId="job-posting-update"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              onClick={e => e.stopPropagation()}
            />
          </div>
        )
      }
    ],
    [context.accessToken]
  )

  if (loading && jobPostings.length === 0) {
    return <Spinner size="large" />
  }

  if (error) {
    return (
      <Alert
        message={getTranslationFromI18nKeyAndLabel('errorLoadingData', 'Error Loading Data')}
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div data-testid="job-posting-view" className="gba:h-full gba:overflow-auto">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('allJobPostings', 'All Job Postings'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('searchJobPostings', 'Search job postings...')}
        onSearchChange={setSearchTerm}
      >
        <DataTable
          columns={columns}
          data={jobPostings}
          loading={loading}
          pagination={{
            total,
            pageSize: limit,
            current: Math.floor(offset / limit) + 1,
            onChange: (page, pageSize) => {
              setOffset((page - 1) * pageSize)
              setLimit(pageSize)
            }
          }}
        />
      </DataDisplay>
    </div>
  )
}
