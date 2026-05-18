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
  PartyPopper
} from 'lucide-react'
import { Card, CardContent, Button, Badge, cn, useTranslation } from '@newwork/nw-design-system'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { ComponentSpec, ComponentType } from '../../types'
import translations from '../../../../_i18n'

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
  /** The user's original prompt */
  prompt?: string
  /** Global error message (if build failed) */
  errorMessage?: string
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
    route: (id: string) => `/platform/create/screen-builder?screenId=${id}`
  },
  agent: {
    icon: Bot,
    label: 'Agent',
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
    route: (id: string) => buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { flowId: id })
  },
  data_model: {
    icon: Database,
    label: 'Data Model',
    color: 'gba:text-rose-600',
    route: (id: string) => buildPlatformUrl(Navigation.CREATE_CUSTOM_DATA_MANAGER, { modelId: id })
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
  showError?: boolean
}> = ({ component, showError = false }) => {
  const { t } = useTranslation(translations)
  const [errorExpanded, setErrorExpanded] = useState(false)
  const baseTypeMeta = COMPONENT_TYPE_META[component.type] || DEFAULT_COMPONENT_TYPE_META
  const typeMeta = component.type === 'agent' ? { ...baseTypeMeta, label: t('type-label-agent') } : baseTypeMeta
  const statusMeta = STATUS_META[component.status] || STATUS_META.completed
  const TypeIcon = typeMeta.icon
  const StatusIcon = statusMeta.icon

  const isClickable = component.status === 'completed' || component.status === 'reused'
  const hasError = component.status === 'error' && component.errorMessage

  const borderClassByStatus: Record<string, string> = {
    error: 'gba:border-destructive/40',
    completed: 'hover:gba:border-emerald-400/60',
    reused: 'hover:gba:border-blue-400/60'
  }
  const borderClass = borderClassByStatus[component.status] ?? ''

  return (
    <Card
      className={cn(
        'gba:group gba:transition-all gba:duration-200 gba:border gba:bg-card/70',
        isClickable && 'gba:cursor-pointer hover:gba:shadow-sm',
        borderClass
      )}
      onClick={isClickable ? () => handleOpenComponent(component) : undefined}
    >
      <CardContent className="gba:px-2.5 gba:py-2">
        <div className="gba:flex gba:items-start gba:gap-2">
          {/* Type icon */}
          <div
            className={cn(
              'gba:p-1.5 gba:rounded-md gba:shrink-0',
              component.status === 'error'
                ? 'gba:bg-destructive/10'
                : component.status === 'reused'
                  ? 'gba:bg-blue-50 dark:gba:bg-blue-900/20'
                  : 'gba:bg-muted'
            )}
          >
            <TypeIcon
              className={cn(
                'gba:w-3.5 gba:h-3.5',
                component.status === 'error' ? 'gba:text-destructive' : typeMeta.color
              )}
            />
          </div>

          {/* Content */}
          <div className="gba:flex-1 gba:min-w-0">
            {/* Header row */}
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-0.5 gba:flex-wrap">
              <h4 className="gba:font-medium gba:text-sm gba:text-foreground gba:truncate">{component.name}</h4>
              <Badge variant="secondary" className="gba:text-[10px] gba:px-1 gba:py-0 gba:shrink-0">
                {typeMeta.label}
              </Badge>
              <Badge
                variant="secondary"
                className={cn('gba:text-[10px] gba:px-1 gba:py-0 gba:shrink-0', statusMeta.badgeClass)}
              >
                <StatusIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                {statusMeta.label}
              </Badge>
            </div>

            {/* Description */}
            <p className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-1 gba:mb-0.5">
              {component.userFriendlyDescription || component.description}
            </p>

            {/* Metadata row */}
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
              {/* Resource URL for screens */}
              {component.resourceUrl && (
                <div className="gba:flex gba:items-center gba:gap-1.5">
                  <ExternalLink className="gba:w-3 gba:h-3 gba:text-emerald-600" />
                  <code className="gba:text-[10px] gba:text-emerald-600 gba:font-mono gba:max-w-[220px] gba:truncate">
                    {component.resourceUrl}
                  </code>
                </div>
              )}

              {/* Azure CDN */}
              {component.azureUrl && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground">
                  <span>CDN:</span>
                  <a
                    href={component.azureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-blue-500 hover:gba:underline gba:font-mono gba:max-w-[150px] gba:truncate"
                    onClick={e => e.stopPropagation()}
                  >
                    {component.azureUrl.length > 28 ? `${component.azureUrl.slice(0, 28)}...` : component.azureUrl}
                  </a>
                </div>
              )}

              {/* Published file count */}
              {component.publishedFileCount != null && component.publishedFileCount > 0 && (
                <div className="gba:text-[10px] gba:text-muted-foreground">
                  Published {component.publishedFileCount} file{component.publishedFileCount === 1 ? '' : 's'}
                </div>
              )}

              {/* Component ID */}
              {(component.createdId || component.existingId) && (
                <code className="gba:text-[10px] gba:text-muted-foreground/70 gba:font-mono">
                  ID: {(component.createdId || component.existingId)?.slice(0, 20)}
                  {(component.createdId || component.existingId || '').length > 20 ? '...' : ''}
                </code>
              )}
            </div>

            {/* Error details (collapsible) */}
            {hasError && showError && (
              <div className="gba:mt-1">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setErrorExpanded(!errorExpanded)
                  }}
                  className="gba:flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-destructive hover:gba:underline"
                >
                  {errorExpanded ? (
                    <ChevronUp className="gba:w-3 gba:h-3" />
                  ) : (
                    <ChevronDown className="gba:w-3 gba:h-3" />
                  )}
                  {errorExpanded ? 'Hide error details' : 'Show error details'}
                </button>
                {errorExpanded && (
                  <div className="gba:mt-1 gba:p-1.5 gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:rounded-md">
                    <p className="gba:text-[10px] gba:text-muted-foreground gba:font-mono gba:break-all gba:whitespace-pre-wrap">
                      {component.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2 gba:shrink-0">
            {isClickable && (
              <Button
                size="sm"
                variant="ghost"
                className="gba:opacity-70 group-hover:gba:opacity-100 gba:transition-opacity gba:h-6 gba:w-6 gba:p-0"
                onClick={e => {
                  e.stopPropagation()
                  handleOpenComponent(component)
                }}
              >
                {component.status === 'reused' ? (
                  <Eye className="gba:w-3.5 gba:h-3.5" />
                ) : (
                  <ExternalLink className="gba:w-3.5 gba:h-3.5" />
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
  showErrors?: boolean
  defaultOpen?: boolean
}> = ({ title, icon: Icon, iconClass, components, showErrors = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  if (components.length === 0) return null

  return (
    <div className="gba:relative gba:pl-4">
      <div className="gba:absolute gba:left-[7px] gba:top-8 gba:bottom-0 gba:w-px gba:bg-border/70" />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="gba:flex gba:items-center gba:gap-2 gba:mb-2 gba:w-full gba:text-left"
      >
        <span className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
          <Icon className={cn('gba:w-3 gba:h-3', iconClass)} />
        </span>
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
          {title} ({components.length})
        </h3>
        {open ? (
          <ChevronUp className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:ml-auto" />
        ) : (
          <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:ml-auto" />
        )}
      </button>
      {open && (
        <div className="gba:space-y-1.5">
          {components.map(c => (
            <ComponentCard key={c.id} component={c} showError={showErrors} />
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
  buildDuration,
  prompt,
  errorMessage,
  onReset,
  onRetry,
  onModifyPlan,
  className
}) => {
  const { completed, failed, reused, skipped } = groupComponents(components)

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
    <div className={cn('gba:space-y-4 gba:animate-in gba:fade-in gba:duration-500', className)}>
      {/* ── Summary Card ────────────────────────────────────────────────── */}
      <Card className={cn('gba:overflow-hidden', success ? 'gba:border-emerald-300/60' : 'gba:border-destructive/40')}>
        <CardContent className="gba:p-0">
          <div className="gba:p-4">
            {/* Header */}
            <div className="gba:flex gba:items-start gba:gap-3 gba:mb-3">
              <div
                className={cn(
                  'gba:p-2.5 gba:rounded-xl',
                  success ? 'gba:bg-emerald-100 dark:gba:bg-emerald-900/30' : 'gba:bg-red-100 dark:gba:bg-red-900/30'
                )}
              >
                {success ? (
                  <PartyPopper className="gba:w-5 gba:h-5 gba:text-emerald-600 dark:gba:text-emerald-400" />
                ) : (
                  <AlertTriangle className="gba:w-5 gba:h-5 gba:text-destructive" />
                )}
              </div>
              <div className="gba:flex-1">
                <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-0.5">
                  {(() => {
                    if (success) return 'Build Completed Successfully'
                    if (failed.length > 0 && completed.length > 0) return 'Build Partially Completed'
                    return 'Build Failed'
                  })()}
                </h2>
                {prompt && (
                  <p className="gba:text-xs gba:text-foreground/80 gba:italic gba:mb-1 gba:line-clamp-1">
                    &ldquo;{prompt}&rdquo;
                  </p>
                )}
                <p className="gba:text-xs gba:text-muted-foreground">
                  {success
                    ? (() => {
                        const suffix = components.length === 1 ? ' was' : 's were'
                        return `All ${components.length} component${suffix} processed in ${formatDuration(buildDuration)}.`
                      })()
                    : errorMessage ||
                      (() => {
                        const suffix = failed.length === 1 ? '' : 's'
                        return `${failed.length} component${suffix} failed during the build.`
                      })()}
                </p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="gba:flex gba:items-center gba:gap-5 gba:flex-wrap gba:pt-3 gba:border-t gba:border-border">
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
        showErrors
        defaultOpen
      />

      {/* ── Completed Components ─────────────────────────────────────── */}
      <ComponentSection
        title="Created Components"
        icon={CheckCircle2}
        iconClass="gba:text-emerald-500"
        components={completed}
        defaultOpen
      />

      {/* ── Reused Components ────────────────────────────────────────── */}
      <ComponentSection
        title="Reused Components"
        icon={Recycle}
        iconClass="gba:text-blue-500"
        components={reused}
        defaultOpen={failed.length === 0}
      />

      {/* ── Skipped Components ───────────────────────────────────────── */}
      <ComponentSection
        title="Skipped Components"
        icon={SkipForward}
        iconClass="gba:text-gray-400"
        components={skipped}
        defaultOpen={false}
      />

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:pt-1 gba:pb-2 gba:flex-wrap">
        {success
          ? null
          : onRetry && (
              <Button size="sm" onClick={onRetry} className="gba:min-w-[140px]">
                <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
                Retry Build
              </Button>
            )}
        {success
          ? null
          : onModifyPlan && (
              <Button variant="outline" size="sm" onClick={onModifyPlan}>
                <Edit className="gba:w-4 gba:h-4 gba:mr-2" />
                Modify Plan
              </Button>
            )}
        <Button variant={success ? 'default' : 'outline'} size="sm" onClick={onReset} className="gba:min-w-[170px]">
          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
          Build Something {success ? 'Else' : 'New'}
        </Button>
      </div>
    </div>
  )
}

export default BuildResultsView
