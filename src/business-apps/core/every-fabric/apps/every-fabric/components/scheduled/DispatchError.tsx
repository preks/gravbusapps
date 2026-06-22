import { useTranslation } from '@newwork/nw-design-system'
import {
  CaretDownIcon,
  CaretUpIcon,
  LockKeyIcon,
  PlugsIcon,
  TimerIcon,
  UserMinusIcon,
  WarningCircleIcon,
  type IconProps
} from '@phosphor-icons/react'
import { useState } from 'react'
import translations from '../../_i18n'

type ErrorCategory = 'AUTH' | 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_ASSIGNEE' | 'UNKNOWN'

interface ParsedDispatchError {
  category: ErrorCategory
  message: string
  raw: string
}

const CATEGORY_ICONS: Record<ErrorCategory, React.FC<IconProps>> = {
  AUTH: LockKeyIcon,
  UNAVAILABLE: PlugsIcon,
  TIMEOUT: TimerIcon,
  INVALID_ASSIGNEE: UserMinusIcon,
  UNKNOWN: WarningCircleIcon
}

const CATEGORY_LABEL_KEYS: Record<ErrorCategory, string> = {
  AUTH: 'scheduled-dispatch-err-auth-label',
  UNAVAILABLE: 'scheduled-dispatch-err-unavailable-label',
  TIMEOUT: 'scheduled-dispatch-err-timeout-label',
  INVALID_ASSIGNEE: 'scheduled-dispatch-err-assignee-label',
  UNKNOWN: 'scheduled-dispatch-err-unknown-label'
}

const CATEGORY_MSG_KEYS: Record<ErrorCategory, string> = {
  AUTH: 'scheduled-dispatch-err-auth-msg',
  UNAVAILABLE: 'scheduled-dispatch-err-unavailable-msg',
  TIMEOUT: 'scheduled-dispatch-err-timeout-msg',
  INVALID_ASSIGNEE: 'scheduled-dispatch-err-assignee-msg',
  UNKNOWN: 'scheduled-dispatch-err-unknown-msg'
}

/**
 * Parse a stored dispatch error. New records carry a "CODE: message" prefix from
 * the backend classifier; legacy records (e.g. the raw "302 redirect to Keycloak"
 * dump) are inferred from keywords so they also render cleanly.
 */
export function parseDispatchError(raw: string): ParsedDispatchError {
  // Match only the fixed-width prefix; extract the message body with slice() so
  // there is no unbounded quantifier adjacent to $ and no ReDoS backtracking risk.
  const prefixMatch = /^(?:Attempt \d+ failed — )?(AUTH|UNAVAILABLE|TIMEOUT|INVALID_ASSIGNEE|UNKNOWN):/.exec(raw)
  if (prefixMatch) {
    const category = prefixMatch[1] as ErrorCategory
    const message = raw.slice(prefixMatch[0].length).trim()
    return { category, message, raw }
  }

  const lowered = raw.toLowerCase()
  let category: ErrorCategory = 'UNKNOWN'
  if (
    lowered.includes('keycloak') ||
    lowered.includes('openid-connect/auth') ||
    lowered.includes('redirect response') ||
    lowered.includes('401') ||
    lowered.includes('unauthorized')
  ) {
    category = 'AUTH'
  } else if (lowered.includes('timed out') || lowered.includes('timeout')) {
    category = 'TIMEOUT'
  } else if (lowered.includes('connect') || lowered.includes('connection')) {
    category = 'UNAVAILABLE'
  }

  return { category, message: '', raw }
}

export const DispatchError: React.FC<{ error: string }> = ({ error }) => {
  const { t } = useTranslation(translations)
  const [showRaw, setShowRaw] = useState(false)
  const { category, message, raw } = parseDispatchError(error)
  const Icon = CATEGORY_ICONS[category]
  const label = t(CATEGORY_LABEL_KEYS[category])
  const displayMessage = message || t(CATEGORY_MSG_KEYS[category])
  const hasRawDetail = raw.trim() !== displayMessage.trim()

  return (
    <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-2.5">
      <div className="gba:flex gba:items-start gba:gap-1.5 gba:text-destructive">
        <Icon className="gba:h-3.5 gba:w-3.5 gba:mt-0.5 gba:shrink-0" />
        <div className="gba:min-w-0">
          <p className="gba:text-[12px] gba:font-semibold">{label}</p>
          <p className="gba:text-[12px] gba:text-foreground/80">{displayMessage}</p>
        </div>
      </div>
      {hasRawDetail && (
        <>
          <button
            type="button"
            onClick={() => setShowRaw(v => !v)}
            className="gba:mt-1.5 gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground"
          >
            {showRaw ? <CaretUpIcon className="gba:h-3 gba:w-3" /> : <CaretDownIcon className="gba:h-3 gba:w-3" />}
            {showRaw ? t('scheduled-dispatch-hide-details') : t('scheduled-dispatch-details')}
          </button>
          {showRaw && (
            <pre className="gba:mt-1 gba:max-h-32 gba:overflow-auto gba:whitespace-pre-wrap gba:break-words gba:rounded gba:bg-muted/60 gba:p-2 gba:text-[10px] gba:text-muted-foreground gba:font-mono">
              {raw}
            </pre>
          )}
        </>
      )}
    </div>
  )
}
