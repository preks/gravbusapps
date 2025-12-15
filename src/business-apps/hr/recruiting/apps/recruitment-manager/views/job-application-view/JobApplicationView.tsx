import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type JobApplicationViewProps = BusinessAppContextProps

export const JobApplicationView: React.FC<JobApplicationViewProps> = context => {
  const [searchTerm, setSearchTerm] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  const { jobApplications, total, loading, error, refetch } = useJobApplications(context.accessToken, {
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
        title: getTranslationFromI18nKeyAndLabel('candidate', 'Candidate'),
        key: 'candidate',
        render: (_: any, record: any) => {
          const candidate = record.jobCandidate
          if (!candidate) return '-'
          return `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email || '-'
        }
      },
      {
        title: getTranslationFromI18nKeyAndLabel('jobPosting', 'Job Posting'),
        key: 'jobPosting',
        render: (_: any, record: any) => record.jobPosting?.title || '-'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('applicationDate', 'Application Date'),
        key: 'applicationDate',
        dataIndex: 'applicationDate'
      },
      {
        title: getTranslationFromI18nKeyAndLabel('status', 'Status'),
        key: 'status',
        dataIndex: 'applicationStatus',
        render: (status: any) => status?.value || '-'
      },
      {
        title: '',
        key: 'actions',
        width: '60px',
        render: (_: any, record: any) => (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <AppActionButton
              data-testid={`job-application-update-button-${record.id}`}
              size="icon"
              contextsArray={[]}
              externalContextData={{ jobApplicationId: record.id }}
              prefixDataTestId="job-application-update"
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

  if (loading && jobApplications.length === 0) {
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
    <div data-testid="job-application-view" className="gba:h-full gba:overflow-auto">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('allJobApplications', 'All Job Applications'),
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('searchJobApplications', 'Search job applications...')}
        onSearchChange={setSearchTerm}
      >
        <DataTable
          columns={columns}
          data={jobApplications}
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
