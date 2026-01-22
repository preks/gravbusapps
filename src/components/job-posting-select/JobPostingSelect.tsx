import React, { useState, useCallback, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@newwork/nw-design-system'
import { useJobPostings } from '@/common/data/recruiting/hooks/useJobPostings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface JobPostingSelectProps {
  value: string | null
  onValueChange: (value: string) => void
  businessAppContext: BusinessAppContextProps
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
}

const JobPostingSelect: React.FC<JobPostingSelectProps> = ({
  value,
  onValueChange,
  businessAppContext,
  placeholder = 'Select job posting...',
  disabled = false,
  'data-testid': dataTestId
}) => {
  const { accessToken } = businessAppContext
  const [searchQuery, setSearchQuery] = useState('')

  const { jobPostings, loading, error } = useJobPostings(
    accessToken,
    {
      limit: 100,
      offset: 0,
      orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    },
    'list'
  )

  const filteredPostings = useMemo(() => {
    if (!searchQuery.trim()) return jobPostings

    const query = searchQuery.toLowerCase()
    return jobPostings.filter(posting => {
      const matchesTitle = posting.title?.toLowerCase().includes(query)
      const matchesCode = posting.code?.toLowerCase().includes(query)
      return matchesTitle || matchesCode
    })
  }, [jobPostings, searchQuery])

  const selectedPosting = useMemo(() => {
    return jobPostings.find(p => p.id === value)
  }, [jobPostings, value])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  if (error) {
    return (
      <Select disabled={true}>
        <SelectTrigger data-testid={dataTestId}>
          <SelectValue placeholder="Error loading job postings" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger data-testid={dataTestId}>
        <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
          {selectedPosting
            ? `${selectedPosting.title}${selectedPosting.code ? ` (${selectedPosting.code})` : ''}`
            : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="gba:p-2 gba:border-b gba:border-border">
          <Input
            type="text"
            placeholder="Search by title or code..."
            value={searchQuery}
            onChange={handleSearch}
            className="gba:h-8"
            autoFocus
          />
        </div>
        <div className="gba:max-h-[300px] gba:overflow-y-auto">
          {filteredPostings.length === 0 && (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
              {searchQuery ? 'No job postings found' : 'No job postings available'}
            </div>
          )}
          {filteredPostings.map(posting => (
            <SelectItem key={posting.id} value={posting.id || ''}>
              <div className="gba:flex gba:flex-col gba:gap-1">
                <span className="gba:font-medium">{posting.title || 'Untitled'}</span>
                {posting.code && <span className="gba:text-xs gba:text-muted-foreground">{posting.code}</span>}
              </div>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}

export default JobPostingSelect
