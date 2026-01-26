import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobCandidateSelectProps {
  value: string | null
  onValueChange: (value: string) => void
  accessToken: string
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
}

interface JobCandidate {
  id: string
  firstName: string
  lastName: string
  displayName: string | null
}

const JOB_CANDIDATES_QUERY = `
  query GetJobCandidates($searchTerm: String!) {
    JobCandidate(
      where: {
        isDeleted: { _eq: false }
        _or: [
          { firstName: { _ilike: $searchTerm } }
          { lastName: { _ilike: $searchTerm } }
          { displayName: { _ilike: $searchTerm } }
        ]
      }
      limit: 50
      orderBy: { lastName: ASC }
    ) {
      id
      firstName
      lastName
      displayName
    }
  }
`

const JobCandidateSelect: React.FC<JobCandidateSelectProps> = ({
  value,
  onValueChange,
  accessToken,
  placeholder = 'Select candidate...',
  disabled = false,
  'data-testid': dataTestId
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [candidates, setCandidates] = useState<JobCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphQLClient = useGraphQLClient(accessToken)

  const fetchCandidates = useCallback(
    async (search: string) => {
      if (!accessToken) return

      setLoading(true)
      setError(null)

      try {
        const searchTerm = search ? `%${search}%` : '%'
        const response = await graphQLClient.request<{ JobCandidate: JobCandidate[] }>(JOB_CANDIDATES_QUERY, {
          searchTerm
        })

        setCandidates(response.JobCandidate || [])
      } catch (err) {
        console.error('Error fetching job candidates:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch candidates')
        setCandidates([])
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphQLClient]
  )

  useEffect(() => {
    fetchCandidates('')
  }, [fetchCandidates])

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setSearchQuery(newQuery)
      fetchCandidates(newQuery)
    },
    [fetchCandidates]
  )

  const selectedCandidate = useMemo(() => {
    return candidates.find(c => c.id === value)
  }, [candidates, value])

  const getCandidateDisplay = (candidate: JobCandidate): string => {
    return candidate.displayName || `${candidate.firstName} ${candidate.lastName}`
  }

  if (error) {
    return (
      <Select disabled={true}>
        <SelectTrigger data-testid={dataTestId}>
          <SelectValue placeholder="Error loading candidates" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger data-testid={dataTestId}>
        <SelectValue placeholder={placeholder}>
          {selectedCandidate ? getCandidateDisplay(selectedCandidate) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="gba:p-2 gba:border-b gba:border-border">
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={handleSearch}
            className="gba:h-8"
            autoFocus
          />
        </div>
        <div className="gba:max-h-[300px] gba:overflow-y-auto">
          {loading && (
            <div className="gba:p-4 gba:flex gba:justify-center">
              <Spinner size="sm" />
            </div>
          )}
          {!loading && candidates.length === 0 && (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
              {searchQuery ? 'No candidates found' : 'No candidates available'}
            </div>
          )}
          {!loading &&
            candidates.map(candidate => (
              <SelectItem key={candidate.id} value={candidate.id}>
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:font-medium">{getCandidateDisplay(candidate)}</span>
                  {candidate.displayName && (
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {candidate.firstName} {candidate.lastName}
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

export default JobCandidateSelect
