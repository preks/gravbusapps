import React, { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  TabSwitch,
  TabSwitchContent,
  TabSwitchList,
  TabSwitchTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  GitBranch,
  History,
  Languages,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  Workflow
} from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'
import type { DetectedLanguage, TranslatedTexts } from '@/common/components/content'
import { ContentHtmlRenderer } from '../ContentHtmlRenderer'
import { toast } from 'sonner'
import { openEveryAI } from '@/common/utils/openEveryAI'
import translations from '../../_i18n'
import PolicyAcknowledgementDialog from './components/PolicyAcknowledgementDialog'
import PolicyApprovalDialog from './components/PolicyApprovalDialog'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import PolicyExpertsPanel from './components/PolicyExpertsPanel'
import PolicyFlowsPanel from './components/PolicyFlowsPanel'
import PolicyWorkflowsPanel from './components/PolicyWorkflowsPanel'
import CreateExpertDialog from './components/CreateExpertDialog'
import GenerateFlowDialog from './components/GenerateFlowDialog'
import { usePolicySignals } from './hooks/usePolicySignals'

const HERO_BLUE = '#2563eb'

type PolicyControlTab = 'policy' | 'execution'

interface PolicyViewProps {
  item: ContentEntry
  accessToken: string
  userId: string | undefined
  employeeId: string | undefined
  targetLanguage?: string | null
  translatedTexts?: TranslatedTexts | null
  detectedLanguage?: DetectedLanguage | null
  isDetecting?: boolean
  isTranslating?: boolean
  onBackClick?: () => void
  onLanguageSelect?: (languageId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Action button in sidebar                                           */
/* ------------------------------------------------------------------ */
const SidebarAction: React.FC<{
  icon: React.ReactNode
  label: string
  description: string
  variant?: 'default' | 'outline' | 'secondary'
  /** Custom inline style – used to apply the hero blue to the primary action */
  style?: React.CSSProperties
  onClick: () => void
  testId?: string
  disabled?: boolean
  /** Subtle hint shown below the description when disabled */
  disabledHint?: string
}> = ({ icon, label, description, variant = 'outline', style, onClick, testId, disabled, disabledHint }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    data-testid={testId}
    style={variant === 'default' && !disabled ? style : undefined}
    className={[
      'gba:group gba:flex gba:items-start gba:gap-3 gba:w-full gba:rounded-lg gba:border gba:p-3 gba:text-left gba:transition-all gba:duration-200',
      disabled
        ? 'gba:opacity-50 gba:cursor-not-allowed gba:border-border gba:bg-card'
        : variant === 'default'
          ? 'gba:border-transparent gba:text-white gba:hover:opacity-90'
          : 'gba:border-border gba:bg-card gba:hover:bg-accent gba:hover:border-accent-foreground/20'
    ].join(' ')}
  >
    <div
      className={[
        'gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:transition-colors',
        disabled
          ? 'gba:bg-muted'
          : variant === 'default'
            ? 'gba:bg-white/20'
            : 'gba:bg-muted gba:group-hover:bg-accent-foreground/10'
      ].join(' ')}
    >
      {icon}
    </div>
    <div className="gba:flex gba:flex-col gba:gap-0.5 gba:min-w-0">
      <span className="gba:text-sm gba:font-medium gba:leading-tight">{label}</span>
      <span
        className={[
          'gba:text-xs gba:leading-snug',
          disabled
            ? 'gba:text-muted-foreground'
            : variant === 'default'
              ? 'gba:text-white/70'
              : 'gba:text-muted-foreground'
        ].join(' ')}
      >
        {description}
      </span>
      {disabled && disabledHint && (
        <span className="gba:text-xs gba:text-warning-foreground gba:mt-0.5">{disabledHint}</span>
      )}
    </div>
  </button>
)

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export const PolicyView: React.FC<PolicyViewProps> = ({
  item,
  accessToken,
  userId,
  targetLanguage,
  translatedTexts,
  detectedLanguage,
  isDetecting,
  isTranslating,
  onBackClick,
  onLanguageSelect
}) => {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphqlClient(accessToken)
  const [activeTab, setActiveTab] = useState<PolicyControlTab>('policy')
  const [ackDialogOpen, setAckDialogOpen] = useState(false)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [createExpertDialogOpen, setCreateExpertDialogOpen] = useState(false)
  const [generateFlowDialogOpen, setGenerateFlowDialogOpen] = useState(false)

  const displayTitle = translatedTexts?.title || item.title
  const displayContent = translatedTexts?.content || item.content

  const policyRootId = (item as any).rootContentEntryId || item.id
  const policyVersionId = item.id
  const entryVersion = (item as any).entryVersion
  const creatorEmployee = (item as any)?.creatorEmployee
  const ownerName = creatorEmployee?.displayName || (item as any)?.createdBy || null
  const ownerPicture = creatorEmployee?.pictureThumbnail || creatorEmployee?.picture || null
  const ownerPictureUrl = ownerPicture
    ? ownerPicture.startsWith('data:')
      ? ownerPicture
      : `data:image/png;base64,${ownerPicture}`
    : null
  const recordState = String((item as any)?.recordState || '').toLowerCase()
  const isDraft = recordState.includes('draft')

  const {
    signals,
    isLoading: isLoadingSignals,
    reload: reloadSignals
  } = usePolicySignals({
    accessToken,
    userId,
    policyRootId: String(policyRootId)
  })

  /** Lifecycle state derived from draft flag + approval status */
  type LifecycleState = 'draft' | 'pending-approval' | 'approved-ready-to-activate' | 'rework-needed' | 'active'
  const policyLifecycleState: LifecycleState = useMemo(() => {
    if (!isDraft) return 'active'
    switch (signals.latestApprovalStatus) {
      case 'pending':
        return 'pending-approval'
      case 'approved':
        return 'approved-ready-to-activate'
      case 'rejected':
        return 'rework-needed'
      default:
        return 'draft'
    }
  }, [isDraft, signals.latestApprovalStatus])

  const effectiveLabel = useMemo(() => {
    const from = item.activeFrom ? new Date(item.activeFrom).toLocaleDateString() : null
    const to = item.activeTo ? new Date(item.activeTo).toLocaleDateString() : null
    if (from && to) return `${from} → ${to}`
    if (from) return t('policy_effective_from', { from })
    if (to) return t('policy_effective_until', { to })
    return null
  }, [item.activeFrom, item.activeTo, t])

  /** Total days the policy has been active */
  const activeDays = useMemo(() => {
    const origin = item.activeFrom || item.createdAt
    if (!origin) return null
    const start = new Date(origin)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    if (diff < 0) return null
    return Math.floor(diff / 86_400_000)
  }, [item.activeFrom, item.createdAt])

  // ---------- handlers ----------
  const handleOpenAcknowledgement = () => {
    if (!userId) {
      toast.error(t('policy_ack_initiator_missing'))
      return
    }
    setAckDialogOpen(true)
  }

  const handleOpenApproval = () => {
    if (!userId) {
      toast.error(t('policy_approval_initiator_missing'))
      return
    }
    setApprovalDialogOpen(true)
  }

  const policyMention = `@${displayTitle}`

  const handleAskEveryAI = () => {
    openEveryAI({
      prompt: `Analyze the policy ${policyMention} and suggest improvements, ambiguous parts to clarify, and a short acknowledgement message for employees.`
    })
  }

  const handleGoToExecution = () => setActiveTab('execution')

  const handleGenerateFlowFromPolicy = () => {
    if (!displayTitle && !displayContent) {
      toast.error(t('policy_flows_generate_missing_policy'))
      return
    }
    setGenerateFlowDialogOpen(true)
  }

  const handleCreateNewVersion = () => {
    // Not wired to backend yet – show placeholder toast
    toast.message(t('policy_new_version_coming_soon'), {
      description: t('policy_new_version_coming_soon_desc')
    })
  }

  const handleCopyVersionId = () => {
    const text = String(policyVersionId || '')
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined)
      toast.success(t('policy_version_id_copied'))
    }
  }

  const handleActivatePolicy = async () => {
    try {
      const mutation = `
        mutation ActivatePolicy($id: uuid!, $changes: ContentEntrySetInput!) {
          updateContentEntryByPk(pkColumns: { id: $id }, _set: $changes) {
            id
            recordState
            activeFrom
            updatedAt
          }
        }
      `
      const changes = {
        recordState: 'active',
        activeFrom: new Date().toISOString()
      }
      await graphqlClient.request(mutation, { id: item.id, changes })
      toast.success(t('policy_activate_success'))
      // Reload signals so KPI bar reflects the new state
      reloadSignals()
    } catch (e) {
      toast.error(t('policy_activate_error'), { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const handleCreateExpertFromPolicy = () => setCreateExpertDialogOpen(true)

  return (
    <div className="gba:overflow-y-auto gba:mb-6" data-testid="policy-view">
      <div className="gba:relative gba:w-full gba:overflow-hidden" data-testid="policy-view-hero">
        <PremiumHeroBackground data-testid="policy-view-hero-background" />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

        {/* Content – white text on video */}
        <div className="gba:relative gba:max-w-[1400px] gba:mx-auto gba:px-6 gba:py-12 gba:md:py-16">
          {/* Back button – top-left inside hero */}
          {onBackClick && (
            <button
              type="button"
              onClick={onBackClick}
              className="gba:flex gba:items-center gba:gap-1.5 gba:text-white/80 gba:hover:text-white gba:text-sm gba:mb-6 gba:transition-colors gba:cursor-pointer"
              data-testid="policy-view-back-button"
            >
              <ArrowLeft className="gba:h-4 gba:w-4" />
              {t('back_to_overview')}
            </button>
          )}

          {/* Top meta row */}
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:mb-5" data-testid="policy-view-meta">
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1 gba:rounded-full gba:bg-white/15 gba:backdrop-blur-sm gba:text-white gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider">
              <Shield className="gba:h-3.5 gba:w-3.5" />
              {t('policy_badge')}
            </div>
            {isDraft && (
              <Badge
                variant="outline"
                className="gba:border-amber-300/50 gba:text-amber-200 gba:bg-amber-500/15 gba:backdrop-blur-sm"
              >
                Draft
              </Badge>
            )}
            {!isDraft && (
              <Badge
                variant="outline"
                className="gba:border-green-300/50 gba:text-green-200 gba:bg-green-500/15 gba:backdrop-blur-sm"
              >
                <CheckCircle2 className="gba:h-3 gba:w-3 gba:mr-1" />
                Active
              </Badge>
            )}
            <Badge
              variant="outline"
              className="gba:border-white/30 gba:text-white/80 gba:bg-white/10 gba:backdrop-blur-sm"
              data-testid="policy-view-version"
            >
              <GitBranch className="gba:h-3 gba:w-3 gba:mr-1" />
              {entryVersion !== undefined && entryVersion !== null ? `v${String(entryVersion)}` : 'v1'}
            </Badge>
          </div>

          {/* Title */}
          <h1
            className="gba:font-funnel-display gba:text-3xl gba:md:text-5xl gba:leading-tight gba:font-bold gba:text-white gba:tracking-tight gba:max-w-[900px] gba:drop-shadow-md"
            data-testid="policy-view-title"
          >
            {displayTitle}
          </h1>

          {/* Subtitle row */}
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1 gba:mt-4 gba:text-sm gba:text-white/70">
            {ownerName && (
              <span className="gba:flex gba:items-center gba:gap-1.5">
                {ownerPictureUrl ? (
                  <img
                    src={ownerPictureUrl}
                    alt={ownerName}
                    className="gba:h-6 gba:w-6 gba:rounded-full gba:object-cover gba:border gba:border-white/30"
                  />
                ) : (
                  <span className="gba:h-6 gba:w-6 gba:rounded-full gba:bg-white/20 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-semibold gba:uppercase gba:text-white">
                    {ownerName.charAt(0)}
                  </span>
                )}
                {ownerName}
              </span>
            )}
            {effectiveLabel && (
              <span className="gba:flex gba:items-center gba:gap-1">
                <Clock className="gba:h-3.5 gba:w-3.5" />
                {effectiveLabel}
              </span>
            )}
            {item.updatedAt && (
              <span className="gba:flex gba:items-center gba:gap-1">
                <FileText className="gba:h-3.5 gba:w-3.5" />
                {t('policy_last_updated')}: {new Date(item.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========== FULL-WIDTH METRICS BAR ========== */}
      <div className="gba:border-b gba:border-border gba:bg-muted/30" data-testid="policy-metrics-bar">
        <div className="gba:max-w-[1400px] gba:mx-auto gba:px-6 gba:py-4">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-6 gba:md:gap-10">
            {/* Executions */}
            <button
              type="button"
              onClick={handleGoToExecution}
              className="gba:flex gba:items-center gba:gap-2 gba:group gba:cursor-pointer gba:transition-colors"
              data-testid="policy-metric-executions"
            >
              <TrendingUp className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors" />
              <div className="gba:flex gba:items-baseline gba:gap-1.5">
                <span className="gba:text-xl gba:font-semibold gba:tabular-nums">
                  {isLoadingSignals ? '–' : signals.executions}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors">
                  {signals.executions === 1 ? t('policy_metric_execution') : t('policy_metric_executions')}
                </span>
              </div>
            </button>

            {/* Versions */}
            <div className="gba:flex gba:items-center gba:gap-2" data-testid="policy-metric-versions">
              <GitBranch className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <div className="gba:flex gba:items-baseline gba:gap-1.5">
                <span className="gba:text-xl gba:font-semibold gba:tabular-nums">
                  {entryVersion !== undefined && entryVersion !== null ? String(entryVersion) : '1'}
                </span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {(entryVersion !== undefined && entryVersion !== null ? Number(entryVersion) : 1) === 1
                    ? t('policy_metric_version')
                    : t('policy_metric_versions')}
                </span>
              </div>
            </div>

            {/* Days active – only shown when policy is active (not draft) */}
            {activeDays !== null && !isDraft && (
              <div className="gba:flex gba:items-center gba:gap-2" data-testid="policy-metric-active-since">
                <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <div className="gba:flex gba:items-baseline gba:gap-1.5">
                  <span className="gba:text-xl gba:font-semibold gba:tabular-nums">{activeDays}</span>
                  <span className="gba:text-sm gba:text-muted-foreground">
                    {activeDays === 1 ? t('policy_metric_day_active') : t('policy_metric_days_active')}
                  </span>
                </div>
              </div>
            )}

            {/* Approval pending – only shown when approvals are outstanding */}
            {!isLoadingSignals && signals.latestApprovalStatus === 'pending' && (
              <div className="gba:flex gba:items-center gba:gap-2" data-testid="policy-metric-approval-status">
                <Clock className="gba:h-4 gba:w-4 gba:text-info" />
                <div className="gba:flex gba:items-baseline gba:gap-1.5">
                  {signals.approvalTaskCount > 0 && (
                    <span className="gba:text-xl gba:font-semibold gba:tabular-nums gba:text-info">
                      {signals.approvalTaskCount - signals.approvalCompletedCount}
                    </span>
                  )}
                  <span className="gba:text-sm gba:text-info">{t('policy_approval_status_pending')}</span>
                </div>
              </div>
            )}

            {/* Linked flow templates */}
            {!isLoadingSignals && signals.flows > 0 && (
              <button
                type="button"
                onClick={handleGoToExecution}
                className="gba:flex gba:items-center gba:gap-2 gba:group gba:cursor-pointer gba:transition-colors"
                data-testid="policy-metric-linked-flows"
              >
                <Workflow className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors" />
                <div className="gba:flex gba:items-baseline gba:gap-1.5">
                  <span className="gba:text-xl gba:font-semibold gba:tabular-nums">{signals.flows}</span>
                  <span className="gba:text-sm gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors">
                    {signals.flows === 1 ? t('policy_metric_linked_flow') : t('policy_metric_linked_flows')}
                  </span>
                </div>
              </button>
            )}

            {/* Linked task experts */}
            {!isLoadingSignals && signals.experts > 0 && (
              <button
                type="button"
                onClick={handleGoToExecution}
                className="gba:flex gba:items-center gba:gap-2 gba:group gba:cursor-pointer gba:transition-colors"
                data-testid="policy-metric-linked-experts"
              >
                <Bot className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors" />
                <div className="gba:flex gba:items-baseline gba:gap-1.5">
                  <span className="gba:text-xl gba:font-semibold gba:tabular-nums">{signals.experts}</span>
                  <span className="gba:text-sm gba:text-muted-foreground gba:group-hover:text-foreground gba:transition-colors">
                    {signals.experts === 1 ? t('policy_metric_linked_expert') : t('policy_metric_linked_experts')}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========== MAIN LAYOUT: Content + Sidebar ========== */}
      <div className="gba:max-w-[1400px] gba:mx-auto gba:px-6 gba:py-8">
        <div className="gba:flex gba:flex-col gba:lg:flex-row gba:gap-8">
          {/* ---- LEFT: Main content area ---- */}
          <div className="gba:flex-1 gba:min-w-0" data-testid="policy-view-main">
            <TabSwitch
              value={activeTab}
              onValueChange={v => setActiveTab(v as PolicyControlTab)}
              data-testid="policy-view-tabs"
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <TabSwitchList>
                  <TabSwitchTrigger value="policy" data-testid="policy-tab-policy">
                    {t('policy_tab_policy')}
                  </TabSwitchTrigger>
                  <TabSwitchTrigger value="execution" data-testid="policy-tab-execution">
                    {t('policy_tab_execution')}
                  </TabSwitchTrigger>
                </TabSwitchList>

                {onLanguageSelect && activeTab === 'policy' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = targetLanguage ? '' : detectedLanguage?.code === 'En' ? 'De' : 'En'
                      if (target) onLanguageSelect(`Language:v1:${target}`)
                    }}
                    disabled={isDetecting || isTranslating}
                    data-testid="policy-view-translate-button"
                    type="button"
                  >
                    <Languages className="gba:h-4 gba:w-4 gba:mr-1.5" />
                    {isTranslating
                      ? t('policy_translating')
                      : targetLanguage
                        ? t('policy_show_original')
                        : t('policy_translate')}
                  </Button>
                )}
              </div>

              {/* ---- Policy content ---- */}
              <TabSwitchContent value="policy" data-testid="policy-panel-policy">
                <ContentHtmlRenderer content={displayContent || ''} variant="default" className="gba:mb-10" />
              </TabSwitchContent>

              {/* ---- Execution: KPIs, workflows, experts, flow templates ---- */}
              <TabSwitchContent value="execution" data-testid="policy-panel-execution">
                <div className="gba:py-6 gba:space-y-8" data-testid="policy-execution-panel">
                  {/* KPI cards */}
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4" data-testid="policy-execution-kpis">
                    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
                      <div className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                        {t('policy_kpi_expert_executions')}
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:tabular-nums gba:mt-1">
                        {isLoadingSignals ? '–' : signals.executions}
                      </div>
                    </div>
                    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4">
                      <div className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                        {t('policy_kpi_flow_executions')}
                      </div>
                      <div className="gba:text-2xl gba:font-semibold gba:tabular-nums gba:mt-1">
                        {isLoadingSignals ? '–' : signals.acknowledgementCampaigns + signals.approvalCampaigns}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Approval & acknowledgement workflows */}
                  <div className="gba:space-y-3">
                    <h3 className="gba:text-sm gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                      {t('policy_execution_workflows_section')}
                    </h3>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('policy_execution_workflows_desc')}</p>
                    <PolicyWorkflowsPanel
                      accessToken={accessToken}
                      userId={userId}
                      policyRootId={String(policyRootId || item.id)}
                      onSendApproval={handleOpenApproval}
                      onSendAcknowledgement={handleOpenAcknowledgement}
                      isDraft={isDraft}
                    />
                  </div>

                  <Separator />

                  {/* Linked task experts */}
                  <div className="gba:space-y-3">
                    <h3 className="gba:text-sm gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                      {t('policy_execution_experts_section')}
                    </h3>
                    <PolicyExpertsPanel
                      accessToken={accessToken}
                      policyRootId={String(policyRootId || item.id)}
                      policyVersionId={String(item.id)}
                      policyTitle={displayTitle}
                    />
                  </div>

                  <Separator />

                  {/* Flow templates created from this policy */}
                  <div className="gba:space-y-3">
                    <h3 className="gba:text-sm gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                      {t('policy_execution_flows_section')}
                    </h3>
                    <PolicyFlowsPanel
                      accessToken={accessToken}
                      policyRootId={String(policyRootId || item.id)}
                      policyVersionId={String(item.id)}
                      policyTitle={displayTitle}
                      policyContent={displayContent}
                    />
                  </div>
                </div>
              </TabSwitchContent>
            </TabSwitch>
          </div>

          {/* ---- RIGHT: Sidebar ---- */}
          <aside
            className="gba:w-full gba:lg:w-[320px] gba:shrink-0 gba:lg:sticky gba:lg:top-4 gba:lg:self-start gba:space-y-5"
            data-testid="policy-view-sidebar"
          >
            {/* Actions */}
            <div className="gba:space-y-2" data-testid="policy-sidebar-actions">
              {/* Send for acknowledgement – only enabled when policy is active */}
              <SidebarAction
                icon={<Send className="gba:h-4 gba:w-4" />}
                label={t('policy_action_send_ack')}
                description={t('policy_sidebar_action_ack_desc')}
                variant="default"
                style={{ backgroundColor: HERO_BLUE }}
                onClick={handleOpenAcknowledgement}
                testId="policy-action-send-ack"
                disabled={policyLifecycleState !== 'active'}
                disabledHint={
                  policyLifecycleState !== 'active' ? t('policy_sidebar_approval_required_hint') : undefined
                }
              />

              {/* Approval / Activate – only in draft states */}
              {policyLifecycleState === 'approved-ready-to-activate' && (
                <SidebarAction
                  icon={<CheckCircle2 className="gba:h-4 gba:w-4" />}
                  label={t('policy_action_activate')}
                  description={t('policy_sidebar_action_activate_desc')}
                  variant="default"
                  style={{ backgroundColor: HERO_BLUE }}
                  onClick={handleActivatePolicy}
                  testId="policy-action-activate"
                />
              )}
              {(policyLifecycleState === 'draft' ||
                policyLifecycleState === 'pending-approval' ||
                policyLifecycleState === 'rework-needed') && (
                <SidebarAction
                  icon={<ClipboardCheck className="gba:h-4 gba:w-4" />}
                  label={t('policy_action_send_approval')}
                  description={
                    policyLifecycleState === 'rework-needed'
                      ? t('policy_sidebar_rework_needed_hint')
                      : t('policy_sidebar_action_approval_desc')
                  }
                  onClick={handleOpenApproval}
                  testId="policy-action-send-approval"
                  disabled={policyLifecycleState === 'pending-approval'}
                  disabledHint={
                    policyLifecycleState === 'pending-approval' ? t('policy_sidebar_approval_pending_hint') : undefined
                  }
                />
              )}

              <SidebarAction
                icon={<Bot className="gba:h-4 gba:w-4" />}
                label={t('policy_action_create_expert')}
                description={t('policy_sidebar_action_expert_desc')}
                onClick={handleCreateExpertFromPolicy}
                testId="policy-action-create-expert"
              />
              <SidebarAction
                icon={<Workflow className="gba:h-4 gba:w-4" />}
                label={t('policy_action_generate_flow')}
                description={t('policy_sidebar_action_flow_desc')}
                onClick={handleGenerateFlowFromPolicy}
                testId="policy-action-generate-flow"
              />
              <SidebarAction
                icon={<Sparkles className="gba:h-4 gba:w-4" />}
                label={t('policy_action_ask_everyai')}
                description={t('policy_sidebar_action_everyai_desc')}
                onClick={handleAskEveryAI}
                testId="policy-action-ask-everyai"
              />
            </div>

            <Separator />

            {/* Version info – below actions */}
            <Card className="gba:!bg-background" data-testid="policy-sidebar-version">
              <CardContent className="gba:p-4 gba:space-y-3">
                <div className="gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground gba:mb-1">
                  {t('policy_sidebar_version_title')}
                </div>

                <div className="gba:flex gba:items-center gba:justify-between">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted">
                      <GitBranch className="gba:h-4 gba:w-4" />
                    </div>
                    <div>
                      <div className="gba:text-lg gba:font-semibold gba:leading-tight">
                        {entryVersion !== undefined && entryVersion !== null ? `v${String(entryVersion)}` : 'v1'}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {isDraft ? t('policy_version_status_draft') : t('policy_version_status_active')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyVersionId}
                    title={t('policy_version_copy_id')}
                    data-testid="policy-version-copy-id"
                    type="button"
                  >
                    <Copy className="gba:h-3.5 gba:w-3.5" />
                  </Button>
                </div>

                <Separator />

                <div className="gba:space-y-1.5 gba:text-sm">
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('policy_sidebar_meta_updated')}</span>
                    <span className="gba:font-medium">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="gba:flex gba:justify-between">
                    <span className="gba:text-muted-foreground">{t('policy_sidebar_meta_created')}</span>
                    <span className="gba:font-medium">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {ownerName && (
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span className="gba:text-muted-foreground">{t('policy_sidebar_meta_owner')}</span>
                      <span className="gba:font-medium gba:text-right gba:truncate gba:max-w-[140px] gba:flex gba:items-center gba:gap-1.5">
                        {ownerPictureUrl ? (
                          <img
                            src={ownerPictureUrl}
                            alt={ownerName}
                            className="gba:h-5 gba:w-5 gba:rounded-full gba:object-cover gba:shrink-0"
                          />
                        ) : null}
                        {ownerName}
                      </span>
                    </div>
                  )}
                  {effectiveLabel && (
                    <div className="gba:flex gba:justify-between">
                      <span className="gba:text-muted-foreground">{t('policy_sidebar_meta_effective')}</span>
                      <span className="gba:font-medium gba:text-right gba:truncate gba:max-w-[140px]">
                        {effectiveLabel}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="gba:w-full gba:mt-1"
                  onClick={handleCreateNewVersion}
                  data-testid="policy-action-create-new-version"
                  type="button"
                >
                  <History className="gba:h-4 gba:w-4 gba:mr-2" />
                  {t('policy_action_create_new_version')}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <PolicyAcknowledgementDialog
        open={ackDialogOpen}
        onOpenChange={setAckDialogOpen}
        policy={item}
        accessToken={accessToken}
        initiatorUserId={userId}
        onSent={() => reloadSignals().catch(() => undefined)}
      />

      <PolicyApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        policy={item}
        accessToken={accessToken}
        initiatorUserId={userId}
        onSent={() => reloadSignals().catch(() => undefined)}
      />

      <CreateExpertDialog
        open={createExpertDialogOpen}
        onOpenChange={setCreateExpertDialogOpen}
        accessToken={accessToken}
        policyRootId={String(policyRootId)}
        policyVersionId={String(policyVersionId)}
        policyTitle={displayTitle}
      />

      <GenerateFlowDialog
        open={generateFlowDialogOpen}
        onOpenChange={setGenerateFlowDialogOpen}
        accessToken={accessToken}
        policyRootId={String(policyRootId)}
        policyVersionId={String(policyVersionId)}
        policyTitle={displayTitle}
        policyContent={displayContent}
        onGenerated={() => reloadSignals().catch(() => undefined)}
      />
    </div>
  )
}

export default PolicyView
