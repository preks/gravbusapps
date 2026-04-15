import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Button,
  Badge,
  Skeleton,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { ExternalLink } from 'lucide-react'
import { DOCUMENT_API_URL } from '@/common/utils/serviceResolver'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { AutomationRun, RunSubmission, TranslateFn } from './automationSectionTypes'
import {
  extractArray,
  getStatusIcon,
  getRunStatusIconClass,
  getRunProgressClass,
  getSubmissionBadgeVariant,
  getSubmissionStatusLabel,
  formatRelativeTime,
  formatCompletionDateTime,
  openSafeSpreadsheetUrl,
  enrichRunSubmission,
  getInitials
} from './automationSectionUtils'
import { RunSummarizeWithAI } from './RunSummarizeWithAI'

interface RunDetailPanelProps {
  run: AutomationRun | null
  accessToken: string
  t: TranslateFn
  'data-testid'?: string
}

export const RunDetailPanel: React.FC<RunDetailPanelProps> = ({ run, accessToken, t, 'data-testid': testId }) => {
  const [submissions, setSubmissions] = useState<RunSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const docServiceUrl = DOCUMENT_API_URL.replace(/\/+$/, '')
  const StatusIcon = run ? getStatusIcon(run.status) : null
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!accessToken || !run?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(`${docServiceUrl}/automations/runs/${run.id}/submissions`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        })

        if (!response.ok) return

        const data = await response.json()
        const rawSubmissions = extractArray<Record<string, unknown>>(data)
        const baseOrigin = globalThis.window !== undefined ? globalThis.window.location.origin : ''
        const enrichedSubmissions = await Promise.all(
          rawSubmissions.map(item => enrichRunSubmission(item, graphqlClient, baseOrigin))
        )
        setSubmissions(enrichedSubmissions)
      } catch (err) {
        console.error('[RunDetailPanel] Error fetching submissions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchSubmissions()
  }, [accessToken, docServiceUrl, run?.id])

  if (!run) {
    return (
      <Card className="gba:h-fit" data-testid={testId}>
        <CardContent className="gba:p-4">
          <p className="gba:text-sm gba:text-muted-foreground">{t('sa-select-run-hint')}</p>
        </CardContent>
      </Card>
    )
  }

  const progress = run.recipientCount > 0 ? (run.completedCount / run.recipientCount) * 100 : 0

  return (
    <Card className="gba:h-fit" data-testid={testId}>
      <CardContent className="gba:p-4">
        <div className="gba:mb-4">
          <h4 className="gba:flex gba:items-center gba:gap-2 gba:font-semibold gba:text-foreground">
            {StatusIcon && <StatusIcon className={`gba:w-5 gba:h-5 ${getRunStatusIconClass(run.status)}`} />}
            {t('sa-run-details')}
          </h4>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {t('sa-started')} {formatRelativeTime(run.startedAt, t)}
            {run.completedAt && ` \u2022 ${t('sa-status-completed')} ${formatRelativeTime(run.completedAt, t)}`}
          </p>
        </div>

        <div className="gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <span className="gba:text-sm gba:font-medium">{t('sa-progress')}</span>
            <span className="gba:text-sm gba:text-muted-foreground">
              {run.completedCount} / {run.recipientCount}
            </span>
          </div>
          <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
            <div
              className={`gba:h-full gba:rounded-full ${getRunProgressClass(run.status)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
            <h5 className="gba:font-medium gba:text-foreground">{t('sa-recipients')}</h5>
            <RunSummarizeWithAI
              accessToken={accessToken}
              submissions={submissions}
              runName={run ? formatRelativeTime(run.startedAt, t) : undefined}
              data-testid="run-detail-summarize-ai"
            />
          </div>
          {isLoading ? (
            <div className="gba:space-y-3 gba:py-4">
              <Skeleton className="gba:h-12 gba:w-full gba:rounded-lg" />
              <Skeleton className="gba:h-12 gba:w-full gba:rounded-lg" />
              <Skeleton className="gba:h-12 gba:w-3/4 gba:rounded-lg" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">{t('sa-no-submissions')}</p>
          ) : (
            <div className="gba:space-y-2 gba:max-h-80 gba:overflow-auto">
              {submissions.map(submission => (
                <div key={submission.id} className="gba:p-3 gba:rounded-lg gba:bg-muted/50">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                      <Avatar className="gba:w-7 gba:h-7">
                        {submission.recipientAvatar && <AvatarImage src={submission.recipientAvatar} />}
                        <AvatarFallback className="gba:text-xs gba:bg-muted">
                          {getInitials(submission.recipientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{submission.recipientName}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{submission.copyAppName}</p>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant={getSubmissionBadgeVariant(submission.status)}>
                        {getSubmissionStatusLabel(submission.status, t)}
                      </Badge>
                      {submission.status === 'COMPLETED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSafeSpreadsheetUrl(submission.copyAppUrl)}
                        >
                          <ExternalLink className="gba:w-3 gba:h-3 gba:mr-1" />
                          {t('sa-open-file')}
                        </Button>
                      )}
                    </div>
                  </div>
                  {submission.status === 'COMPLETED' && (
                    <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                      {t('sa-completed-at')} {formatCompletionDateTime(submission.completedAt) || t('sa-na')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
