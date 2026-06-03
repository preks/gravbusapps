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

type ErrorCategory = 'AUTH' | 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_ASSIGNEE' | 'UNKNOWN'

interface ParsedDispatchError {
  category: ErrorCategory
  message: string
  raw: string
}

const CATEGORY_META: Record<ErrorCategory, { label: string; Icon: React.FC<IconProps> }> = {
  AUTH: { label: 'Authentication failed', Icon: LockKeyIcon },
  UNAVAILABLE: { label: 'Service unavailable', Icon: PlugsIcon },
  TIMEOUT: { label: 'Timed out', Icon: TimerIcon },
  INVALID_ASSIGNEE: { label: 'Invalid assignee', Icon: UserMinusIcon },
  UNKNOWN: { label: 'Failed', Icon: WarningCircleIcon }
}

const FRIENDLY_FALLBACK: Record<ErrorCategory, string> = {
  AUTH: 'Authentication to the flow engine failed (token missing or rejected). Check the service-account credentials, then Retry.',
  UNAVAILABLE: 'The flow engine could not be reached. Check that the service is running.',
  TIMEOUT: 'The flow engine did not respond in time. Retry when it is reachable.',
  INVALID_ASSIGNEE: 'An assignee could not be resolved. Verify the assignee still exists.',
  UNKNOWN: 'The task could not be delivered.'
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
    return { category, message: message || FRIENDLY_FALLBACK[category], raw }
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

  return { category, message: FRIENDLY_FALLBACK[category], raw }
}

export const DispatchError: React.FC<{ error: string }> = ({ error }) => {
  const [showRaw, setShowRaw] = useState(false)
  const { category, message, raw } = parseDispatchError(error)
  const { label, Icon } = CATEGORY_META[category]
  const hasRawDetail = raw.trim() !== message.trim()

  return (
    <div className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-2.5">
      <div className="gba:flex gba:items-start gba:gap-1.5 gba:text-destructive">
        <Icon className="gba:h-3.5 gba:w-3.5 gba:mt-0.5 gba:shrink-0" />
        <div className="gba:min-w-0">
          <p className="gba:text-[12px] gba:font-semibold">{label}</p>
          <p className="gba:text-[12px] gba:text-foreground/80">{message}</p>
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
            {showRaw ? 'Hide details' : 'Details'}
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
