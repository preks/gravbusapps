import React from 'react'
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { LinksRenderer } from '@/business-apps/flow/apps/creator/components/shared/LinksRenderer'
import { ReadonlyTemplateFlowCanvas } from '@/common/components/flow/ReadonlyTemplateFlowCanvas'
import translations from '../../_i18n'
import type { DecisionLogEntry } from '../../hooks/useDecisionData'
import { getAvailableDecisionBranches } from '../../utils/decisionDetails'
import { SuccessExpressionText } from '../shared'
import { formatDateTime, formatStatusLabel } from '../../utils/formatters'

interface DecisionDetailsDialogProps {
  entry: DecisionLogEntry | null
  actorName?: string
  accessToken?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  'data-testid'?: string
}

function formatJson(value: unknown): string {
  if (value == null) return '{}'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeExpressionKey(value: string): string {
  const trimmed = String(value || '').trim()
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    return trimmed.slice(2, -2).trim()
  }
  return trimmed
}

function humanizeWorkflowFieldName(value: string): string {
  const lastSegment = value.split('.').pop() || value
  return lastSegment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase())
}

function formatInlineValue(value: unknown): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return formatJson(value)
}

function getEscalationLabel(entry: DecisionLogEntry, t: (key: string) => string): string {
  return entry.escalated ? t('decisions-escalation-yes') : t('decisions-escalation-no')
}

function DetailField({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`gba:flex gba:flex-col gba:gap-1 ${wide ? 'gba:md:col-span-2' : ''}`}>
      <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{label}</span>
      <div className="gba:text-sm gba:text-foreground">{children}</div>
    </div>
  )
}

export const DecisionDetailsDialog: React.FC<DecisionDetailsDialogProps> = ({
  entry,
  actorName,
  accessToken,
  open,
  onOpenChange,
  'data-testid': testId = 'decision-details-dialog'
}) => {
  const { t } = useTranslation(translations)
  const selectedBranchLabel = entry?.selectedBranchLabel || entry?.selectedBranch || t('value-not-available')
  const selectedBranchId = entry?.selectedBranch || ''
  const flowTitle = entry?.flowName || entry?.flowId || t('value-not-available')
  const aiSuggestedBranch = entry?.aiSuggestedBranch || t('value-not-available')
  const decisionPath = entry
    ? entry.decisionMode === 'AI' && entry.escalated
      ? t('decisions-escalated-short')
      : entry.decisionMode === 'AI'
        ? t('decisions-direct')
        : entry.decisionMode === 'USER'
          ? t('decisions-user-direct')
          : entry.decisionMode === 'LOGIC'
            ? t('decisions-logic-direct')
            : formatStatusLabel(entry.decisionMode)
    : t('value-not-available')
  const escalationLabel = entry ? getEscalationLabel(entry, t) : t('value-not-available')
  const decisionInput = asRecord(entry?.decisionInput)
  const decisionOutput = asRecord(entry?.decisionOutput)
  const logicConditionInput = asRecord(decisionInput?.conditionInputs)
  const logicRouteType = entry?.logicRouteType || getStringValue(decisionOutput?.routeType)
  const logicMatchedCondition = entry?.logicMatchedCondition || getStringValue(decisionOutput?.matchedCondition)
  const logicFallbackReason = entry?.logicFallbackReason || getStringValue(decisionOutput?.fallbackReason)
  const isAiDecision = entry?.decisionMode === 'AI'
  const isLogicDecision = entry?.decisionMode === 'LOGIC'
  const isUserDecision = entry?.decisionMode === 'USER'
  const durationLabel = entry && entry.durationMs > 0 ? `${entry.durationMs}ms` : null
  const promptLabel =
    entry?.promptName && typeof entry.promptVersion === 'number'
      ? `${entry.promptName} v${entry.promptVersion}`
      : entry?.promptName
  const policyLabel =
    entry?.policyDocumentTitle && entry.policyDocumentVersion
      ? `${entry.policyDocumentTitle} · ${entry.policyDocumentVersion}`
      : entry?.policyDocumentTitle
  const logicRouteTypeLabel =
    logicRouteType === 'MATCHED_RULE'
      ? t('decisions-logic-route-matched-rule')
      : logicRouteType === 'DEFAULT_BRANCH'
        ? t('decisions-logic-route-default-branch')
        : logicRouteType
          ? formatStatusLabel(logicRouteType)
          : null
  const inputLabel = isLogicDecision ? t('decisions-logic-condition-input') : t('decisions-input')
  const inputValue = isLogicDecision && logicConditionInput ? logicConditionInput : entry?.decisionInput
  const detailTextLabel = isUserDecision ? t('decisions-message') : t('decisions-instructions')
  const showRawPayloads = isAiDecision
  const defaultBranchLabel = entry?.defaultBranchLabel || entry?.defaultBranchId
  const workflowVariableLabels = entry?.workflowVariableLabels || {}
  const logicRoutes = entry?.logicRoutes || []
  const availableBranches = getAvailableDecisionBranches(entry)
  const showOverviewPath = !isAiDecision
  const showContextTab =
    Boolean(entry?.decisionInstructions) ||
    Boolean(entry?.humanReviewInstructions) ||
    Boolean(entry?.decisionLinks?.length) ||
    Boolean(availableBranches.length) ||
    Boolean(logicRoutes.length) ||
    Boolean(logicMatchedCondition) ||
    Boolean(defaultBranchLabel)
  const showDiagnosticsTab =
    Boolean(entry?.escalationReason) ||
    Boolean(entry?.promptExecutionId) ||
    Boolean(selectedBranchId && selectedBranchId !== selectedBranchLabel) ||
    Boolean(!isUserDecision && !isAiDecision) ||
    Boolean(showRawPayloads) ||
    Boolean((accessToken && (entry?.templateId || entry?.originalTemplate) && entry?.stepReference) || false)

  const resolveExpressionLabel = (expression: string) => {
    const normalizedExpression = normalizeExpressionKey(expression)
    const configuredLabel =
      workflowVariableLabels[expression] ||
      workflowVariableLabels[normalizedExpression] ||
      workflowVariableLabels[`{{${normalizedExpression}}}`]

    if (configuredLabel) return configuredLabel

    if (normalizedExpression.startsWith('$workflow.input.')) {
      return humanizeWorkflowFieldName(normalizedExpression)
    }

    if (normalizedExpression === '$workflow.initiator') {
      return t('expression-pill-workflow-variable')
    }

    return undefined
  }

  const renderLogicConditionInputs = () => {
    const entries = Object.entries(logicConditionInput || {})
    if (!entries.length) {
      return (
        <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-logic-condition-input-empty`}>
          {t('value-not-available')}
        </span>
      )
    }

    return (
      <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-logic-condition-input-list`}>
        {entries.map(([expression, value], index) => (
          <div
            key={`${expression}-${index}`}
            className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:rounded-md gba:bg-muted gba:px-3 gba:py-2"
          >
            <SuccessExpressionText
              value={expression}
              fallback={t('value-not-available')}
              resolveExpressionLabel={resolveExpressionLabel}
              data-testid={`${testId}-logic-condition-input-expression-${index}`}
            />
            <span className="gba:text-sm gba:text-muted-foreground">=</span>
            <span
              className="gba:text-sm gba:text-foreground"
              data-testid={`${testId}-logic-condition-input-value-${index}`}
            >
              {formatInlineValue(value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderLogicRoutes = (showIds = false) => {
    if (!logicRoutes.length) return null

    return (
      <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-logic-routes`}>
        {logicRoutes.map((route, index) => {
          const branchLabel = route.branchLabel || route.branchId || t('value-not-available')
          const routeKey = `${route.branchId || 'branch'}-${route.condition || (route.isDefault ? 'default' : `route-${index}`)}`
          return (
            <div
              key={routeKey}
              className="gba:flex gba:flex-col gba:gap-2 gba:rounded-md gba:bg-muted gba:px-3 gba:py-2"
            >
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                {route.condition ? (
                  <SuccessExpressionText
                    value={route.condition}
                    fallback={t('value-not-available')}
                    resolveExpressionLabel={resolveExpressionLabel}
                    data-testid={`${testId}-logic-route-condition-${index}`}
                  />
                ) : (
                  <span className="gba:text-sm gba:text-muted-foreground">{t('decisions-logic-default-branch')}</span>
                )}
                <span className="gba:text-sm gba:text-muted-foreground">-&gt;</span>
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{branchLabel}</span>
                {route.isSelected ? (
                  <Badge
                    variant="secondary"
                    className="gba:border-none gba:bg-info-secondary gba:text-info gba:font-medium"
                  >
                    {t('decisions-selected')}
                  </Badge>
                ) : null}
                {route.isDefault ? <Badge variant="outline">{t('decisions-default')}</Badge> : null}
              </div>
              {showIds && route.branchId && route.branchId !== branchLabel ? (
                <span className="gba:text-xs gba:break-all gba:text-muted-foreground">
                  {t('decisions-branch-id')}: {route.branchId}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const renderAvailableBranches = (showIds = false) => {
    if (!availableBranches.length) return null

    return (
      <div className="gba:flex gba:flex-col gba:gap-2" data-testid={`${testId}-available-branches`}>
        {availableBranches.map((branch, index) => {
          const branchLabel = branch.branchLabel || branch.branchId || t('value-not-available')
          return (
            <div
              key={`${branch.branchId || 'branch'}-${index}`}
              className="gba:flex gba:flex-col gba:gap-2 gba:rounded-md gba:bg-muted gba:px-3 gba:py-2"
            >
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:font-medium gba:text-foreground">{branchLabel}</span>
                {branch.isSelected ? (
                  <Badge
                    variant="secondary"
                    className="gba:border-none gba:bg-info-secondary gba:text-info gba:font-medium"
                  >
                    {t('decisions-selected')}
                  </Badge>
                ) : null}
                {branch.isDefault && !isUserDecision ? <Badge variant="outline">{t('decisions-default')}</Badge> : null}
              </div>
              {showIds && branch.branchId && branch.branchId !== branchLabel ? (
                <span className="gba:text-xs gba:break-all gba:text-muted-foreground">
                  {t('decisions-branch-id')}: {branch.branchId}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:flex gba:max-h-screen gba:max-w-3xl gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{flowTitle}</DialogTitle>
          <DialogDescription>
            {entry ? formatStatusLabel(entry.decisionMode) : t('value-not-available')}
            {entry?.createdAt ? ` · ${formatDateTime(entry.createdAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="gba:flex gba:flex-col gba:gap-5 gba:overflow-y-auto gba:pr-1">
            <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
              <DetailField label={t('decisions-decided-by')}>
                <span>{actorName || entry.decidedBy || t('value-not-available')}</span>
              </DetailField>
              <DetailField label={t('decisions-mode')}>
                <span>{formatStatusLabel(entry.decisionMode)}</span>
              </DetailField>
              {showOverviewPath ? (
                <DetailField label={t('decisions-path')}>
                  <span>{decisionPath}</span>
                </DetailField>
              ) : null}
              <DetailField label={t('decisions-selected-branch')}>
                <span>{selectedBranchLabel}</span>
              </DetailField>
              {durationLabel ? (
                <DetailField label={t('decisions-duration')}>
                  <span>{durationLabel}</span>
                </DetailField>
              ) : null}
              {isAiDecision ? (
                <DetailField label={t('decisions-escalation')}>
                  <span className={entry.escalated ? 'gba:font-medium gba:text-warning' : 'gba:text-foreground'}>
                    {escalationLabel}
                  </span>
                </DetailField>
              ) : null}
              {isAiDecision && entry.confidence != null ? (
                <DetailField label={t('decisions-confidence')}>
                  <span>{`${Math.round(entry.confidence * 100)}%`}</span>
                </DetailField>
              ) : null}
              {isAiDecision && promptLabel ? (
                <DetailField label={t('decisions-prompt')}>
                  <span>{promptLabel}</span>
                </DetailField>
              ) : null}
              {isAiDecision && policyLabel ? (
                <DetailField label={t('decisions-policy')}>
                  <span>{policyLabel}</span>
                </DetailField>
              ) : null}
              {isAiDecision && entry.aiSuggestedBranch ? (
                <DetailField label={t('decisions-ai-suggested-branch')}>
                  <span>{aiSuggestedBranch}</span>
                </DetailField>
              ) : null}
              {isAiDecision && entry.branchAgreement != null ? (
                <DetailField label={t('decisions-branch-agreement-title')}>
                  <span>
                    {entry.branchAgreement
                      ? t('decisions-branch-agreement-match')
                      : t('decisions-branch-agreement-mismatch')}
                  </span>
                </DetailField>
              ) : null}
              {isLogicDecision && logicRouteTypeLabel ? (
                <DetailField label={t('decisions-logic-route-type')}>
                  <span>{logicRouteTypeLabel}</span>
                </DetailField>
              ) : null}
              {isLogicDecision && logicFallbackReason ? (
                <DetailField label={t('decisions-logic-fallback-reason')}>
                  <span>{logicFallbackReason}</span>
                </DetailField>
              ) : null}
            </div>

            <Tabs defaultValue="overview" className="gba:flex gba:flex-col gba:gap-4">
              <TabsList className="gba:w-full gba:justify-start" data-testid={`${testId}-tabs`}>
                <TabsTrigger value="overview">{t('decisions-tab-overview')}</TabsTrigger>
                {showContextTab ? <TabsTrigger value="context">{t('decisions-tab-context')}</TabsTrigger> : null}
                {showDiagnosticsTab ? (
                  <TabsTrigger value="diagnostics">{t('decisions-tab-diagnostics')}</TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="overview" className="gba:mt-0">
                <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
                  {isUserDecision && entry.decisionTitle ? (
                    <DetailField label={t('decisions-task-title')} wide>
                      <span>{entry.decisionTitle}</span>
                    </DetailField>
                  ) : null}
                  {isAiDecision && entry.decisionReasoning ? (
                    <DetailField label={t('decisions-reasoning')} wide>
                      <span className="gba:whitespace-pre-wrap">{entry.decisionReasoning}</span>
                    </DetailField>
                  ) : null}
                  {isLogicDecision && !logicRoutes.length && logicMatchedCondition ? (
                    <DetailField label={t('decisions-logic-condition')} wide>
                      <SuccessExpressionText
                        value={logicMatchedCondition}
                        fallback={t('value-not-available')}
                        resolveExpressionLabel={resolveExpressionLabel}
                        data-testid={`${testId}-logic-rule`}
                      />
                    </DetailField>
                  ) : null}
                  {!entry.decisionReasoning && entry.decisionInstructions ? (
                    <DetailField label={detailTextLabel} wide>
                      <SuccessExpressionText
                        value={entry.decisionInstructions}
                        fallback={t('decisions-no-instructions')}
                        data-testid={`${testId}-instructions-overview`}
                      />
                    </DetailField>
                  ) : null}
                </div>
              </TabsContent>

              {showContextTab ? (
                <TabsContent value="context" className="gba:mt-0">
                  <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
                    {(isAiDecision || isLogicDecision || isUserDecision) && entry.decisionInstructions ? (
                      <DetailField label={detailTextLabel} wide>
                        <SuccessExpressionText
                          value={entry.decisionInstructions}
                          fallback={t('decisions-no-instructions')}
                          data-testid={`${testId}-instructions`}
                        />
                      </DetailField>
                    ) : null}
                    {isAiDecision && entry.humanReviewInstructions ? (
                      <DetailField label={t('decisions-human-review-instructions')} wide>
                        <SuccessExpressionText
                          value={entry.humanReviewInstructions}
                          fallback={t('decisions-no-human-review-instructions')}
                          data-testid={`${testId}-human-instructions`}
                        />
                      </DetailField>
                    ) : null}
                    {!isLogicDecision && availableBranches.length ? (
                      <DetailField label={t('decisions-available-branches')} wide>
                        {renderAvailableBranches()}
                      </DetailField>
                    ) : null}
                    {isLogicDecision && logicRoutes.length ? (
                      <DetailField label={t('decisions-logic-routes')} wide>
                        {renderLogicRoutes()}
                      </DetailField>
                    ) : null}
                    {isLogicDecision && !logicRoutes.length && defaultBranchLabel ? (
                      <DetailField label={t('decisions-logic-default-branch')}>
                        <span>{defaultBranchLabel}</span>
                      </DetailField>
                    ) : null}
                    {isUserDecision && entry.decisionLinks?.length ? (
                      <div className="gba:md:col-span-2">
                        <LinksRenderer
                          links={entry.decisionLinks}
                          accessToken={accessToken}
                          testId={`${testId}-decision-links`}
                        />
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
              ) : null}

              {showDiagnosticsTab ? (
                <TabsContent value="diagnostics" className="gba:mt-0">
                  <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
                    {selectedBranchId && selectedBranchId !== selectedBranchLabel ? (
                      <DetailField label={t('decisions-branch-id')} wide>
                        <span className="gba:break-all">{selectedBranchId}</span>
                      </DetailField>
                    ) : null}
                    {isAiDecision && entry.escalationReason ? (
                      <DetailField label={t('decisions-escalation')} wide>
                        <span>{entry.escalationReason}</span>
                      </DetailField>
                    ) : null}
                    {isAiDecision && entry.promptExecutionId ? (
                      <DetailField label={t('decisions-prompt-execution-id')} wide>
                        <span>{entry.promptExecutionId}</span>
                      </DetailField>
                    ) : null}
                    {isLogicDecision && !isUserDecision && !isAiDecision ? (
                      <div className="gba:flex gba:flex-col gba:gap-2 gba:md:col-span-2">
                        <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{inputLabel}</span>
                        {isLogicDecision ? (
                          renderLogicConditionInputs()
                        ) : (
                          <pre className="gba:max-h-56 gba:overflow-auto gba:rounded-lg gba:bg-muted gba:p-3 gba:text-xs gba:text-foreground">
                            {formatJson(inputValue)}
                          </pre>
                        )}
                      </div>
                    ) : null}
                    {showRawPayloads ? (
                      <>
                        <div className="gba:flex gba:flex-col gba:gap-2 gba:md:col-span-2">
                          <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                            {t('decisions-input')}
                          </span>
                          <pre className="gba:max-h-56 gba:overflow-auto gba:rounded-lg gba:bg-muted gba:p-3 gba:text-xs gba:text-foreground">
                            {formatJson(entry.decisionInput)}
                          </pre>
                        </div>
                        <div className="gba:flex gba:flex-col gba:gap-2 gba:md:col-span-2">
                          <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                            {t('decisions-output')}
                          </span>
                          <pre className="gba:max-h-56 gba:overflow-auto gba:rounded-lg gba:bg-muted gba:p-3 gba:text-xs gba:text-foreground">
                            {formatJson(entry.decisionOutput)}
                          </pre>
                        </div>
                      </>
                    ) : null}
                    {accessToken && (entry.templateId || entry.originalTemplate) && entry.stepReference ? (
                      <div className="gba:md:col-span-2">
                        <ReadonlyTemplateFlowCanvas
                          accessToken={accessToken}
                          templateId={entry.templateId}
                          templateDefinition={entry.originalTemplate}
                          title={t('label-flow')}
                          description={t('decisions-flow-preview-description')}
                          emptyTitle={t('state-empty')}
                          emptyDescription={t('state-empty')}
                          selectedStepReference={entry.stepReference}
                          isVisible={open}
                          compact={true}
                          showControls={false}
                          data-testid={`${testId}-flow-preview`}
                        />
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
