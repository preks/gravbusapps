/**
 * BuildResultsView - Unified build results display for success and error states
 *
 * Shows a clear summary of what happened during the build:
 * - Overall status with stats
 * - Failed components with error details
 * - Completed components with navigation
 * - Reused components
 * - Skipped components
 */

import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Recycle,
  SkipForward,
  Clock,
  ExternalLink,
  Plus,
  RotateCcw,
  Edit,
  ChevronDown,
  ChevronUp,
  Monitor,
  Bot,
  Code2,
  Workflow,
  Database,
  Eye,
  PartyPopper,
  Play
} from 'lucide-react'
import { Card, CardContent, Button, Badge, cn } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ScreenPreviewModal } from '../preview'
import type { ComponentSpec, ComponentType } from '../../types'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BuildResultsViewProps {
  /** Whether the overall build succeeded */
  success: boolean
  /** All components from the build plan */
  components: ComponentSpec[]
  /** Job ID for the build (used for fetching generated files) */
  jobId?: string
  /** Build duration in milliseconds */
  buildDuration: number
  /** Global error message (if build failed) */
  errorMessage?: string
  /** Access token for authenticated requests */
  accessToken?: string
  /** User info for component loading */
  userInfo?: any
  /** Callbacks */
  onReset: () => void
  onRetry?: () => void
  onModifyPlan?: () => void
  className?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const COMPONENT_TYPE_META: Record<
  ComponentType,
  { icon: React.ElementType; label: string; color: string; route: (id: string) => string }
> = {
  screen: {
    icon: Monitor,
    label: 'Screen',
    color: 'gba:text-violet-600',
    route: (id: string) => `/platform/ai-builder?screenId=${id}`
  },
  agent: {
    icon: Bot,
    label: 'Task Expert',
    color: 'gba:text-amber-600',
    route: (id: string) => `/platform/create/prompt-manager?expertId=${id}`
  },
  function: {
    icon: Code2,
    label: 'Function',
    color: 'gba:text-blue-600',
    route: (id: string) => `/platform/create/function-manager?functionId=${id}`
  },
  flow: {
    icon: Workflow,
    label: 'Flow',
    color: 'gba:text-emerald-600',
    route: (id: string) => `/platform/apps/flow/apps/creator?templateId=${id}`
  },
  data_model: {
    icon: Database,
    label: 'Data Model',
    color: 'gba:text-rose-600',
    route: (id: string) => `/platform/create/data-models?modelId=${id}`
  }
}

const DEFAULT_COMPONENT_TYPE_META = {
  icon: Monitor,
  label: 'Component',
  color: 'gba:text-muted-foreground',
  route: (id: string) => `/platform?id=${id}`
}

const STATUS_META: Record<string, { icon: React.ElementType; label: string; badgeClass: string }> = {
  completed: {
    icon: CheckCircle2,
    label: 'Created',
    badgeClass: 'gba:bg-emerald-100 gba:text-emerald-700 dark:gba:bg-emerald-900/30 dark:gba:text-emerald-400'
  },
  error: {
    icon: XCircle,
    label: 'Failed',
    badgeClass: 'gba:bg-red-100 gba:text-red-700 dark:gba:bg-red-900/30 dark:gba:text-red-400'
  },
  reused: {
    icon: Recycle,
    label: 'Reused',
    badgeClass: 'gba:bg-blue-100 gba:text-blue-700 dark:gba:bg-blue-900/30 dark:gba:text-blue-400'
  },
  skipped: {
    icon: SkipForward,
    label: 'Skipped',
    badgeClass: 'gba:bg-gray-100 gba:text-gray-600 dark:gba:bg-gray-800 dark:gba:text-gray-400'
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function groupComponents(components: ComponentSpec[]) {
  const completed = components.filter(c => c.status === 'completed')
  const failed = components.filter(c => c.status === 'error')
  const reused = components.filter(c => c.status === 'reused')
  const skipped = components.filter(c => c.status === 'skipped')
  const other = components.filter(c => !['completed', 'error', 'reused', 'skipped'].includes(c.status))
  return { completed, failed, reused, skipped, other }
}

function handleOpenComponent(component: ComponentSpec) {
  if (component.type === 'screen' && component.resourceUrl) {
    navigateTo(buildPlatformUrl(component.resourceUrl))
    return
  }
  const id = component.createdId || component.existingId
  if (!id) return

  const typeMeta = COMPONENT_TYPE_META[component.type] || DEFAULT_COMPONENT_TYPE_META
  const route = typeMeta.route(id)
  navigateTo(buildPlatformUrl(route))
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** Stat pill used in the summary bar */
const StatPill: React.FC<{
  icon: React.ElementType
  value: number | string
  label: string
  colorClass?: string
}> = ({ icon: Icon, value, label, colorClass = 'gba:text-muted-foreground' }) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Icon className={cn('gba:w-4 gba:h-4', colorClass)} />
    <div>
      <div className="gba:text-sm gba:font-semibold gba:text-foreground">{value}</div>
      <div className="gba:text-xs gba:text-muted-foreground">{label}</div>
    </div>
  </div>
)

/** A single component result card */
const ComponentCard: React.FC<{
  component: ComponentSpec
  jobId?: string
  showError?: boolean
  onPreview?: (component: ComponentSpec) => void
  hasAccessToken?: boolean
}> = ({ component, jobId, showError = false, onPreview, hasAccessToken = false }) => {
  const [errorExpanded, setErrorExpanded] = useState(false)
  const typeMeta = COMPONENT_TYPE_META[component.type] || DEFAULT_COMPONENT_TYPE_META
  const statusMeta = STATUS_META[component.status] || STATUS_META.completed
  const TypeIcon = typeMeta.icon
  const StatusIcon = statusMeta.icon

  const isClickable = component.status === 'completed' || component.status === 'reused'
  const hasError = component.status === 'error' && component.errorMessage

  // Check if preview is available
  // Preview available if:
  // 1. It's a screen component (completed successfully OR failed but may have partial code)
  // 2. AND either: has azureUrl (live preview) OR has identifiers for code viewer (jobId, createdId, or metadata)
  // 3. AND accessToken is available (required for ScreenPreviewModal)
  const hasPreviewData = !!(
    component.azureUrl ||
    component.createdId ||
    jobId ||
    (component.metadata?.sessionId && component.metadata?.repoId)
  )

  const typeCheck = component.type === 'screen'
  const statusCheckVar = component.status === 'completed' || component.status === 'error'
  const onPreviewCheck = !!onPreview
  const canPreview = typeCheck && statusCheckVar && hasPreviewData && onPreviewCheck && hasAccessToken

  const borderClass =
    component.status === 'error'
      ? 'gba:border-destructive/40'
      : component.status === 'completed'
        ? 'hover:gba:border-emerald-400/60'
        : component.status === 'reused'
          ? 'hover:gba:border-blue-400/60'
          : ''

  return (
    <Card
      className={cn(
        'gba:group gba:transition-all gba:duration-200',
        isClickable && 'gba:cursor-pointer hover:gba:shadow-md',
        borderClass
      )}
      onClick={isClickable ? () => handleOpenComponent(component) : undefined}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:gap-3">
          {/* Type icon */}
          <div
            className={cn(
              'gba:p-2.5 gba:rounded-xl gba:shrink-0',
              component.status === 'error'
                ? 'gba:bg-destructive/10'
                : component.status === 'reused'
                  ? 'gba:bg-blue-50 dark:gba:bg-blue-900/20'
                  : 'gba:bg-muted'
            )}
          >
            <TypeIcon
              className={cn('gba:w-5 gba:h-5', component.status === 'error' ? 'gba:text-destructive' : typeMeta.color)}
            />
          </div>

          {/* Content */}
          <div className="gba:flex-1 gba:min-w-0">
            {/* Header row */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:flex-wrap">
              <h4 className="gba:font-medium gba:text-foreground gba:truncate">{component.name}</h4>
              <Badge variant="secondary" className="gba:text-[11px] gba:px-1.5 gba:py-0 gba:shrink-0">
                {typeMeta.label}
              </Badge>
              <Badge
                variant="secondary"
                className={cn('gba:text-[11px] gba:px-1.5 gba:py-0 gba:shrink-0', statusMeta.badgeClass)}
              >
                <StatusIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                {statusMeta.label}
              </Badge>
            </div>

            {/* Description */}
            <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">
              {component.userFriendlyDescription || component.description}
            </p>

            {/* Metadata row */}
            <div className="gba:space-y-1">
              {/* Resource URL for screens */}
              {component.resourceUrl && (
                <div className="gba:flex gba:items-center gba:gap-1.5">
                  <ExternalLink className="gba:w-3 gba:h-3 gba:text-emerald-600" />
                  <code className="gba:text-xs gba:text-emerald-600 gba:font-mono">{component.resourceUrl}</code>
                </div>
              )}

              {/* Azure CDN */}
              {component.azureUrl && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
                  <span>CDN:</span>
                  <a
                    href={component.azureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-blue-500 hover:gba:underline gba:font-mono gba:truncate"
                    onClick={e => e.stopPropagation()}
                  >
                    {component.azureUrl.length > 50 ? `${component.azureUrl.slice(0, 50)}...` : component.azureUrl}
                  </a>
                </div>
              )}

              {/* Published file count */}
              {component.publishedFileCount != null && component.publishedFileCount > 0 && (
                <div className="gba:text-xs gba:text-muted-foreground">
                  Published {component.publishedFileCount} file{component.publishedFileCount !== 1 ? 's' : ''}
                </div>
              )}

              {/* Component ID */}
              {(component.createdId || component.existingId) && (
                <code className="gba:text-[11px] gba:text-muted-foreground/70 gba:font-mono">
                  ID: {(component.createdId || component.existingId)?.slice(0, 20)}
                  {(component.createdId || component.existingId || '').length > 20 ? '...' : ''}
                </code>
              )}
            </div>

            {/* Error details (collapsible) */}
            {hasError && showError && (
              <div className="gba:mt-3">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setErrorExpanded(!errorExpanded)
                  }}
                  className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-destructive hover:gba:underline"
                >
                  {errorExpanded ? (
                    <ChevronUp className="gba:w-3 gba:h-3" />
                  ) : (
                    <ChevronDown className="gba:w-3 gba:h-3" />
                  )}
                  {errorExpanded ? 'Hide error details' : 'Show error details'}
                </button>
                {errorExpanded && (
                  <div className="gba:mt-2 gba:p-3 gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:rounded-lg">
                    <p className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:break-all gba:whitespace-pre-wrap">
                      {component.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2 gba:shrink-0">
            {canPreview && (
              <Button
                size="sm"
                variant="ghost"
                className="gba:transition-opacity"
                onClick={e => {
                  e.stopPropagation()
                  onPreview?.(component)
                }}
                title="Preview Screen"
              >
                <Play className="gba:w-4 gba:h-4" />
              </Button>
            )}
            {isClickable && (
              <Button
                size="sm"
                variant="ghost"
                className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                onClick={e => {
                  e.stopPropagation()
                  handleOpenComponent(component)
                }}
              >
                {component.status === 'reused' ? (
                  <Eye className="gba:w-4 gba:h-4" />
                ) : (
                  <ExternalLink className="gba:w-4 gba:h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Section with a header and a grid of component cards */
const ComponentSection: React.FC<{
  title: string
  icon: React.ElementType
  iconClass?: string
  components: ComponentSpec[]
  jobId?: string
  showErrors?: boolean
  defaultOpen?: boolean
  onPreview?: (component: ComponentSpec) => void
  hasAccessToken?: boolean
}> = ({
  title,
  icon: Icon,
  iconClass,
  components,
  jobId,
  showErrors = false,
  defaultOpen = true,
  onPreview,
  hasAccessToken = false
}) => {
  const [open, setOpen] = useState(defaultOpen)
  if (components.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="gba:flex gba:items-center gba:gap-2 gba:mb-3 gba:w-full gba:text-left"
      >
        <Icon className={cn('gba:w-5 gba:h-5', iconClass)} />
        <h3 className="gba:text-base gba:font-semibold gba:text-foreground">
          {title} ({components.length})
        </h3>
        {open ? (
          <ChevronUp className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:ml-auto" />
        ) : (
          <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:ml-auto" />
        )}
      </button>
      {open && (
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
          {components.map(c => (
            <ComponentCard
              key={c.id}
              component={c}
              jobId={jobId}
              showError={showErrors}
              onPreview={onPreview}
              hasAccessToken={hasAccessToken}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export const BuildResultsView: React.FC<BuildResultsViewProps> = ({
  success,
  components,
  jobId,
  buildDuration,
  errorMessage,
  accessToken,
  userInfo,
  onReset,
  onRetry,
  onModifyPlan,
  className
}) => {
  const { completed, failed, reused, skipped } = groupComponents(components)
  const [previewComponent, setPreviewComponent] = useState<ComponentSpec | null>(null)

  // Debug logging (development only)
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[BuildResultsView]', {
      success,
      counts: {
        total: components.length,
        completed: completed.length,
        failed: failed.length,
        reused: reused.length,
        skipped: skipped.length
      },
      componentIds: components.map(c => c.id),
      failedIds: failed.map(c => c.id)
    })
  }

  return (
    <div className={cn('gba:space-y-6 gba:animate-in gba:fade-in gba:duration-500', className)}>
      {/* ── Summary Card ────────────────────────────────────────────────── */}
      <Card className={cn('gba:overflow-hidden', success ? 'gba:border-emerald-300/60' : 'gba:border-destructive/40')}>
        <CardContent className="gba:p-0">
          {/* Top accent bar */}
          <div
            className={cn(
              'gba:h-1',
              success
                ? 'gba:bg-linear-to-r gba:from-emerald-400 gba:to-emerald-600'
                : 'gba:bg-linear-to-r gba:from-red-400 gba:to-orange-500'
            )}
          />

          <div className="gba:p-6">
            {/* Header */}
            <div className="gba:flex gba:items-start gba:gap-4 gba:mb-5">
              <div
                className={cn(
                  'gba:p-3 gba:rounded-2xl',
                  success ? 'gba:bg-emerald-100 dark:gba:bg-emerald-900/30' : 'gba:bg-red-100 dark:gba:bg-red-900/30'
                )}
              >
                {success ? (
                  <PartyPopper className="gba:w-7 gba:h-7 gba:text-emerald-600 dark:gba:text-emerald-400" />
                ) : (
                  <AlertTriangle className="gba:w-7 gba:h-7 gba:text-destructive" />
                )}
              </div>
              <div className="gba:flex-1">
                <h2 className="gba:text-xl gba:font-bold gba:text-foreground gba:mb-1">
                  {success
                    ? 'Build Completed Successfully'
                    : failed.length > 0 && completed.length > 0
                      ? 'Build Partially Completed'
                      : 'Build Failed'}
                </h2>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {success
                    ? `All ${components.length} component${components.length !== 1 ? 's were' : ' was'} processed in ${formatDuration(buildDuration)}.`
                    : errorMessage ||
                      `${failed.length} component${failed.length !== 1 ? 's' : ''} failed during the build.`}
                </p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap gba:pt-4 gba:border-t gba:border-border">
              <StatPill icon={Clock} value={formatDuration(buildDuration)} label="Duration" />
              {completed.length > 0 && (
                <StatPill
                  icon={CheckCircle2}
                  value={completed.length}
                  label="Created"
                  colorClass="gba:text-emerald-500"
                />
              )}
              {failed.length > 0 && (
                <StatPill icon={XCircle} value={failed.length} label="Failed" colorClass="gba:text-destructive" />
              )}
              {reused.length > 0 && (
                <StatPill icon={Recycle} value={reused.length} label="Reused" colorClass="gba:text-blue-500" />
              )}
              {skipped.length > 0 && (
                <StatPill icon={SkipForward} value={skipped.length} label="Skipped" colorClass="gba:text-gray-400" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Failed Components ────────────────────────────────────────── */}
      <ComponentSection
        title="Failed Components"
        icon={XCircle}
        iconClass="gba:text-destructive"
        components={failed}
        jobId={jobId}
        showErrors
        defaultOpen
        onPreview={setPreviewComponent}
        hasAccessToken={!!accessToken}
      />

      {/* ── Completed Components ─────────────────────────────────────── */}
      <ComponentSection
        title="Created Components"
        icon={CheckCircle2}
        iconClass="gba:text-emerald-500"
        components={completed}
        jobId={jobId}
        defaultOpen
        onPreview={setPreviewComponent}
        hasAccessToken={!!accessToken}
      />

      {/* ── Reused Components ────────────────────────────────────────── */}
      <ComponentSection
        title="Reused Components"
        icon={Recycle}
        iconClass="gba:text-blue-500"
        components={reused}
        jobId={jobId}
        defaultOpen={failed.length === 0}
        onPreview={setPreviewComponent}
        hasAccessToken={!!accessToken}
      />

      {/* ── Skipped Components ───────────────────────────────────────── */}
      <ComponentSection
        title="Skipped Components"
        icon={SkipForward}
        iconClass="gba:text-gray-400"
        components={skipped}
        jobId={jobId}
        defaultOpen={false}
        onPreview={setPreviewComponent}
        hasAccessToken={!!accessToken}
      />

      {/* ── Preview Modal ────────────────────────────────────────────── */}
      {accessToken && (
        <ScreenPreviewModal
          component={previewComponent}
          jobId={jobId}
          accessToken={accessToken}
          userInfo={userInfo}
          open={!!previewComponent}
          onClose={() => setPreviewComponent(null)}
        />
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:pt-2 gba:pb-4 gba:flex-wrap">
        {!success && onRetry && (
          <Button size="lg" onClick={onRetry} className="gba:min-w-[160px]">
            <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
            Retry Build
          </Button>
        )}
        {!success && onModifyPlan && (
          <Button variant="outline" size="lg" onClick={onModifyPlan}>
            <Edit className="gba:w-4 gba:h-4 gba:mr-2" />
            Modify Plan
          </Button>
        )}
        <Button variant={success ? 'default' : 'outline'} size="lg" onClick={onReset} className="gba:min-w-[200px]">
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Build Something {success ? 'Else' : 'New'}
        </Button>
      </div>
    </div>
  )
}

export default BuildResultsView
