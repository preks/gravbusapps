import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, Textarea } from '@newwork/nw-design-system'
import { Bot, User } from 'lucide-react'
import type {
  AssistantChatMessage as AssistantChatMessageModel,
  ClarifyWizardAnswer,
  ClarifyWizardState
} from '../../hooks/useFunctionAssistantChat'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import type { FunctionDefinitionTab } from '../editor/FunctionDefinitionCard'
import { AssistantActivityLog } from './AssistantActivityLog'

function parseRequirementsSummary(text: string): Array<{ label: string; value: string }> | null {
  const lines = String(text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return null

  const items: Array<{ label: string; value: string }> = []
  const seen = new Set<string>()
  const takeAny = (prefixes: string[], label: string) => {
    for (const prefix of prefixes) {
      const line = lines.find(l => l.toLowerCase().startsWith(prefix.toLowerCase()))
      if (!line) continue
      const value = line.slice(prefix.length).trim()
      if (!value) return
      items.push({ label, value })
      seen.add(label.toLowerCase())
      return
    }
  }

  // Wizard “selection” style
  takeAny(['Category:'], 'Category')
  takeAny(['System:', 'Provider:', 'Service:'], 'System')

  takeAny(['Goal:'], 'Goal')
  takeAny(['Auth:', 'Authentication:'], 'Auth')
  takeAny(['Config keys (UPPERCASE):', 'Config keys:'], 'Config keys')
  takeAny(['Integration preset:', 'Preset:'], 'Integration preset')
  takeAny(['Integration notes:', 'Notes:'], 'Integration notes')

  // Generic fallback: if the message looks like a wizard summary (multiple key-value lines),
  // render it as structured items (e.g. sapOperation: ..., tokenEndpoint: ...).
  for (const line of lines) {
    // Ignore code fences or raw JSON-ish lines.
    if (line.startsWith('```')) continue
    if (line.startsWith('{') || line.startsWith('[')) continue
    const m = line.match(/^([A-Za-z][A-Za-z0-9 _./-]{0,40})\s*:\s+(.+)$/)
    if (!m?.[1] || !m?.[2]) continue
    const rawKey = m[1].trim()
    const rawVal = m[2].trim()
    if (!rawKey || !rawVal) continue
    if (/^api spec$/i.test(rawKey)) continue
    const label = humanizeKeyLabel(rawKey)
    if (seen.has(label.toLowerCase())) continue
    items.push({ label, value: rawVal })
    seen.add(label.toLowerCase())
  }

  return items.length >= 2 ? items : null
}

function humanizeKeyLabel(raw: string): string {
  const k = String(raw || '').trim()
  if (!k) return ''
  // snake_case / kebab-case
  const withSpaces = k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

  const words = withSpaces.split(' ').filter(Boolean)
  const out = words
    .map((w, idx) => {
      const lower = w.toLowerCase()
      if (lower === 'sap') return 'SAP'
      if (lower === 'url') return 'URL'
      if (lower === 'api') return 'API'
      if (lower === 'oauth') return 'OAuth'
      if (w.toUpperCase() === w && w.length <= 5) return w // keep short ALLCAPS
      if (idx === 0) return w.charAt(0).toUpperCase() + w.slice(1)
      return lower
    })
    .join(' ')

  return out || k
}

function getUserSummaryTitle(items: Array<{ label: string; value: string }>): string {
  const labels = new Set(items.map(i => i.label))
  const isSelectionOnly = labels.has('Category') || labels.has('System')
  const hasRequirements =
    labels.has('Goal') ||
    labels.has('Auth') ||
    labels.has('Config keys') ||
    labels.has('Integration preset') ||
    labels.has('Integration notes')
  if (isSelectionOnly && !hasRequirements) return 'Selection'
  if (hasRequirements) return 'Requirements'
  return 'Details'
}

export interface AssistantChatMessageProps {
  message: AssistantChatMessageModel
  activityLines?: string[]
  userInfo?: UserInfoProps
  userAvatarSrc?: string
  onApplyDraftDirect?: (draft: any) => void
  onOpenDefinitionTab?: (tab: FunctionDefinitionTab) => void
  onRetryLast?: () => void
  canRetryLast?: boolean
  onQuickInsert?: (text: string) => void
  onQuickSubmit?: (text: string) => void
  clarifyWizard?: ClarifyWizardState | null
  onClarifyAnswerChange?: (questionId: string, update: Partial<ClarifyWizardAnswer>) => void
  onClarifyBack?: () => void
  onClarifyNext?: () => void
  onClarifySubmit?: () => void
  'data-testid'?: string
}

function OptionCardButton(props: {
  label: string
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  testId: string
}) {
  const selected = Boolean(props.selected)
  const disabled = Boolean(props.disabled)
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled}
      className={[
        'gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:px-3 gba:py-2 gba:text-left gba:transition-colors gba:text-foreground',
        'gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring',
        disabled ? 'gba:cursor-default gba:disabled:opacity-100' : 'gba:cursor-pointer gba:hover:bg-muted',
        selected ? 'gba:border-primary gba:bg-muted' : 'gba:border-border gba:bg-background'
      ].join(' ')}
      data-testid={props.testId}
      aria-pressed={selected}
    >
      <span
        className={[
          'gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:rounded-full gba:border gba:flex gba:items-center gba:justify-center',
          selected ? 'gba:border-primary' : 'gba:border-border'
        ].join(' ')}
        aria-hidden="true"
      >
        {selected ? <span className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary" /> : null}
      </span>
      <span className="gba:text-sm gba:leading-snug gba:whitespace-normal gba:break-words">{props.label}</span>
    </button>
  )
}

function renderSubmittedClarifyAnswer(
  q: {
    id: string
    question: string
    options?: string[]
    optionsV2?: Array<{ id: string; label: string; value: string }>
  },
  answer:
    | {
        selectedOptionLabel?: string
        selectedOptionValue?: string
        freeTextPreview?: string
        hasFreeText?: boolean
      }
    | undefined,
  testId: string
) {
  const selectedValue = String(answer?.selectedOptionValue || '').trim()
  const selectedLabel = String(answer?.selectedOptionLabel || '').trim()
  const hasFreeText = Boolean(answer?.hasFreeText)
  const preview = String(answer?.freeTextPreview || '').trim()

  if (q.optionsV2?.length) {
    return (
      <div className="gba:grid gba:grid-cols-1 gba:gap-2" data-testid={`${testId}-clarify-${q.id}-readonly-options`}>
        {q.optionsV2.map(opt => {
          const isSelected = selectedValue
            ? selectedValue === opt.value
            : selectedLabel
              ? selectedLabel === opt.label
              : false
          return (
            <OptionCardButton
              key={opt.value}
              label={opt.label}
              selected={Boolean(isSelected)}
              disabled
              testId={`${testId}-clarify-${q.id}-readonly-${opt.value}`}
            />
          )
        })}
      </div>
    )
  }

  if (q.options?.length) {
    const selected = selectedLabel
    return (
      <div className="gba:grid gba:grid-cols-1 gba:gap-2" data-testid={`${testId}-clarify-${q.id}-readonly-options`}>
        {q.options.map(opt => {
          const isSelected = selected && selected === opt
          return (
            <OptionCardButton
              key={opt}
              label={opt}
              selected={Boolean(isSelected)}
              disabled
              testId={`${testId}-clarify-${q.id}-readonly-${opt}`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-clarify-${q.id}-readonly-text`}>
      {hasFreeText ? preview || 'Provided' : selectedLabel || '—'}
    </div>
  )
}

function bubbleBase(role: 'assistant' | 'user' | 'system') {
  if (role === 'user') return 'gba:bg-primary gba:text-primary-foreground'
  if (role === 'system') return 'gba:bg-muted gba:text-muted-foreground'
  return 'gba:bg-card gba:text-card-foreground'
}

function getUserInitials(userInfo?: UserInfoProps): string {
  const first = userInfo?.employeeDetails?.firstName || userInfo?.givenName || userInfo?.userName || ''
  const last = userInfo?.employeeDetails?.lastName || userInfo?.familyName || ''
  const a = String(first).trim().charAt(0).toUpperCase()
  const b = String(last).trim().charAt(0).toUpperCase()
  const initials = `${a}${b}`.trim()
  return initials || 'U'
}

export const AssistantChatMessage: React.FC<AssistantChatMessageProps> = ({
  message,
  activityLines,
  userInfo,
  userAvatarSrc,
  onApplyDraftDirect,
  onOpenDefinitionTab,
  onRetryLast,
  canRetryLast,
  onQuickInsert,
  onQuickSubmit,
  clarifyWizard,
  onClarifyAnswerChange,
  onClarifyBack,
  onClarifyNext,
  onClarifySubmit,
  'data-testid': testId = 'assistant-message'
}) => {
  const isUser = message.role === 'user'
  const align = isUser ? 'gba:justify-end' : 'gba:justify-start'

  const wizard =
    message.kind === 'clarify' && clarifyWizard && clarifyWizard.messageId === message.id ? clarifyWizard : null

  if (message.kind === 'typing') {
    return (
      <div className={`gba:flex ${align}`} data-testid={`${testId}-typing`}>
        <Card className={`gba:w-full gba:p-3 ${bubbleBase('assistant')}`}>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>
                <Bot className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="gba:text-sm">Generating…</span>
          </div>
        </Card>
      </div>
    )
  }

  if (message.kind === 'thinking') {
    return (
      <div className={`gba:flex ${align}`} data-testid={`${testId}-thinking`}>
        <Card className={`gba:w-full gba:p-3 ${bubbleBase('assistant')}`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>
                <Bot className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="gba:text-xs gba:font-medium gba:opacity-80">Assistant</span>
          </div>

          <div className="gba:mt-1" data-testid={`${testId}-thinking-activity`}>
            <AssistantActivityLog lines={Array.isArray(activityLines) ? activityLines : []} isActive />
          </div>
        </Card>
      </div>
    )
  }

  if (message.kind === 'draft') {
    const configCount = Array.isArray(message.draft?.configKeys) ? message.draft.configKeys.length : 0
    const applied = Boolean((message as any).applied)
    const durationMs = typeof (message as any).durationMs === 'number' ? ((message as any).durationMs as number) : null
    const configHelp = Array.isArray((message.draft as any)?.configHelp)
      ? ((message.draft as any).configHelp as any[])
      : []
    const appliedHeadline = String((message.draft as any)?.appliedHeadline || '').trim()
    const keyChanges = Array.isArray((message.draft as any)?.keyChanges)
      ? (((message.draft as any).keyChanges as unknown[]) || []).map(v => String(v || '').trim()).filter(Boolean)
      : []
    const nextSteps = Array.isArray((message.draft as any)?.nextSteps)
      ? (((message.draft as any).nextSteps as unknown[]) || []).map(v => String(v || '').trim()).filter(Boolean)
      : []
    const implementationSummary = Array.isArray((message as any).implementationSummary)
      ? ((message as any).implementationSummary as string[])
      : Array.isArray((message.draft as any)?.implementationSummary)
        ? (((message.draft as any).implementationSummary as unknown[]) || [])
            .map(v => String(v || '').trim())
            .filter(Boolean)
        : []
    const changedTabs = Array.isArray((message as any).changedTabs) ? ((message as any).changedTabs as string[]) : []
    const changedTabsProvided = Array.isArray((message as any).changedTabs)
    void durationMs
    return (
      <div className={`gba:flex ${align}`} data-testid={`${testId}-draft`}>
        <Card className={`gba:w-full gba:min-w-0 gba:p-3 ${bubbleBase('assistant')}`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>
                <Bot className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <Badge variant="secondary">Assistant</Badge>
          </div>
          <div className="gba:space-y-2" data-testid={`${testId}-draft-summary`}>
            {applied ? (
              changedTabsProvided && changedTabs.length === 0 ? (
                <div
                  className="gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words"
                  data-testid={`${testId}-draft-applied-guidance`}
                >
                  No changes were applied.
                </div>
              ) : (
                <div
                  className="gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words"
                  data-testid={`${testId}-draft-applied-guidance`}
                >
                  {appliedHeadline}
                </div>
              )
            ) : (
              <>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Draft ready</div>
                <div className="gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words">
                  Source code, schemas, and {configCount} suggested config keys.
                </div>
                {message.hint ? <div className="gba:text-xs gba:text-muted-foreground">{message.hint}</div> : null}
              </>
            )}
            {keyChanges.length ? (
              <div className="gba:pb-1 gba:space-y-1" data-testid={`${testId}-draft-key-changes`}>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Key changes</div>
                <ul className="gba:list-disc gba:pl-4 gba:space-y-0.5 gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words">
                  {keyChanges.slice(0, 6).map((c, idx) => (
                    <li key={`${idx}-${c}`} className="gba:min-w-0 gba:break-words">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {applied && nextSteps.length ? (
              <div className="gba:pb-1 gba:space-y-1" data-testid={`${testId}-draft-next-steps`}>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Next steps</div>
                <ul className="gba:list-disc gba:pl-4 gba:space-y-0.5 gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words">
                  {nextSteps.slice(0, 3).map((c, idx) => (
                    <li key={`${idx}-${c}`} className="gba:min-w-0 gba:break-words">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {applied && implementationSummary.length ? (
              <div className="gba:pb-1 gba:space-y-1" data-testid={`${testId}-draft-implementation-summary`}>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Implementation summary</div>
                <ul className="gba:list-disc gba:pl-4 gba:space-y-0.5 gba:text-sm gba:text-muted-foreground gba:min-w-0 gba:break-words">
                  {implementationSummary.map((c, idx) => (
                    <li key={`${idx}-${c}`} className="gba:min-w-0 gba:break-words">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {applied ? (
              <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-draft-impl-actions`}>
                {(!changedTabsProvided || changedTabs.includes('source')) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDefinitionTab?.('source')}
                    data-testid={`${testId}-draft-open-source`}
                  >
                    Source
                  </Button>
                )}
                {(!changedTabsProvided || changedTabs.includes('inputSchema')) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDefinitionTab?.('inputSchema')}
                    data-testid={`${testId}-draft-open-input`}
                  >
                    Input schema
                  </Button>
                )}
                {(!changedTabsProvided || changedTabs.includes('outputSchema')) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDefinitionTab?.('outputSchema')}
                    data-testid={`${testId}-draft-open-output`}
                  >
                    Output schema
                  </Button>
                )}
              </div>
            ) : null}

            {configHelp.length ? (
              <div className="gba:pt-2 gba:space-y-2" data-testid={`${testId}-draft-config`}>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">Configuration</div>
                {configHelp.slice(0, 3).map(ch => (
                  <div key={String(ch.key)} className="gba:text-xs gba:text-muted-foreground">
                    <div className="gba:font-mono gba:text-[11px] gba:text-foreground">{String(ch.key)}</div>
                    {ch.description ? <div className="gba:mt-0.5">{String(ch.description)}</div> : null}
                    {ch.example ? <div className="gba:mt-0.5">Example: {String(ch.example)}</div> : null}
                    {ch.whereToFind ? <div className="gba:mt-0.5">Where: {String(ch.whereToFind)}</div> : null}
                  </div>
                ))}
                {configHelp.length > 3 ? (
                  <div className="gba:text-xs gba:text-muted-foreground">…and {configHelp.length - 3} more</div>
                ) : null}
              </div>
            ) : null}

            {applied && (!changedTabsProvided || changedTabs.includes('settings')) ? (
              <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`${testId}-draft-config-actions`}>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDefinitionTab?.('settings')}
                  data-testid={`${testId}-draft-open-settings`}
                >
                  Settings
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDefinitionTab?.('test')}
                  data-testid={`${testId}-draft-open-test`}
                >
                  Test
                </Button>
              </div>
            ) : null}

            {!applied ? (
              <div className="gba:pt-2 gba:flex gba:flex-wrap gba:gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => {
                    onApplyDraftDirect?.(message.draft)
                    onOpenDefinitionTab?.('source')
                  }}
                  data-testid={`${testId}-draft-apply`}
                >
                  Apply to editor
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDefinitionTab?.('source')}
                  data-testid={`${testId}-draft-open-source`}
                >
                  Source
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDefinitionTab?.('inputSchema')}
                  data-testid={`${testId}-draft-open-input`}
                >
                  Input schema
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDefinitionTab?.('outputSchema')}
                  data-testid={`${testId}-draft-open-output`}
                >
                  Output schema
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    )
  }

  if (message.kind === 'clarify') {
    if (wizard) {
      const q = wizard.questions[wizard.index]
      const ans = (q && wizard.answers[q.id]) || {}
      const isLast = wizard.index >= wizard.questions.length - 1
      const freeTextCfg = q && typeof (q as any).freeText === 'object' ? ((q as any).freeText as any) : null
      const optionsV2 = Array.isArray((q as any)?.optionsV2) ? ((q as any).optionsV2 as any[]) || [] : []
      const legacyOptions = Array.isArray((q as any)?.options) ? ((q as any).options as any[]) || [] : []
      const hasOptions = Boolean(optionsV2.length || legacyOptions.length)

      const selectedOptionValue = String((ans as any)?.selectedOptionValue || '').trim()
      const selectedOptionId = String((ans as any)?.selectedOptionId || '').trim()
      const selectedLegacyLabel = String((ans as any)?.selectedOption || '').trim()

      const selectedOptV2 =
        optionsV2.length && (selectedOptionValue || selectedOptionId)
          ? optionsV2.find(o => String(o?.value || '').trim() === selectedOptionValue) ||
            optionsV2.find(o => String(o?.id || '').trim() === selectedOptionId)
          : undefined

      // When optionsV2 is present, freeText conditions use option VALUES.
      // Otherwise they use legacy option labels.
      const selectedKey = optionsV2.length ? selectedOptionValue : selectedLegacyLabel
      const requiresFreeTextByOption =
        Boolean(selectedKey) &&
        Array.isArray(freeTextCfg?.requiredWhenOptionIn) &&
        freeTextCfg.requiredWhenOptionIn.some((v: any) => String(v || '').trim() === selectedKey)

      const optionRequiresText = Boolean(selectedOptV2?.freeText && selectedOptV2.freeText.required === true)
      const needsFreeText =
        !hasOptions || requiresFreeTextByOption || optionRequiresText || freeTextCfg?.required === true
      const isOptionalRequirements = String(q?.id || '') === 'requirements'
      const freeTextRequired = isOptionalRequirements
        ? false
        : requiresFreeTextByOption ||
          optionRequiresText ||
          freeTextCfg?.required === true ||
          (!hasOptions && freeTextCfg?.required !== false)

      const canContinue = (() => {
        const hasSelection = optionsV2.length ? Boolean(selectedOptionValue) : Boolean(selectedLegacyLabel)
        const hasText = Boolean(String(ans.freeText || '').trim())
        if (!hasOptions) return freeTextRequired ? hasText : true
        if (needsFreeText && freeTextRequired) return hasText
        return hasSelection
      })()
      const freeTextPlaceholder = (() => {
        const key = selectedKey
        if (selectedOptV2?.freeText?.placeholder) return String(selectedOptV2.freeText.placeholder)
        if (freeTextCfg?.placeholderByOption && key && typeof freeTextCfg.placeholderByOption[key] === 'string') {
          return String(freeTextCfg.placeholderByOption[key])
        }
        if (freeTextCfg?.placeholder && typeof freeTextCfg.placeholder === 'string')
          return String(freeTextCfg.placeholder)
        return 'Type your answer…'
      })()

      return (
        <div className={`gba:flex ${align}`} data-testid={`${testId}-clarify`}>
          <Card className={`gba:w-full gba:p-3 ${bubbleBase('assistant')}`} data-testid={`${testId}-clarify-wizard`}>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Avatar className="gba:h-6 gba:w-6">
                <AvatarFallback>
                  <Bot className="gba:h-4 gba:w-4" />
                </AvatarFallback>
              </Avatar>
              <Badge variant="secondary">Assistant</Badge>
              <span
                className="gba:text-xs gba:text-muted-foreground gba:ml-auto"
                data-testid={`${testId}-clarify-step`}
              >
                {wizard.index + 1}/{wizard.questions.length}
              </span>
            </div>

            <div className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap gba:mb-3">{message.content}</div>

            <div className="gba:space-y-2" data-testid={`${testId}-clarify-current`}>
              <div
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid={`${testId}-clarify-question`}
              >
                {q?.question}
              </div>

              {optionsV2.length ? (
                <div className="gba:grid gba:grid-cols-1 gba:gap-2" data-testid={`${testId}-clarify-options`}>
                  {optionsV2.map(opt => {
                    const label = String(opt?.label || '').trim()
                    const value = String(opt?.value || '').trim()
                    const id = String(opt?.id || '').trim()
                    if (!label || !value) return null
                    const selected = selectedOptionValue === value
                    const optNeedsText =
                      Boolean(opt?.freeText && opt.freeText.required === true) ||
                      (Array.isArray(freeTextCfg?.requiredWhenOptionIn) &&
                        freeTextCfg.requiredWhenOptionIn.some((v: any) => String(v || '').trim() === value)) ||
                      freeTextCfg?.required === true ||
                      (!hasOptions && freeTextCfg?.required !== false)
                    return (
                      <OptionCardButton
                        key={value}
                        label={label}
                        selected={selected}
                        testId={`${testId}-clarify-option-${q.id}-${value}`}
                        onClick={() => {
                          onClarifyAnswerChange?.(q.id, {
                            selectedOptionValue: value,
                            selectedOptionId: id || undefined,
                            freeText: optNeedsText ? String(ans.freeText || '') : ''
                          })
                          if (!optNeedsText) onClarifyNext?.()
                        }}
                      />
                    )
                  })}
                </div>
              ) : legacyOptions.length ? (
                <div className="gba:grid gba:grid-cols-1 gba:gap-2" data-testid={`${testId}-clarify-options`}>
                  {legacyOptions.map(optRaw => {
                    const opt = String(optRaw || '').trim()
                    if (!opt) return null
                    const selected = selectedLegacyLabel === opt
                    const optNeedsText =
                      (Array.isArray(freeTextCfg?.requiredWhenOptionIn) &&
                        freeTextCfg.requiredWhenOptionIn.some((v: any) => String(v || '').trim() === opt)) ||
                      freeTextCfg?.required === true ||
                      (!hasOptions && freeTextCfg?.required !== false)
                    return (
                      <OptionCardButton
                        key={opt}
                        label={opt}
                        selected={selected}
                        testId={`${testId}-clarify-option-${q.id}-${opt}`}
                        onClick={() => {
                          onClarifyAnswerChange?.(q.id, {
                            selectedOption: opt,
                            freeText: optNeedsText ? String(ans.freeText || '') : ''
                          })
                          if (!optNeedsText) onClarifyNext?.()
                        }}
                      />
                    )
                  })}
                </div>
              ) : null}

              {needsFreeText ? (
                <Textarea
                  value={String(ans.freeText || '')}
                  onChange={e => onClarifyAnswerChange?.(q?.id || '', { freeText: e.target.value })}
                  placeholder={freeTextPlaceholder}
                  rows={3}
                  className="gba:resize-none"
                  data-testid={`${testId}-clarify-free-text-${q?.id || 'unknown'}`}
                />
              ) : null}
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mt-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClarifyBack}
                disabled={wizard.index === 0}
                data-testid={`${testId}-clarify-back`}
              >
                Back
              </Button>

              <div className="gba:flex gba:items-center gba:gap-2">
                {!isLast ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={onClarifyNext}
                    disabled={!canContinue}
                    data-testid={`${testId}-clarify-next`}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={onClarifySubmit}
                    disabled={!canContinue}
                    data-testid={`${testId}-clarify-submit`}
                  >
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )
    }

    const submittedAnswers =
      (message as any).submittedAnswers && typeof (message as any).submittedAnswers === 'object'
        ? ((message as any).submittedAnswers as Record<
            string,
            { selectedOption?: string; freeTextPreview?: string; hasFreeText?: boolean }
          >)
        : null

    return (
      <div className={`gba:flex ${align}`} data-testid={`${testId}-clarify`}>
        <Card className={`gba:w-full gba:p-3 ${bubbleBase('assistant')}`}>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>
                <Bot className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <Badge variant="secondary">Assistant</Badge>
          </div>

          <div className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{message.content}</div>

          <div className="gba:mt-3 gba:space-y-3" data-testid={`${testId}-clarify-questions`}>
            {message.questions.map(q => (
              <div key={q.id} className="gba:space-y-2" data-testid={`${testId}-clarify-${q.id}`}>
                <div className="gba:text-sm gba:font-medium gba:text-foreground">{q.question}</div>
                {submittedAnswers ? (
                  renderSubmittedClarifyAnswer(q, submittedAnswers[q.id], testId)
                ) : q.options?.length ? (
                  <div className="gba:grid gba:grid-cols-1 gba:gap-2">
                    {q.options.map(opt => (
                      <OptionCardButton
                        key={opt}
                        label={opt}
                        testId={`${testId}-clarify-${q.id}-${opt}`}
                        onClick={() => {
                          const text = `${q.id}: ${opt}`
                          if (onQuickSubmit) onQuickSubmit(text)
                          else onQuickInsert?.(text)
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const icon = isUser ? <User className="gba:h-4 gba:w-4" /> : <Bot className="gba:h-4 gba:w-4" />
  const label = message.role === 'system' ? 'System' : isUser ? 'You' : 'Assistant'

  if (message.kind === 'error') {
    return (
      <div className="gba:flex gba:justify-start" data-testid={`${testId}-error`}>
        <Card className="gba:w-full gba:p-3 gba:border gba:border-destructive/30 gba:bg-destructive/10 gba:text-destructive">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>
                <Bot className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <Badge variant="destructive">Error</Badge>
          </div>
          <div className="gba:text-sm">{message.content}</div>
          {onRetryLast ? (
            <div className="gba:mt-2 gba:flex gba:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetryLast}
                disabled={!canRetryLast}
                data-testid={`${testId}-error-retry`}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    )
  }

  return (
    <div className={`gba:flex ${align}`} data-testid={`${testId}-${message.role}`}>
      <Card className={`gba:w-full gba:min-w-0 gba:p-3 ${bubbleBase(message.role)}`}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          {isUser ? (
            <Avatar className="gba:h-6 gba:w-6">
              {userAvatarSrc ? <AvatarImage src={userAvatarSrc} alt="User avatar" /> : null}
              <AvatarFallback>{getUserInitials(userInfo)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="gba:h-6 gba:w-6">
              <AvatarFallback>{icon}</AvatarFallback>
            </Avatar>
          )}
          <span className="gba:text-xs gba:font-medium gba:opacity-80">{label}</span>
        </div>
        {isUser && message.kind === 'text' ? (
          (() => {
            const items = parseRequirementsSummary(message.content)
            if (!items) return <div className="gba:text-sm gba:whitespace-pre-wrap">{message.content}</div>
            const title = getUserSummaryTitle(items)
            return (
              <div className="gba:space-y-2" data-testid={`${testId}-user-requirements`}>
                <div className="gba:text-[11px] gba:font-medium gba:opacity-90">{title}</div>
                {items.map(it => (
                  <div key={it.label} className="gba:space-y-0.5">
                    <div className="gba:text-[11px] gba:opacity-80">{it.label}</div>
                    <div className="gba:text-sm gba:leading-snug">{it.value}</div>
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
          <div className="gba:text-sm gba:whitespace-pre-wrap">{message.content}</div>
        )}
      </Card>
    </div>
  )
}

export default AssistantChatMessage
