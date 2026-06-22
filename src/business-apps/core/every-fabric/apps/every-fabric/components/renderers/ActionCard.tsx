import { useCallback, useMemo, useState, type FC } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretRightIcon,
  EnvelopeSimpleIcon,
  FlowArrowIcon,
  GearIcon,
  ListChecksIcon,
  SparkleIcon,
  type Icon
} from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import {
  STATUS_BADGE_CLASS,
  type ActionCardPayload,
  type ActionCardStatus,
  type ActionCardStatusVariant
} from '../../utils/actionCardTrace'
import { useLiveFlowStatus } from '../../hooks/useLiveFlowStatus'
import translations from '../../_i18n'

interface ActionCardProps {
  payload: ActionCardPayload
  callId: string
  accessToken?: string
}

const ICON_BY_NAME: Record<string, Icon> = {
  workflow: FlowArrowIcon,
  email: EnvelopeSimpleIcon,
  task: ListChecksIcon,
  schedule: ListChecksIcon,
  settings: GearIcon
}

const ICON_TINT_BY_VARIANT: Record<ActionCardStatusVariant, string> = {
  destructive: 'gba:text-red-600 gba:bg-red-100 dark:gba:bg-red-900/40 dark:gba:text-red-200',
  success: 'gba:text-green-600 gba:bg-green-100 dark:gba:bg-green-900/40 dark:gba:text-green-200',
  running: 'gba:text-blue-600 gba:bg-blue-100 dark:gba:bg-blue-900/40 dark:gba:text-blue-200',
  pending: 'gba:text-muted-foreground gba:bg-muted',
  muted: 'gba:text-muted-foreground gba:bg-muted'
}

const IconBadge: FC<{ name?: string; variant: ActionCardStatusVariant }> = ({ name, variant }) => {
  const Icon = (name && ICON_BY_NAME[name]) || SparkleIcon
  const tint = ICON_TINT_BY_VARIANT[variant]
  return (
    <div className={`gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl ${tint}`}>
      <Icon className="gba:h-4 gba:w-4" />
    </div>
  )
}

const StatusBadge: FC<{ status: ActionCardStatus }> = ({ status }) => (
  <span
    className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium ${STATUS_BADGE_CLASS[status.variant]}`}
    data-status-code={status.code}
    data-status-variant={status.variant}
  >
    {status.variant === 'running' && (
      <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
    )}
    {status.label}
  </span>
)

/**
 * Generic clickable card rendered for tool results that emit a
 * backend `action_card` payload. Replaces raw "workflowId: <uuid>"
 * markdown bullets with a business-friendly title + status badge +
 * deep link into the existing detail page. Use-case-agnostic: the
 * same component renders triggered flows, sent emails, scheduled
 * meetings, etc. — differentiation comes from
 * `payload.card.icon` / `entity.type` / `primaryAction.href`.
 */
export const ActionCard: FC<ActionCardProps> = ({ payload, callId, accessToken }) => {
  const { t } = useTranslation(translations)
  const isFlow = payload.card.entity?.type === 'service_workflow'
  const status = useLiveFlowStatus({
    workflowId: isFlow ? payload.card.entity?.id : null,
    accessToken,
    initialStatus: payload.card.status,
    enabled: isFlow && Boolean(payload.card.pollStatus)
  })
  const { card, refs, agentSummary } = payload
  const [refsOpen, setRefsOpen] = useState(false)

  const refsEntries = useMemo(() => {
    if (!refs) return []
    return Object.entries(refs).filter(([, v]) => v != null && v !== '')
  }, [refs])

  const handleOpen = useCallback(() => {
    if (!card.primaryAction?.href) return
    navigateTo(card.primaryAction.href)
  }, [card.primaryAction])

  return (
    <article
      className="gba:rounded-xl gba:border gba:border-border gba:bg-background gba:px-3.5 gba:py-3 gba:max-w-3xl"
      data-testid={`action-card-${callId}`}
      data-entity-type={card.entity?.type}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <IconBadge name={card.icon} variant={status.variant} />
        <div className="gba:flex-1 gba:min-w-0 gba:space-y-1">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
            <div className="gba:min-w-0">
              <div className="gba:text-[13px] gba:font-semibold gba:text-foreground gba:truncate">{card.title}</div>
              {card.subtitle && (
                <div className="gba:text-[12px] gba:text-muted-foreground gba:truncate">{card.subtitle}</div>
              )}
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:pt-1">
            <div className="gba:flex gba:items-center gba:gap-1.5">
              {card.primaryAction?.href && (
                <button
                  type="button"
                  onClick={handleOpen}
                  className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-[12px] gba:font-medium gba:text-foreground gba:hover:bg-muted/40 gba:transition-colors"
                >
                  <span>{card.primaryAction.label || t('renderer-action-open')}</span>
                  <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
                </button>
              )}
              {(card.secondaryActions ?? []).map(action => (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => navigateTo(action.href)}
                  className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:px-2 gba:py-1 gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:hover:bg-muted/40 gba:hover:text-foreground gba:transition-colors"
                >
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
            {refsEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setRefsOpen(v => !v)}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground"
                aria-expanded={refsOpen}
                title={t('renderer-action-show-tech-refs')}
              >
                {refsOpen ? (
                  <CaretDownIcon className="gba:h-3 gba:w-3" />
                ) : (
                  <CaretRightIcon className="gba:h-3 gba:w-3" />
                )}
                <span>{t('renderer-action-details')}</span>
              </button>
            )}
          </div>

          {refsOpen && refsEntries.length > 0 && (
            <dl className="gba:mt-2 gba:rounded-md gba:bg-muted/30 gba:px-2.5 gba:py-1.5 gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:space-y-0.5">
              {refsEntries.map(([key, value]) => (
                <div key={key} className="gba:flex gba:gap-2">
                  <dt className="gba:font-semibold gba:text-foreground/80">{key}</dt>
                  <dd className="gba:truncate">{value}</dd>
                </div>
              ))}
              {agentSummary && (
                <div className="gba:mt-1.5 gba:pt-1.5 gba:border-t gba:border-border/40 gba:text-foreground/70 gba:not-italic">
                  {agentSummary}
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </article>
  )
}

export default ActionCard
