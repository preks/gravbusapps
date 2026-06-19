// Overview tab: the task input, any draft awaiting human approval, the final
// output, and file artifacts. Moved verbatim from the original single-scroll
// RunDetailBody so behavior is unchanged; only the container is now a tab panel.

import { FileIcon, FilesIcon, SparkleIcon, TrayIcon, WarningIcon } from '@phosphor-icons/react'
import React from 'react'

import { RunEmailApprovalSection } from '../../RunEmailApprovalSection'
import { RunFlowApprovalSection } from '../../RunFlowApprovalSection'
import { RunMarkdown } from '../../RunMarkdown'
import { RunStructuredApprovalSection } from '../../RunStructuredApprovalSection'
import { getComposeEmailPending } from '../../workforceComposeEmail'
import { getStructuredInputPending } from '../../workforceStructuredInput'
import type { WorkforceRun, WorkforceRunArtifactSummary } from '../../workforceTypes'
import { extractDraftBody, extractDraftSubject, formatBytes } from '../runDetailFacts'
import { SectionTitle } from '../RunDetailSection'

export interface OverviewTabProps {
  run: WorkforceRun
  accessToken: string
  errorMessage?: string | null
  onRefreshRun?: () => Promise<void>
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ run, accessToken, errorMessage, onRefreshRun }) => {
  const composePending = getComposeEmailPending(run.pending_structured_input)
  const structuredPending = composePending ? null : getStructuredInputPending(run.pending_structured_input)
  const draftBody = composePending ? null : extractDraftBody(run.pending_structured_input)
  const draftSubject = composePending ? null : extractDraftSubject(run.pending_structured_input)
  const artifacts: WorkforceRunArtifactSummary[] = run.artifacts ?? []
  const showGenericApproval = !composePending && !structuredPending && (draftBody || run.pending_human_question)

  return (
    <div className="gba:space-y-6">
      {errorMessage && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <section>
        <SectionTitle icon={TrayIcon}>Task</SectionTitle>
        <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4 gba:shadow-sm">
          <pre
            className="gba:whitespace-pre-wrap gba:break-words gba:font-sans gba:text-[13px] gba:leading-relaxed gba:text-foreground"
            data-testid="run-detail-task"
          >
            {run.input || '(empty)'}
          </pre>
        </div>
      </section>

      {composePending && !accessToken && (
        <section data-testid="run-detail-approval">
          <SectionTitle icon={WarningIcon} tone="warning">
            Awaiting human approval
          </SectionTitle>
          <p className="gba:text-xs gba:text-muted-foreground">
            Sign in is required to review and send this email draft.
          </p>
        </section>
      )}

      {composePending && accessToken && (
        <RunEmailApprovalSection
          run={run}
          accessToken={accessToken}
          onRefreshAfterSubmit={onRefreshRun ?? (() => Promise.resolve())}
        />
      )}

      {structuredPending && accessToken && (
        <RunStructuredApprovalSection
          run={run}
          accessToken={accessToken}
          onRefreshAfterSubmit={onRefreshRun ?? (() => Promise.resolve())}
        />
      )}

      {accessToken && (
        <RunFlowApprovalSection
          run={run}
          accessToken={accessToken}
          onRefreshAfterSubmit={onRefreshRun ?? (() => Promise.resolve())}
        />
      )}

      {showGenericApproval && (
        <section data-testid="run-detail-approval">
          <SectionTitle icon={WarningIcon} tone="warning">
            Awaiting human approval
          </SectionTitle>
          <div className="gba:rounded-lg gba:border gba:border-amber-500/40 gba:bg-amber-500/5 gba:px-3 gba:py-3 gba:text-xs gba:text-amber-900 gba:dark:text-amber-100">
            {run.pending_human_question && <p className="gba:mb-2 gba:font-medium">{run.pending_human_question}</p>}
            {draftSubject && (
              <p className="gba:mb-2 gba:text-[11px] gba:text-amber-700 gba:dark:text-amber-200">
                <span className="gba:font-semibold">Subject:</span> {draftSubject}
              </p>
            )}
            {draftBody && (
              <div className="gba:rounded-md gba:border gba:border-amber-500/30 gba:bg-background gba:px-3 gba:py-2 gba:text-foreground">
                <RunMarkdown content={draftBody} />
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionTitle icon={SparkleIcon}>Output</SectionTitle>
        <div
          className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-5 gba:text-sm gba:leading-relaxed gba:shadow-sm"
          data-testid="run-detail-output"
        >
          {run.output ? (
            <RunMarkdown content={run.output} />
          ) : (
            <p className="gba:text-xs gba:italic gba:text-muted-foreground">(no output yet)</p>
          )}
        </div>
      </section>

      {artifacts.length > 0 && (
        <section>
          <SectionTitle icon={FilesIcon}>Artifacts</SectionTitle>
          <ul className="gba:space-y-1.5" data-testid="run-detail-artifacts">
            {artifacts.map(artifact => (
              <li
                key={artifact.path ?? artifact.name}
                className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border/60 gba:bg-card gba:px-3 gba:py-2 gba:text-xs gba:text-foreground"
              >
                <FileIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                <div className="gba:min-w-0 gba:flex-1">
                  <p className="gba:truncate gba:font-medium">{artifact.name}</p>
                  {artifact.path && artifact.path !== artifact.name && (
                    <p className="gba:truncate gba:text-[11px] gba:text-muted-foreground">{artifact.path}</p>
                  )}
                </div>
                <span className="gba:text-[11px] gba:text-muted-foreground">{formatBytes(artifact.size)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
