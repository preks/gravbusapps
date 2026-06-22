import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import { FlowCanvas, FlowCanvasProvider, type FlowGraphDefinition } from '@/common/components/flow'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { HubPaginationFooter } from '@/business-apps/platform/apps/shared/components/HubPaginationFooter'
import type {
  JobsByStateBucket,
  JobsByStateResponse,
  JobsPageResponse
} from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types/api'
import translations from './_i18n'

type AiBuilderAdminProps = BusinessAppContextProps & {
  'data-testid'?: string
}

const TASK_STATES = new Set(['planned', 'awaiting_change_decision', 'discovering', 'building', 'wiring'])
const JOBS_PAGE_SIZE = 5

function toFlowDefinition(
  stateMachine: {
    states: Array<{ id: string; label: string; terminal: boolean }>
    transitions: Array<{ from: string; to: string; label: string }>
  },
  buckets: JobsByStateResponse
): FlowGraphDefinition {
  const countByState = new Map<string, number>(buckets.buckets.map(bucket => [bucket.state, bucket.count]))
  return {
    nodes: stateMachine.states.map(state => {
      const count = countByState.get(state.id) ?? 0
      return {
        id: state.id,
        type: state.id === 'draft' ? 'start' : state.terminal ? 'end' : TASK_STATES.has(state.id) ? 'task' : 'decision',
        label: state.label,
        metadata: {
          description: `${count} ${count === 1 ? 'job' : 'jobs'}`
        }
      }
    }),
    edges: stateMachine.transitions.map((transition, index) => ({
      id: `transition-${index}-${transition.from}-${transition.to}`,
      source: transition.from,
      target: transition.to,
      label: transition.label,
      direction: 'forward' as const
    }))
  }
}

export const AiBuilderAdmin: React.FC<AiBuilderAdminProps> = ({
  accessToken,
  'data-testid': testId = 'ai-builder-admin'
}) => {
  const { t } = useTranslation(translations)
  const client = useMemo(() => new OrchestratorClient(accessToken || ''), [accessToken])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stateMachine, setStateMachine] = useState<{
    states: Array<{ id: string; label: string; terminal: boolean }>
    transitions: Array<{ from: string; to: string; label: string }>
  } | null>(null)
  const [jobsByState, setJobsByState] = useState<JobsByStateResponse>({ buckets: [] })
  const [jobsPage, setJobsPage] = useState<JobsPageResponse>({
    data: [],
    paging: { limit: JOBS_PAGE_SIZE, offset: 0, totalRecords: 0 }
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedState, setSelectedState] = useState<string | null>(null)

  const stateLabelById = useMemo(() => {
    if (!stateMachine) return new Map<string, string>()
    return new Map(stateMachine.states.map(state => [state.id, state.label]))
  }, [stateMachine])

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setError(t('error-missing-token'))
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const [stateMachineData, jobsByStateData, jobsPageData] = await Promise.all([
        client.getStateMachine(),
        client.getJobsByState(150),
        client.getJobsPage(JOBS_PAGE_SIZE, (currentPage - 1) * JOBS_PAGE_SIZE)
      ])
      setStateMachine(stateMachineData)
      setJobsByState(jobsByStateData)
      setJobsPage(jobsPageData)
      if (!selectedState && stateMachineData.states.length > 0) {
        setSelectedState(stateMachineData.states[0].id)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('error-load-failed'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, currentPage, selectedState, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedBucket: JobsByStateBucket | undefined = useMemo(
    () => jobsByState.buckets.find(bucket => bucket.state === selectedState),
    [jobsByState.buckets, selectedState]
  )

  const formatDate = useCallback((value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }
    return parsed.toLocaleString()
  }, [])

  const graphDefinition = useMemo(() => {
    if (!stateMachine) {
      return { nodes: [], edges: [] } satisfies FlowGraphDefinition
    }
    return toFlowDefinition(stateMachine, jobsByState)
  }, [stateMachine, jobsByState])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((jobsPage.paging.totalRecords || 0) / JOBS_PAGE_SIZE)),
    [jobsPage.paging.totalRecords]
  )

  const rightPanel = (
    <Card
      className="gba:w-[420px] gba:max-h-[70vh] gba:overflow-auto gba:shadow-lg"
      data-testid={`${testId}-state-sidebar`}
    >
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base">State Details</CardTitle>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="secondary">{(stateLabelById.get(selectedState || '') ?? selectedState) || 'none'}</Badge>
          <Badge variant="outline">{selectedBucket?.count ?? 0} jobs</Badge>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {selectedBucket?.jobs.length ? (
          selectedBucket.jobs.map(job => (
            <div
              key={job.jobId}
              className="gba:border gba:border-border gba:rounded-md gba:p-2 gba:text-xs gba:space-y-1"
            >
              <div className="gba:font-medium">{job.jobId}</div>
              <div className="gba:text-muted-foreground gba:line-clamp-2">{job.originalPrompt}</div>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                <Badge variant="outline">{stateLabelById.get(job.state) ?? job.state}</Badge>
                {job.currentPhase ? <Badge variant="secondary">{job.currentPhase}</Badge> : null}
              </div>
            </div>
          ))
        ) : (
          <CardDescription>No jobs in this state.</CardDescription>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="gba:w-full gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:overflow-y-auto" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <CardTitle className="gba:text-xl">{t('page-title')}</CardTitle>
          <CardDescription>Live backend view of orchestration states, transitions, and job placement.</CardDescription>
        </div>
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:h-[60vh] gba:min-h-[420px] gba:w-full gba:flex gba:flex-col">
        <FlowCanvasProvider
          isInteractive={true}
          selectedNodeId={selectedState}
          onNodeSelect={setSelectedState}
          selectedEdgeId={null}
          onEdgeSelect={() => {}}
        >
          <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col">
            <FlowCanvas
              definition={graphDefinition}
              rightPanel={rightPanel}
              onNodeClick={(_, node) => setSelectedState(node.id)}
              onPaneClick={() => {}}
              useForwardEdgesOnlyForRanking={true}
              fitViewOptions={{ padding: 0.26, minZoom: 0.6, maxZoom: 1.1 }}
              data-testid={`${testId}-canvas`}
            />
          </div>
        </FlowCanvasProvider>
      </div>

      <Card data-testid={`${testId}-jobs-table`}>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-base">All Jobs</CardTitle>
          <CardDescription>State is the canonical lifecycle bucket derived by backend rules.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsPage.data.length ? (
            <div className="gba:border gba:border-border gba:rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Prompt</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsPage.data.map(job => (
                    <TableRow
                      key={job.jobId}
                      onClick={() => setSelectedState(job.state)}
                      className="gba:cursor-pointer hover:gba:bg-muted/30"
                    >
                      <TableCell className="gba:font-mono gba:text-xs">{job.jobId}</TableCell>
                      <TableCell className="gba:max-w-[420px] gba:text-xs gba:text-muted-foreground">
                        <div className="gba:line-clamp-2" title={job.originalPrompt}>
                          {job.originalPrompt}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stateLabelById.get(job.state) ?? job.state}</Badge>
                      </TableCell>
                      <TableCell className="gba:text-xs gba:text-muted-foreground">{job.currentPhase || '-'}</TableCell>
                      <TableCell className="gba:text-xs gba:text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <CardDescription>No orchestration jobs found.</CardDescription>
          )}
        </CardContent>
        <HubPaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={jobsPage.paging.totalRecords || 0}
          pageSize={JOBS_PAGE_SIZE}
          onPageChange={setCurrentPage}
          data-testid={`${testId}-jobs-pagination`}
        />
      </Card>
    </div>
  )
}

export default AiBuilderAdmin
