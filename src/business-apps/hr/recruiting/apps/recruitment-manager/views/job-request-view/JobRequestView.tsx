import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobRequests } from '@/common/data/recruiting/hooks/useJobRequests'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobRequestViewProps = BusinessAppContextProps

export const JobRequestView: React.FC<JobRequestViewProps> = context => {
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  const { jobRequests, total, loading, error, refetch } = useJobRequests(context.accessToken, {
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
        title: getTranslationFromI18nKeyAndLabel('requestDate', 'Request Date'),
        key: 'requestDate',
        dataIndex: 'requestDate'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('status', 'Status'),
        key: 'status',
        dataIndex: 'jobRequestStatus',
        render: (status: any) => status?.value || '-'
      },
      {
        title: '',
        key: 'actions',
        width: '60px',
        render: (_: any, record: any) => (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppActionButton
              data-testid={`job-request-update-button-${record.id}`}
              size="icon"
              contextsArray={[]}
              externalContextData={{ jobRequestId: record.id }}
              prefixDataTestId="job-request-update"
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

  if (loading && jobRequests.length === 0) {
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
    <div data-testid="job-request-view" className="gba:h-full gba:overflow-auto">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('allJobRequests', 'All Job Requests'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('searchJobRequests', 'Search job requests...')}
        onSearchChange={setSearchTerm}
      >
        <DataTable
          columns={columns}
          data={jobRequests}
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
