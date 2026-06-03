import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  EnvelopeSimpleIcon,
  PaperclipIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  UserCircleIcon,
  XIcon
} from '@phosphor-icons/react'
import { Input } from '@newwork/nw-design-system'
import type {
  ComposeEmailAction,
  ComposeEmailAttachmentRef,
  ComposeEmailDraft,
  ComposeEmailRecipient,
  ComposeEmailSubmission
} from '../../types/enterpriseAgent'
import {
  useEmployeeSearch,
  getWorkEmailFromCommunication,
  type EmployeeLiteOption
} from '@/common/data/employee/useEmployeeSearch'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { BusinessAppContext } from '@/common/BusinessAppContext'
import type { ComposeEmailOutcomePayload } from '../../utils/composeEmailTrace'

interface EmailAccountOption {
  id: string
  displayName: string
  emailAddress: string
  isDefault?: boolean
  signature?: string
}

interface EmailComposerBubbleProps {
  readonly draft: ComposeEmailDraft
  readonly rationale?: string
  readonly accessToken?: string
  readonly onSubmit: (submission: ComposeEmailSubmission) => void
  /** Present when transcript already has a later `compose_email` tool_result (reload / refresh). */
  readonly traceOutcome?: ComposeEmailOutcomePayload | null
}

const cloneRecipients = (list?: ComposeEmailRecipient[]): ComposeEmailRecipient[] =>
  (list ?? []).map(r => ({ name: r.name, address: r.address }))

const cloneAttachments = (list?: ComposeEmailAttachmentRef[] | null): ComposeEmailAttachmentRef[] =>
  (list ?? []).map(a => ({
    id: a.id,
    name: a.name,
    mime_type: a.mime_type,
    size: a.size
  }))

const formatAttachmentSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const htmlToPlainText = (html: string): string => {
  if (!html) return ''
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]{1,1000}>/g, '')
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const TRACE_STATUS_LABELS: Record<string, string> = {
  sent: 'Email sent',
  drafted: 'Saved as draft',
  cancelled: 'Cancelled',
  error: 'Send failed'
}

const LOCAL_STATUS_LABELS: Partial<Record<ComposeEmailAction, string>> = {
  send: 'Email sent',
  draft: 'Saved as draft',
  cancel: 'Cancelled'
}

const extractAccountList = (data: unknown): EmailAccountOption[] => {
  if (Array.isArray(data)) return data as EmailAccountOption[]
  const wrapped = (data as { data?: unknown })?.data
  if (Array.isArray(wrapped)) return wrapped as EmailAccountOption[]
  return []
}

const pickAccountId = (previous: string | null, list: EmailAccountOption[]): string | null => {
  if (previous && list.some(a => a.id === previous)) return previous
  const def = list.find(a => a.isDefault)
  return def?.id ?? list[0]?.id ?? null
}

/**
 * Pure, early-returning validation for the compose-email submit path.
 * Extracted out of the component so the main `EmailComposerBubble` function
 * stays below SonarQube's cognitive-complexity threshold (S3776). Returns the
 * user-facing error message, or `null` when the submission is valid (including
 * the `cancel` action, which bypasses all checks).
 */
const validateSubmission = (
  action: ComposeEmailAction,
  to: ComposeEmailRecipient[],
  subject: string,
  accountId: string | null,
  accountsLength: number
): string | null => {
  if (action === 'cancel') return null
  if (to.length === 0) return 'Add at least one recipient.'
  if (!subject.trim()) return 'Subject is required.'
  if (!accountId && accountsLength > 0) return 'Pick an email account to send from.'
  if (!accountId) return 'No email account is connected.'
  return null
}

const plainTextToHtml = (text: string): string => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
  return paragraphs || '<p></p>'
}

const COMPOSE_FIELD_LABEL_CLASS = 'gba:text-[11px] gba:text-muted-foreground gba:w-10 gba:shrink-0 gba:text-right'

function ComposeFieldRow({
  label,
  children,
  multiline = false
}: {
  readonly label: string
  readonly children: ReactNode
  readonly multiline?: boolean
}) {
  return (
    <div className={`gba:flex gba:gap-2 ${multiline ? 'gba:items-start' : 'gba:items-center'}`}>
      <span className={`${COMPOSE_FIELD_LABEL_CLASS} ${multiline ? 'gba:pt-2' : ''}`}>{label}</span>
      <div className="gba:flex-1 gba:min-w-0">{children}</div>
    </div>
  )
}

function RecipientChipInput({
  fieldLabel,
  value,
  onChange,
  accessToken,
  readOnly
}: {
  readonly fieldLabel: string
  readonly value: ComposeEmailRecipient[]
  readonly onChange: (next: ComposeEmailRecipient[]) => void
  readonly accessToken?: string
  readonly readOnly?: boolean
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { employees, loading, search } = useEmployeeSearch(accessToken)

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) {
      setDropPos(null)
      return
    }
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300) })
  }, [isOpen, employees])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) search(query.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addRecipient = useCallback(
    (recipient: ComposeEmailRecipient) => {
      const addr = recipient.address.trim().toLowerCase()
      if (!addr) return
      if (value.some(v => v.address.trim().toLowerCase() === addr)) return
      onChange([...value, { ...recipient, address: recipient.address.trim() }])
      setQuery('')
    },
    [value, onChange]
  )

  const removeRecipient = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const commitRawEmail = () => {
    const text = query.trim()
    if (!text) return
    // Shallow "looks like email" check — full validation happens server-side
    // when the draft is sent. ReDoS-safe: each quantified class excludes the
    // separators (`@`, `.`, whitespace) that anchor the next group, so the
    // engine never has to backtrack across `@` or `.`. Matches
    // `jane.doe@example.com`, `user@mail.google.com`, `a@b.co`, etc.
    if (/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(text)) {
      addRecipient({ address: text })
    }
  }

  const handleSelectEmployee = (emp: EmployeeLiteOption) => {
    const address = getWorkEmailFromCommunication(emp.communication)
    if (!address) return
    addRecipient({ name: emp.displayName, address })
    setIsOpen(false)
  }

  if (readOnly) {
    return (
      <div
        className="gba:flex gba:min-h-9 gba:items-center gba:flex-wrap gba:gap-1.5 gba:rounded-lg gba:border gba:border-transparent gba:bg-muted/25 gba:px-2.5 gba:py-1 gba:text-[13px] gba:text-muted-foreground"
        aria-label={fieldLabel}
      >
        {value.length === 0 ? (
          <span className="gba:italic">—</span>
        ) : (
          value.map(r => (
            <span key={r.address} className="gba:truncate">
              {r.name ? `${r.name} <${r.address}>` : r.address}
            </span>
          ))
        )}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="gba:relative gba:w-full">
      <div
        className="gba:flex gba:min-h-9 gba:items-center gba:flex-wrap gba:gap-1.5 gba:rounded-lg gba:border gba:border-input gba:bg-background gba:px-2.5 gba:py-1"
        role="group"
        aria-label={fieldLabel}
      >
        {value.map((r, i) => {
          const chipLabel = r.name || r.address
          const chipTitle = r.name ? `${r.name} <${r.address}>` : r.address
          return (
            <span
              key={`${r.address}-${i}`}
              className="gba:inline-flex gba:max-w-full gba:items-center gba:gap-1 gba:rounded-md gba:bg-muted gba:text-foreground gba:text-[12px] gba:px-2 gba:py-0.5"
            >
              <span className="gba:max-w-[200px] gba:truncate" title={chipTitle}>
                {chipLabel}
              </span>
              <button
                type="button"
                className="gba:rounded-sm gba:text-muted-foreground gba:hover:bg-muted-foreground/10 gba:p-0.5"
                onClick={() => removeRecipient(i)}
                aria-label={`Remove ${r.address}`}
              >
                <XIcon className="gba:h-3 gba:w-3" />
              </button>
            </span>
          )
        })}
        <input
          type="text"
          className="gba:h-7 gba:min-w-[120px] gba:flex-1 gba:border-0 gba:bg-transparent gba:px-0 gba:text-[13px] gba:outline-none"
          placeholder={value.length === 0 ? 'Type a name or email…' : ''}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
              if (query.trim()) {
                e.preventDefault()
                commitRawEmail()
              }
            } else if (e.key === 'Backspace' && !query && value.length > 0) {
              removeRecipient(value.length - 1)
            }
          }}
        />
      </div>

      {isOpen &&
        dropPos &&
        query.trim().length > 0 &&
        createPortal(
          <div
            className="gba:fixed gba:z-9999 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-xl gba:max-h-[320px] gba:overflow-y-auto"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          >
            {loading && <div className="gba:px-4 gba:py-2 gba:text-[12px] gba:text-muted-foreground">Searching…</div>}
            {!loading && employees.length === 0 && (
              <div className="gba:px-4 gba:py-2 gba:text-[12px] gba:text-muted-foreground">
                No matching employees. Press Enter to add raw email.
              </div>
            )}
            {!loading &&
              employees
                .filter(emp => !!getWorkEmailFromCommunication(emp.communication))
                .map(emp => {
                  const email = getWorkEmailFromCommunication(emp.communication)
                  return (
                    <button
                      key={emp.userId || emp.id}
                      type="button"
                      className="gba:w-full gba:px-3 gba:py-2 gba:flex gba:items-center gba:gap-2 gba:text-left gba:hover:bg-accent gba:hover:text-accent-foreground gba:transition-colors gba:border-0 gba:bg-transparent gba:cursor-pointer"
                      onMouseDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={() => handleSelectEmployee(emp)}
                    >
                      <UserCircleIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:shrink-0" />
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-[13px] gba:font-medium gba:truncate">{emp.displayName}</div>
                        <div className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{email}</div>
                      </div>
                    </button>
                  )
                })}
          </div>,
          document.body
        )}
    </div>
  )
}

function AccountPicker({
  accounts,
  selectedId,
  onChange,
  loading,
  readOnly
}: {
  readonly accounts: EmailAccountOption[]
  readonly selectedId?: string | null
  readonly onChange: (id: string) => void
  readonly loading: boolean
  readonly readOnly?: boolean
}) {
  const selected = accounts.find(a => a.id === selectedId)
  if (readOnly) {
    return (
      <div className="gba:text-[13px] gba:text-muted-foreground gba:truncate">
        {selected?.displayName || selected?.emailAddress || '—'}
      </div>
    )
  }
  if (loading) {
    return <div className="gba:text-[11px] gba:text-muted-foreground">Loading accounts…</div>
  }
  if (accounts.length === 0) {
    return (
      <div className="gba:text-[11px] gba:text-destructive">
        No email accounts connected. Connect one in your email settings to send.
      </div>
    )
  }
  return (
    <div className="gba:relative">
      <select
        value={selectedId ?? ''}
        onChange={e => onChange(e.target.value)}
        className="gba:h-9 gba:w-full gba:appearance-none gba:rounded-lg gba:border gba:border-input gba:bg-background gba:pl-2.5 gba:pr-8 gba:text-[13px]"
      >
        {accounts.map(a => (
          <option key={a.id} value={a.id}>
            {a.displayName || a.emailAddress} {a.isDefault ? '(default)' : ''}
          </option>
        ))}
      </select>
      <CaretDownIcon className="gba:pointer-events-none gba:absolute gba:right-2.5 gba:top-1/2 gba:h-3.5 gba:w-3.5 gba:-translate-y-1/2 gba:text-muted-foreground" />
    </div>
  )
}

export function EmailComposerBubble({
  draft,
  rationale,
  accessToken,
  onSubmit,
  traceOutcome
}: EmailComposerBubbleProps) {
  const businessAppCtx = useContext(BusinessAppContext)
  const userInfo = businessAppCtx?.userInfo
  const [to, setTo] = useState<ComposeEmailRecipient[]>(() => cloneRecipients(draft.to))
  const [cc, setCc] = useState<ComposeEmailRecipient[]>(() => cloneRecipients(draft.cc))
  const [bcc, setBcc] = useState<ComposeEmailRecipient[]>(() => cloneRecipients(draft.bcc))
  const [showCc, setShowCc] = useState<boolean>((draft.cc?.length ?? 0) > 0 || (draft.bcc?.length ?? 0) > 0)
  const [subject, setSubject] = useState<string>(draft.subject ?? '')
  const [body, setBody] = useState<string>(() => htmlToPlainText(draft.html_body ?? '') || draft.text_body || '')
  const agentSignature = draft.signature ?? ''

  const fallbackSignature = useMemo(() => {
    if (!userInfo) return ''
    const name =
      userInfo.employeeDetails?.displayName ||
      `${userInfo.givenName ?? ''} ${userInfo.familyName ?? ''}`.trim() ||
      userInfo.userName ||
      ''
    const title = userInfo.employeeDetails?.jobTitle
    return title ? `${name}\n${title}` : name
  }, [userInfo])

  const [signature, setSignature] = useState<string>(agentSignature || fallbackSignature)
  const [useAccountSignature, setUseAccountSignature] = useState<boolean>(false)

  const [accounts, setAccounts] = useState<EmailAccountOption[]>([])
  const [accountsLoading, setAccountsLoading] = useState<boolean>(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(draft.account_id ?? null)

  const [attachments, setAttachments] = useState<ComposeEmailAttachmentRef[]>(() => cloneAttachments(draft.attachments))

  const [submitting, setSubmitting] = useState<ComposeEmailAction | null>(null)
  const [doneAction, setDoneAction] = useState<ComposeEmailAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Collapsed summary after submit (local) or when trace already has tool_result */
  const [compactCollapsed, setCompactCollapsed] = useState(() => !!traceOutcome)

  useEffect(() => {
    if (doneAction !== null) setCompactCollapsed(true)
  }, [doneAction])

  useEffect(() => {
    if (traceOutcome) setCompactCollapsed(true)
  }, [traceOutcome])

  useEffect(() => {
    let cancelled = false
    const loadAccounts = async () => {
      if (!accessToken) {
        setAccountsLoading(false)
        return
      }
      try {
        const base = getDocumentServiceApiUrl()
        const res = await fetch(`${base}/emails/accounts`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const list = extractAccountList(data)
        if (cancelled) return
        setAccounts(list)
        setAccountId(prev => pickAccountId(prev, list))
      } catch (err) {
        if (!cancelled) setAccountsError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setAccountsLoading(false)
      }
    }
    loadAccounts()
    return () => {
      cancelled = true
    }
  }, [accessToken])

  const selectedAccount = useMemo(() => accounts.find(a => a.id === accountId) ?? null, [accounts, accountId])

  useEffect(() => {
    if (useAccountSignature && selectedAccount?.signature) {
      setSignature(selectedAccount.signature)
    } else if (!useAccountSignature) {
      setSignature(agentSignature || fallbackSignature)
    }
  }, [useAccountSignature, selectedAccount, agentSignature, fallbackSignature])

  const effectiveLocked = !!traceOutcome || doneAction !== null
  const readOnly = effectiveLocked
  /** Compact one-line summary after submit; expand to review (read-only). */
  const showCompactBar = effectiveLocked && compactCollapsed
  const showDetailPanel = !effectiveLocked || !compactCollapsed

  const handleSubmit = useCallback(
    (action: ComposeEmailAction) => {
      const validationError = validateSubmission(action, to, subject, accountId, accounts.length)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      setSubmitting(action)
      // Always send cc / bcc / attachments — even when the operator removed
      // every chip and the list is now empty. Sending ``undefined`` strips the
      // field from the JSON payload, and the backend then falls back to the
      // agent's original draft defaults, silently re-injecting the recipient
      // (or attachment) the operator just removed. The backend
      // ``_resolve_recipients`` helper treats *present-but-empty* as
      // "operator explicitly cleared" and *absent* as "use the draft" — so
      // we must always include the key.
      const submission: ComposeEmailSubmission = {
        form_id: 'compose_email',
        action,
        to,
        cc,
        bcc,
        subject,
        htmlBody: plainTextToHtml(body),
        textBody: body,
        signature: signature || undefined,
        accountId: accountId ?? undefined,
        attachments
      }
      setDoneAction(action)
      onSubmit(submission)
    },
    [to, cc, bcc, subject, body, signature, accountId, accounts.length, attachments, onSubmit]
  )

  const traceStatusLabel = traceOutcome ? (TRACE_STATUS_LABELS[traceOutcome.status ?? ''] ?? 'Completed') : null

  const localStatusLabel = doneAction ? (LOCAL_STATUS_LABELS[doneAction] ?? null) : null

  const headerStatusLabel = traceStatusLabel ?? localStatusLabel
  const summarySubject = traceOutcome?.subject?.trim() || subject.trim() || 'No subject'

  const shellClass = effectiveLocked
    ? 'gba:rounded-2xl gba:border gba:border-border/50 gba:bg-muted/25 gba:opacity-95 gba:shadow-none'
    : 'gba:rounded-2xl gba:border gba:border-border/60 gba:bg-background gba:shadow-[0_4px_16px_rgba(15,23,42,0.04)]'

  const headerBaseClass = `gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border/60 gba:bg-muted/20 ${
    effectiveLocked ? 'gba:cursor-pointer gba:hover:bg-muted/35 gba:transition-colors' : ''
  }`
  const headerInner = (
    <>
      <EnvelopeSimpleIcon
        className={`gba:h-4 gba:w-4 gba:shrink-0 ${effectiveLocked ? 'gba:text-muted-foreground' : 'gba:text-primary'}`}
      />
      <div className="gba:flex-1 gba:min-w-0">
        <div
          className={`gba:text-[13px] gba:font-semibold ${effectiveLocked ? 'gba:text-muted-foreground' : 'gba:text-foreground'}`}
        >
          {headerStatusLabel ?? 'Review and send email'}
        </div>
        {showCompactBar ? (
          <div className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{summarySubject}</div>
        ) : (
          rationale &&
          !headerStatusLabel && (
            <div className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{rationale}</div>
          )
        )}
      </div>
      {headerStatusLabel && <CheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="bold" />}
      {effectiveLocked &&
        (compactCollapsed ? (
          <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
        ) : (
          <CaretDownIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
        ))}
    </>
  )
  const headerRow = effectiveLocked ? (
    <button
      type="button"
      onClick={() => setCompactCollapsed(c => !c)}
      className={`${headerBaseClass} gba:w-full gba:text-left gba:bg-muted/20 gba:border-0`}
    >
      {headerInner}
    </button>
  ) : (
    <div className={headerBaseClass}>{headerInner}</div>
  )

  if (showCompactBar) {
    return (
      <div className="gba:w-full gba:max-w-3xl">
        <div className={`${shellClass} gba:overflow-hidden`}>{headerRow}</div>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:max-w-3xl">
      <div className={`${shellClass} gba:overflow-hidden`}>
        {headerRow}

        {showDetailPanel && (
          <>
            <div className="gba:space-y-2 gba:p-3">
              <ComposeFieldRow label="From">
                {accountsError ? (
                  <div className="gba:text-[11px] gba:text-destructive">Failed to load accounts: {accountsError}</div>
                ) : (
                  <AccountPicker
                    accounts={accounts}
                    selectedId={accountId}
                    onChange={id => setAccountId(id)}
                    loading={accountsLoading}
                    readOnly={readOnly}
                  />
                )}
              </ComposeFieldRow>

              <ComposeFieldRow label="To" multiline>
                <RecipientChipInput
                  fieldLabel="To"
                  value={to}
                  onChange={setTo}
                  accessToken={accessToken}
                  readOnly={readOnly}
                />
              </ComposeFieldRow>

              {showCc ? (
                <>
                  <ComposeFieldRow label="Cc" multiline>
                    <RecipientChipInput
                      fieldLabel="Cc"
                      value={cc}
                      onChange={setCc}
                      accessToken={accessToken}
                      readOnly={readOnly}
                    />
                  </ComposeFieldRow>
                  <ComposeFieldRow label="Bcc" multiline>
                    <RecipientChipInput
                      fieldLabel="Bcc"
                      value={bcc}
                      onChange={setBcc}
                      accessToken={accessToken}
                      readOnly={readOnly}
                    />
                  </ComposeFieldRow>
                </>
              ) : (
                !readOnly && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="gba:ml-12 gba:text-[11px] gba:text-muted-foreground gba:underline gba:underline-offset-2 gba:hover:text-foreground"
                  >
                    Add Cc / Bcc
                  </button>
                )
              )}

              <div>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject"
                  disabled={readOnly}
                  className="gba:text-[14px] gba:font-medium"
                />
              </div>

              <div>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  disabled={readOnly}
                  rows={8}
                  placeholder="Write your message…"
                  className="gba:w-full gba:text-[13px] gba:leading-6 gba:border gba:border-input gba:rounded-lg gba:bg-background gba:px-3 gba:py-2 gba:resize-y gba:min-h-[160px] gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring/40 gba:disabled:opacity-90"
                />
              </div>

              {attachments.length > 0 && (
                <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-1.5">
                  {attachments.map(att => {
                    const sizeLabel = formatAttachmentSize(att.size)
                    const displayName = att.name || att.id
                    return (
                      <span
                        key={att.id}
                        className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/30 gba:px-2 gba:py-1 gba:text-[11px] gba:text-foreground"
                        title={sizeLabel ? `${displayName} · ${sizeLabel}` : displayName}
                      >
                        <PaperclipIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                        <span className="gba:max-w-[220px] gba:truncate">{displayName}</span>
                        {sizeLabel && <span className="gba:text-muted-foreground">· {sizeLabel}</span>}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                            aria-label={`Remove attachment ${displayName}`}
                            className="gba:ml-0.5 gba:rounded-sm gba:p-0.5 gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40"
                          >
                            <XIcon className="gba:h-3 gba:w-3" />
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2 gba:space-y-1.5">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                    Signature
                  </span>
                  {selectedAccount?.signature && !readOnly && (
                    <label className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground gba:cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAccountSignature}
                        onChange={e => setUseAccountSignature(e.target.checked)}
                        className="gba:h-3 gba:w-3"
                      />
                      <span>Use my account signature</span>
                    </label>
                  )}
                </div>
                <textarea
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  disabled={readOnly}
                  rows={3}
                  placeholder="-- \nYour Name"
                  className="gba:w-full gba:text-[12px] gba:leading-5 gba:border gba:border-input gba:rounded-md gba:bg-background gba:px-2 gba:py-1.5 gba:resize-y gba:min-h-[60px]"
                />
              </div>

              {error && (
                <div className="gba:text-[12px] gba:text-destructive gba:bg-destructive/5 gba:border gba:border-destructive/30 gba:rounded-md gba:px-3 gba:py-2">
                  {error}
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-3 gba:py-2.5 gba:border-t gba:border-border/60 gba:bg-muted/10">
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => handleSubmit('cancel')}
                  className="gba:inline-flex gba:items-center gba:gap-1.5 gba:h-8 gba:px-3 gba:rounded-md gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:transition-colors gba:disabled:opacity-50"
                >
                  <XIcon className="gba:h-3.5 gba:w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => handleSubmit('draft')}
                  className="gba:inline-flex gba:items-center gba:gap-1.5 gba:h-8 gba:px-3 gba:rounded-md gba:text-[12px] gba:font-medium gba:border gba:border-input gba:hover:bg-muted/40 gba:transition-colors gba:disabled:opacity-50"
                >
                  <PencilSimpleIcon className="gba:h-3.5 gba:w-3.5" />
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={submitting !== null}
                  onClick={() => handleSubmit('send')}
                  className="gba:inline-flex gba:items-center gba:gap-1.5 gba:h-8 gba:px-3.5 gba:rounded-md gba:text-[12px] gba:font-semibold gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:transition-colors gba:disabled:opacity-50"
                >
                  <PaperPlaneTiltIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
                  {submitting === 'send' ? 'Sending…' : 'Send'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
