import { useCallback, useMemo } from 'react'
import { Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowRightIcon, CheckCircleIcon, SparkleIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react'
import SheetWrapperComponent from '@/business-apps/mdm/apps/generic-components/sheet-wrapper/SheetWrapperComponent'
import type { MergeProposal } from '../hooks/useSkillDeduplication'
import type { MergeProgress } from '../hooks/useSkillMerge'
import translations from '../_i18n'

type PanelState = 'analyzing' | 'review' | 'executing' | 'done'

interface SkillDeduplicationPanelProps {
  isOpen: boolean
  onClose: () => void
  panelState: PanelState
  proposals: MergeProposal[]
  isAnalyzing: boolean
  analysisError: string | null
  isExecuting: boolean
  progress: MergeProgress | null
  mergeErrors: string[]
  onApprove: (index: number) => void
  onReject: (index: number) => void
  onApproveAllHigh: () => void
  onExecute: () => void
  onReset: () => void
  prefixDataTestId?: string
}

function getEmployeeCount(skill: { employeeSkillsAggregate?: { aggregate: { count: number } } }): number {
  return skill.employeeSkillsAggregate?.aggregate?.count ?? 0
}

function ProposalCard({
  proposal,
  index,
  onApprove,
  onReject,
  disabled
}: Readonly<{
  proposal: MergeProposal
  index: number
  onApprove: (i: number) => void
  onReject: (i: number) => void
  disabled: boolean
}>) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:border gba:rounded-lg gba:p-4 gba:space-y-3">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant={proposal.confidence === 'high' ? 'success' : 'outline'}>
            {proposal.confidence === 'high' ? t('dedup-confidence-high') : t('dedup-confidence-medium')}
          </Badge>
          {proposal.status === 'merged' && (
            <Badge variant="success">
              <CheckCircleIcon className="gba:h-3 gba:w-3 gba:mr-1" />
              {t('dedup-status-merged')}
            </Badge>
          )}
          {proposal.status === 'error' && (
            <Badge variant="destructive">
              <XCircleIcon className="gba:h-3 gba:w-3 gba:mr-1" />
              {t('dedup-status-error')}
            </Badge>
          )}
          {proposal.status === 'approved' && <Badge variant="secondary">{t('dedup-status-approved')}</Badge>}
          {proposal.status === 'rejected' && <Badge variant="outline">{t('dedup-status-rejected')}</Badge>}
        </div>
      </div>

      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
          <span className="gba:min-w-0 gba:flex-1 gba:text-sm gba:font-semibold gba:leading-5 gba:whitespace-normal gba:break-words">
            {proposal.targetSkill.name}
          </span>
          <Badge variant="outline" className="gba:shrink-0 gba:whitespace-nowrap gba:mt-0.5">
            {t('dedup-employees-count', { count: String(getEmployeeCount(proposal.targetSkill)) })}
          </Badge>
          <Badge variant="secondary" className="gba:shrink-0 gba:whitespace-nowrap gba:mt-0.5">
            {t('dedup-target-label')}
          </Badge>
        </div>

        {proposal.duplicates.map(dup => (
          <div key={dup.id} className="gba:flex gba:items-start gba:gap-2 gba:pl-4 gba:min-w-0">
            <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0 gba:mt-1" />
            <span className="gba:min-w-0 gba:flex-1 gba:text-sm gba:text-muted-foreground gba:leading-5 gba:whitespace-normal gba:break-words">
              {dup.name}
            </span>
            <Badge variant="outline" className="gba:shrink-0 gba:whitespace-nowrap gba:mt-0.5">
              {t('dedup-employees-count', { count: String(getEmployeeCount(dup)) })}
            </Badge>
          </div>
        ))}
      </div>

      {proposal.error && <p className="gba:text-xs gba:text-destructive">{proposal.error}</p>}

      {proposal.status === 'pending' && (
        <div className="gba:flex gba:gap-2 gba:pt-1">
          <Button size="sm" variant="default" onClick={() => onApprove(index)} disabled={disabled}>
            {t('dedup-approve')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(index)} disabled={disabled}>
            {t('dedup-reject')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function SkillDeduplicationPanel({
  isOpen,
  onClose,
  panelState,
  proposals,
  analysisError,
  isExecuting,
  progress,
  mergeErrors,
  onApprove,
  onReject,
  onApproveAllHigh,
  onExecute,
  prefixDataTestId
}: Readonly<SkillDeduplicationPanelProps>) {
  const { t } = useTranslation(translations)

  const approvedCount = useMemo(() => proposals.filter(p => p.status === 'approved').length, [proposals])
  const pendingCount = useMemo(() => proposals.filter(p => p.status === 'pending').length, [proposals])
  const highPendingCount = useMemo(
    () => proposals.filter(p => p.status === 'pending' && p.confidence === 'high').length,
    [proposals]
  )
  const mergedCount = useMemo(() => proposals.filter(p => p.status === 'merged').length, [proposals])
  const errorCount = useMemo(() => proposals.filter(p => p.status === 'error').length, [proposals])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const content = useMemo(() => {
    if (panelState === 'analyzing') {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-4">
          <Spinner />
          <p className="gba:text-sm gba:text-muted-foreground">{t('dedup-analyzing')}</p>
        </div>
      )
    }

    if (analysisError) {
      const isNoDuplicates = analysisError === 'no-duplicates-found'
      const translatedAnalysisError = analysisError.startsWith('dedup-') ? t(analysisError) : analysisError
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-3">
          {isNoDuplicates ? (
            <CheckCircleIcon className="gba:h-12 gba:w-12 gba:text-green-500" />
          ) : (
            <WarningIcon className="gba:h-12 gba:w-12 gba:text-yellow-500" />
          )}
          <p className="gba:text-sm gba:font-medium">
            {isNoDuplicates ? t('dedup-no-duplicates') : t('dedup-analysis-error')}
          </p>
          {!isNoDuplicates && <p className="gba:text-xs gba:text-muted-foreground">{translatedAnalysisError}</p>}
        </div>
      )
    }

    if (panelState === 'executing') {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-4">
          <Spinner />
          {progress && (
            <>
              <p className="gba:text-sm gba:font-medium">
                {t('dedup-executing-progress', {
                  current: String(progress.current),
                  total: String(progress.total)
                })}
              </p>
              {progress.currentSkillName && (
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('dedup-executing-skill', { name: progress.currentSkillName })}
                </p>
              )}
            </>
          )}
        </div>
      )
    }

    if (panelState === 'done') {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-4">
          <CheckCircleIcon className="gba:h-12 gba:w-12 gba:text-green-500" />
          <p className="gba:text-sm gba:font-medium">{t('dedup-done-title')}</p>
          <div className="gba:flex gba:gap-4 gba:text-sm">
            {mergedCount > 0 && (
              <span className="gba:text-green-600">{t('dedup-done-merged', { count: String(mergedCount) })}</span>
            )}
            {errorCount > 0 && (
              <span className="gba:text-destructive">{t('dedup-done-errors', { count: String(errorCount) })}</span>
            )}
          </div>
          {mergeErrors.length > 0 && (
            <div className="gba:w-full gba:space-y-1 gba:mt-2">
              {mergeErrors.map(errorMessage => (
                <p key={errorMessage} className="gba:text-xs gba:text-destructive">
                  {errorMessage}
                </p>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={handleClose} className="gba:mt-2">
            {t('dedup-done-close')}
          </Button>
        </div>
      )
    }

    return (
      <div className="gba:space-y-4">
        <div className="gba:flex gba:flex-col gba:gap-2">
          <p className="gba:text-sm gba:text-muted-foreground gba:shrink-0">
            {t('dedup-proposals-found', { count: String(proposals.length) })}
          </p>
          <div className="gba:grid gba:w-full gba:grid-cols-1 gba:gap-2">
            {highPendingCount > 0 && (
              <Button size="sm" variant="outline" onClick={onApproveAllHigh} className="gba:w-full gba:justify-center">
                {t('dedup-approve-all-high', { count: String(highPendingCount) })}
              </Button>
            )}
            {approvedCount > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={onExecute}
                disabled={isExecuting}
                className="gba:w-full gba:justify-center"
              >
                {pendingCount === 0
                  ? t('dedup-execute-merges', { count: String(approvedCount) })
                  : t('dedup-execute-approved', { count: String(approvedCount) })}
              </Button>
            )}
          </div>
        </div>

        {proposals.map((proposal, index) => {
          const proposalKey = `${proposal.targetSkill.id}-${proposal.duplicates.map(duplicate => duplicate.id).join('-')}`
          return (
            <ProposalCard
              key={proposalKey}
              proposal={proposal}
              index={index}
              onApprove={onApprove}
              onReject={onReject}
              disabled={isExecuting}
            />
          )
        })}
      </div>
    )
  }, [
    panelState,
    analysisError,
    progress,
    mergedCount,
    errorCount,
    mergeErrors,
    proposals,
    highPendingCount,
    approvedCount,
    pendingCount,
    isExecuting,
    onApprove,
    onReject,
    onApproveAllHigh,
    onExecute,
    handleClose,
    t
  ])

  return (
    <SheetWrapperComponent
      prefixDataTestId={prefixDataTestId ?? ''}
      isDrawerVisible={isOpen}
      onOpenChange={openStatus => {
        if (!openStatus) handleClose()
      }}
      title={t('dedup-panel-title')}
      titleIcon={SparkleIcon}
      drawerItems={[]}
      extraContent={content}
      isFooterVisible={true}
    />
  )
}
