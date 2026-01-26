import React, { useState, useCallback, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@newwork/nw-design-system'
import { useJobApplications } from '@/common/data/recruiting/hooks/useJobApplications'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface JobApplicationSelectProps {
  value: string | null
  onValueChange: (value: string) => void
  businessAppContext: BusinessAppContextProps
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
}

const JobApplicationSelect: React.FC<JobApplicationSelectProps> = ({
  value,
  onValueChange,
  businessAppContext,
  placeholder = 'Select job application...',
  disabled = false,
  'data-testid': dataTestId
}) => {
  const { accessToken } = businessAppContext
  const [searchQuery, setSearchQuery] = useState('')

  const { jobApplications, loading, error } = useJobApplications(
    accessToken || '',
    {
      limit: 100,
      offset: 0,
      orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    },
    'list'
  )

  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return jobApplications

    const query = searchQuery.toLowerCase()
    return jobApplications.filter(application => {
      const candidateName = application.jobCandidate
        ? `${application.jobCandidate.firstName || ''} ${application.jobCandidate.lastName || ''}`.trim().toLowerCase()
        : ''
      const postingTitle = application.jobPosting?.title?.toLowerCase() || ''
      const applicationDate = application.applicationDate || ''
      return candidateName.includes(query) || postingTitle.includes(query) || applicationDate.includes(query)
    })
  }, [jobApplications, searchQuery])

  const selectedApplication = useMemo(() => {
    return jobApplications.find(a => a.id === value)
  }, [jobApplications, value])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const getApplicationDisplay = (application: (typeof jobApplications)[0]): string => {
    const candidateName = application.jobCandidate
      ? `${application.jobCandidate.firstName || ''} ${application.jobCandidate.lastName || ''}`.trim()
      : 'Unknown Candidate'
    const postingTitle = application.jobPosting?.title || 'Unknown Posting'
    return `${candidateName} - ${postingTitle}`
  }

  if (error) {
    return (
      <Select disabled={true}>
        <SelectTrigger data-testid={dataTestId}>
          <SelectValue placeholder="Error loading job applications" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger data-testid={dataTestId}>
        <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
          {selectedApplication ? getApplicationDisplay(selectedApplication) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="gba:p-2 gba:border-b gba:border-border">
          <Input
            type="text"
            placeholder="Search by candidate or posting..."
            value={searchQuery}
            onChange={handleSearch}
            className="gba:h-8"
            autoFocus
          />
        </div>
        <div className="gba:max-h-[300px] gba:overflow-y-auto">
          {filteredApplications.length === 0 && (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
              {searchQuery ? 'No job applications found' : 'No job applications available'}
            </div>
          )}
          {filteredApplications.map(application => (
            <SelectItem key={application.id} value={application.id || ''}>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:font-medium">{getApplicationDisplay(application)}</span>
                {application.applicationDate && (
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {new Date(application.applicationDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}

export default JobApplicationSelect
