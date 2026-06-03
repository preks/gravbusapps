// Scrollable body of the full-screen run detail. Surfaces everything we know
// about a run — the task, any draft awaiting human approval, the final output,
// file artifacts, the policies it applied, the records it touched, the
// (coalesced) trace, the audit backtrace, and the cost.

import {
  CoinsIcon,
  FileIcon,
  FilesIcon,
  SparkleIcon,
  TrayIcon,
  TreeStructureIcon,
  WarningIcon
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import React from 'react'
import { GroupedTraceTimeline } from '../agent-detail/trace/GroupedTraceTimeline'
import { PolicyUsedChips } from '../PolicyUsedChips'
import { RunAuditTimeline } from '../RunAuditTimeline'
import { RunEmailApprovalSection } from '../RunEmailApprovalSection'
import { RunEntityLinks } from '../RunEntityLinks'
import { RunMarkdown } from '../RunMarkdown'
import { readTotalTokens, runCredits } from '../runDisplay'
import { getComposeEmailPending } from '../workforceComposeEmail'
import type { WorkforceRun, WorkforceRunArtifactSummary, WorkforceRunTraceEvent } from '../workforceTypes'
import { extractDraftBody, extractDraftSubject, formatBytes, resolveDomainActions } from './runDetailFacts'

export interface RunDetailBodyProps {
  run: WorkforceRun
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  errorMessage?: string | null
  onRefreshRun?: () => Promise<void>
}

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: Icon; tone?: 'default' | 'warning' }> = ({
  children,
  icon: IconComponent,
  tone = 'default'
}) => (
  <div className="gba:mb-2.5 gba:flex gba:items-center gba:gap-2">
    {IconComponent && (
      <span
        className={`gba:inline-flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-md ${
          tone === 'warning'
            ? 'gba:bg-amber-500/10 gba:text-amber-600 gba:dark:text-amber-400'
            : 'gba:bg-primary/10 gba:text-primary'
        }`}
      >
        <IconComponent className="gba:h-3.5 gba:w-3.5" weight="bold" />
      </span>
    )}
    <h2
      className={`gba:text-sm gba:font-semibold ${
        tone === 'warning' ? 'gba:text-amber-600 gba:dark:text-amber-400' : 'gba:text-foreground'
      }`}
    >
      {children}
    </h2>
  </div>
)

export const RunDetailBody: React.FC<RunDetailBodyProps> = ({
  run,
  accessToken,
  trace,
  errorMessage,
  onRefreshRun
}) => {
  const totalTokens = readTotalTokens(run)
  const credits = runCredits(run)
  // A pending compose_email interrupt gets the interactive approval UX;
  // anything else (a plain draft or a free-form question) falls back to the
  // read-only preview below.
  const composePending = getComposeEmailPending(run.pending_structured_input)
  const draftBody = composePending ? null : extractDraftBody(run.pending_structured_input)
  const draftSubject = composePending ? null : extractDraftSubject(run.pending_structured_input)
  const artifacts: WorkforceRunArtifactSummary[] = run.artifacts ?? []
  const domainActions = resolveDomainActions(run)
  const showGenericApproval = !composePending && (draftBody || run.pending_human_question)

  return (
    <div className="gba:flex-1 gba:overflow-y-auto gba:bg-background">
      <div className="gba:mx-auto gba:max-w-5xl gba:space-y-6 gba:px-6 gba:py-6">
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

        <PolicyUsedChips trace={trace} />

        <RunEntityLinks actions={domainActions} caseRef={run.case_ref} />

        <section data-testid="run-detail-trace">
          <SectionTitle icon={TreeStructureIcon}>Trace</SectionTitle>
          <GroupedTraceTimeline trace={trace} />
        </section>

        {accessToken && <RunAuditTimeline sessionId={run.session_id} accessToken={accessToken} />}

        <section>
          <SectionTitle icon={CoinsIcon}>Cost</SectionTitle>
          <div className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:text-xs gba:text-foreground">
            <CoinsIcon className="gba:h-4 gba:w-4 gba:text-primary" />
            <div>
              <div className="gba:font-semibold">{credits} Newwork credits</div>
              <div className="gba:text-[11px] gba:text-muted-foreground">
                {totalTokens.toLocaleString()} total tokens
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
