import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobCandidates } from '@/common/data/recruiting/hooks/useJobCandidates'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobCandidateViewProps = BusinessAppContextProps

export const JobCandidateView: React.FC<JobCandidateViewProps> = context => {
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  const { jobCandidates, total, loading, error, refetch } = useJobCandidates(context.accessToken, {
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
        title: getTranslationFromI18nKeyAndLabel('firstName', 'First Name'),
        key: 'firstName',
        dataIndex: 'firstName'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('lastName', 'Last Name'),
        key: 'lastName',
        dataIndex: 'lastName'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('email', 'Email'),
        key: 'email',
        dataIndex: 'email'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('status', 'Status'),
        key: 'status',
        dataIndex: 'candidateStatus',
        render: (status: any) => status?.value || '-'
      },
      {
        title: '',
        key: 'actions',
        width: '60px',
        render: (_: any, record: any) => (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppActionButton
              data-testid={`job-candidate-update-button-${record.id}`}
              size="icon"
              contextsArray={[]}
              externalContextData={{ jobCandidateId: record.id }}
              prefixDataTestId="job-candidate-update"
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

  if (loading && jobCandidates.length === 0) {
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
    <div data-testid="job-candidate-view" className="gba:h-full gba:overflow-auto">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('allJobCandidates', 'All Job Candidates'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('searchJobCandidates', 'Search job candidates...')}
        onSearchChange={setSearchTerm}
      >
        <DataTable
          columns={columns}
          data={jobCandidates}
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
