import React, { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { GlobalSearchClient, GlobalSearchJobView } from '@/common/network/global-search/GlobalSearchClient'
import { formatDateTime, jobStateBadgeVariant } from '../utils'

interface JobsTabProps {
  client: GlobalSearchClient
}

const PAGE_SIZE = 25
const POLL_INTERVAL_MS = 4000
const ACTIVE_STATES = new Set(['wait', 'active', 'delayed', 'prioritized', 'waiting-children'])

export const JobsTab: React.FC<JobsTabProps> = ({ client }) => {
  const [jobs, setJobs] = useState<GlobalSearchJobView[]>([])
  const [selectedJob, setSelectedJob] = useState<GlobalSearchJobView | null>(null)
  const [queue, setQueue] = useState('')
  const [state, setState] = useState('')
  const [offset, setOffset] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await client.getJobs({ limit: PAGE_SIZE, offset, queue, state })
      setJobs(response.data)
      setTotalRecords(response.paging.totalRecords)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Loading jobs failed')
    } finally {
      setIsLoading(false)
    }
  }, [client, offset, queue, state])

  useEffect(() => {
    loadJobs().catch(() => undefined)
  }, [loadJobs])

  useEffect(() => {
    const hasActiveJob = jobs.some(job => ACTIVE_STATES.has(job.state))
    if (!hasActiveJob) return undefined
    const intervalId = globalThis.setInterval(() => {
      loadJobs().catch(() => undefined)
    }, POLL_INTERVAL_MS)
    return () => globalThis.clearInterval(intervalId)
  }, [jobs, loadJobs])

  const viewJob = async (job: GlobalSearchJobView) => {
    try {
      setSelectedJob(await client.getJob(job.queue, job.id))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Loading job detail failed')
    }
  }

  return (
    <Card data-testid="global-search-manager-jobs-tab">
      <CardContent className="gba:space-y-4 gba:pt-6">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Select value={queue || 'all'} onValueChange={value => setQueue(value === 'all' ? '' : value)}>
              <SelectTrigger className="gba:w-40">
                <SelectValue placeholder="Queue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All queues</SelectItem>
                <SelectItem value="analytics">analytics</SelectItem>
              </SelectContent>
            </Select>
            <Select value={state || 'all'} onValueChange={value => setState(value === 'all' ? '' : value)}>
              <SelectTrigger className="gba:w-40">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {['all', 'wait', 'active', 'delayed', 'completed', 'failed'].map(option => (
                  <SelectItem key={option} value={option}>
                    {option === 'all' ? 'All states' : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => loadJobs().catch(() => undefined)} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : null}
            Refresh
          </Button>
        </div>

        {errorMessage && <p className="gba:text-sm gba:text-destructive">{errorMessage}</p>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="gba:text-center gba:text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map(job => (
                <TableRow key={`${job.queue}-${job.id}`}>
                  <TableCell className="gba:font-mono">{job.id.slice(0, 8)}...</TableCell>
                  <TableCell className="gba:font-mono">{job.queue}</TableCell>
                  <TableCell>{job.name}</TableCell>
                  <TableCell>
                    <Badge variant={jobStateBadgeVariant(job.state)}>{job.state}</Badge>
                  </TableCell>
                  <TableCell>
                    {job.progress ? `${job.progress.current}/${job.progress.total} (${job.progress.percentage}%)` : '-'}
                  </TableCell>
                  <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => viewJob(job).catch(() => undefined)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-sm gba:text-muted-foreground">{totalRecords} job(s)</span>
          <div className="gba:flex gba:gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={offset + PAGE_SIZE >= totalRecords}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="gba:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          <pre className="gba:max-h-96 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-3 gba:text-xs">
            {JSON.stringify(selectedJob, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
