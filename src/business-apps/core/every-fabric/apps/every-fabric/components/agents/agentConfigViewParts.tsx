import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { CheckCircleIcon, SpinnerGapIcon, WarningCircleIcon, WrenchIcon, XCircleIcon } from '@phosphor-icons/react'
import {
  evaluateAgentCompliance,
  evaluateDescription,
  evaluateSystemPrompt,
  DESCRIPTION_MIN_LENGTH,
  SYSTEM_PROMPT_MIN_LENGTH,
  type ComplianceLevel
} from './agentStandard'
import { isImageAvatar, resolveAgentInitial } from './agentAvatarUtils'

const ComplianceSignalChip: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span
    className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${
      ok ? 'gba:bg-emerald-100 gba:text-emerald-700' : 'gba:bg-muted gba:text-muted-foreground'
    }`}
  >
    {ok ? (
      <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
    ) : (
      <WarningCircleIcon className="gba:h-3 gba:w-3" />
    )}
    {label}
  </span>
)

export const AgentAvatarPreview: React.FC<{
  avatar: string | null | undefined
  label: string
  className?: string
}> = ({ avatar, label, className = '' }) => (
  <div
    className={`gba:flex gba:shrink-0 gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-muted gba:text-sm gba:font-semibold gba:text-muted-foreground ${className}`}
  >
    {isImageAvatar(avatar) ? (
      <img src={avatar} alt={`${label} avatar`} className="gba:h-full gba:w-full gba:object-cover" />
    ) : (
      resolveAgentInitial(label)
    )}
  </div>
)

export const SaveButtonContent: React.FC<{ saving: boolean; saved: boolean; label: string }> = ({
  saving,
  saved,
  label
}) => {
  if (saving) {
    return (
      <>
        <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />
        Saving…
      </>
    )
  }
  if (saved) {
    return (
      <>
        <CheckCircleIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" weight="fill" />
        Saved
      </>
    )
  }
  return <>{label}</>
}

export const AvatarGenerateButtonContent: React.FC<{ avatarGenerating: boolean; hasAvatar: boolean }> = ({
  avatarGenerating,
  hasAvatar
}) => {
  if (avatarGenerating) {
    return (
      <>
        <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />
        Generating…
      </>
    )
  }
  if (hasAvatar) return <>Regenerate</>
  return <>Generate avatar</>
}

const LEVEL_STYLES: Record<ComplianceLevel, { wrap: string; title: string; text: string }> = {
  pass: {
    wrap: 'gba:border-emerald-500/30 gba:bg-emerald-500/5',
    title: 'Meets the Agent Authoring Standard',
    text: 'gba:text-emerald-700'
  },
  warn: {
    wrap: 'gba:border-amber-500/30 gba:bg-amber-500/5',
    title: 'Almost there — a few improvements recommended',
    text: 'gba:text-amber-700'
  },
  fail: {
    wrap: 'gba:border-destructive/30 gba:bg-destructive/5',
    title: 'This agent is incomplete and may not work',
    text: 'gba:text-destructive'
  }
}

export const DescriptionSignals: React.FC<{ signals: ReturnType<typeof evaluateDescription> }> = ({ signals }) => {
  const chips: Array<{ ok: boolean; label: string }> = [
    { ok: signals.meetsMinimum, label: `At least ${DESCRIPTION_MIN_LENGTH} chars` },
    { ok: signals.notJustName, label: 'More than the name' },
    { ok: signals.isSpecific, label: 'Specific' }
  ]
  return (
    <div className="gba:mt-2 gba:space-y-1.5" data-testid="description-signals">
      {!signals.isValid && (
        <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:font-medium gba:text-destructive">
          <WarningCircleIcon className="gba:h-3.5 gba:w-3.5" />A real description is required — it&apos;s how this agent
          gets discovered and chosen.
        </p>
      )}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <span className={`gba:text-xs ${signals.meetsMinimum ? 'gba:text-muted-foreground' : 'gba:text-amber-700'}`}>
          {signals.length} chars{signals.meetsMinimum ? '' : ` (min ${DESCRIPTION_MIN_LENGTH})`}
        </span>
        {chips.map(chip => (
          <ComplianceSignalChip key={chip.label} ok={chip.ok} label={chip.label} />
        ))}
      </div>
    </div>
  )
}

export const SystemPromptSignals: React.FC<{ value: string }> = ({ value }) => {
  const signals = evaluateSystemPrompt(value)
  const belowMin = signals.length < SYSTEM_PROMPT_MIN_LENGTH
  const chips: Array<{ ok: boolean; label: string }> = [
    { ok: signals.hasIdentity, label: 'Identity ("You are …")' },
    { ok: signals.hasConstraints, label: 'Constraints (MUST / NEVER)' },
    { ok: signals.isSubstantial, label: 'Enough detail' }
  ]
  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="system-prompt-signals">
      <span className={`gba:text-xs ${belowMin ? 'gba:text-amber-700' : 'gba:text-muted-foreground'}`}>
        {signals.length} chars{belowMin ? ` (min ${SYSTEM_PROMPT_MIN_LENGTH})` : ''}
      </span>
      {chips.map(chip => (
        <ComplianceSignalChip key={chip.label} ok={chip.ok} label={chip.label} />
      ))}
    </div>
  )
}

export const SystemPromptConfigPanel: React.FC<{
  detailsLoading: boolean
  detailAvailable: boolean
  systemPrompt: string | null
  systemPromptError: string | null
  systemPromptDirty: boolean
  systemPromptSaving: boolean
  systemPromptSaved: boolean
  onSystemPromptChange: (value: string) => void
  onResetSystemPrompt: () => void
  onSaveSystemPrompt: () => void
}> = ({
  detailsLoading,
  detailAvailable,
  systemPrompt,
  systemPromptError,
  systemPromptDirty,
  systemPromptSaving,
  systemPromptSaved,
  onSystemPromptChange,
  onResetSystemPrompt,
  onSaveSystemPrompt
}) => {
  if (detailsLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
        <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
      </div>
    )
  }

  if (detailAvailable) {
    return (
      <div className="gba:flex gba:flex-col gba:gap-2">
        <textarea
          value={systemPrompt ?? ''}
          onChange={e => onSystemPromptChange(e.target.value)}
          rows={14}
          spellCheck={false}
          placeholder={
            'You are <name>, an expert in <domain>. Your mission is to ...\n\n' +
            'Capabilities:\n- ...\n\nConstraints:\n- IMPORTANT: You MUST ...\n- You NEVER ...\n\nOutput:\n- ...'
          }
          className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4 gba:text-sm gba:text-foreground gba:font-mono gba:leading-relaxed gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
          data-testid="agent-config-system-prompt-input"
        />

        <SystemPromptSignals value={systemPrompt ?? ''} />

        {systemPromptError && (
          <div
            className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive"
            data-testid="system-prompt-error"
          >
            {systemPromptError}
          </div>
        )}

        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:pt-1">
          {systemPromptDirty && (
            <button
              type="button"
              onClick={onResetSystemPrompt}
              disabled={systemPromptSaving}
              className="gba:text-sm gba:text-muted-foreground gba:hover:text-foreground gba:disabled:opacity-50"
              data-testid="system-prompt-reset"
            >
              Reset
            </button>
          )}
          <Button
            size="sm"
            onClick={onSaveSystemPrompt}
            disabled={!systemPromptDirty || systemPromptSaving}
            data-testid="system-prompt-save"
          >
            <SaveButtonContent
              saving={systemPromptSaving}
              saved={systemPromptSaved && !systemPromptDirty}
              label="Save System Prompt"
            />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <p
      className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3 gba:text-sm gba:text-muted-foreground"
      data-testid="agent-config-system-prompt-unavailable"
    >
      This agent&apos;s system prompt isn&apos;t editable here. Its core instructions are managed by the runtime;
      Worker-specific operating rules live under Activation → Autonomy.
    </p>
  )
}

const CheckIcon: React.FC<{ level: ComplianceLevel }> = ({ level }) => {
  if (level === 'pass')
    return <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-emerald-600 gba:shrink-0" weight="fill" />
  if (level === 'warn') return <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-amber-600 gba:shrink-0" />
  return <XCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive gba:shrink-0" />
}

export const ComplianceBanner: React.FC<{ compliance: ReturnType<typeof evaluateAgentCompliance> }> = ({
  compliance
}) => {
  const style = LEVEL_STYLES[compliance.level]
  return (
    <section
      className={`gba:rounded-xl gba:border gba:p-4 ${style.wrap}`}
      data-testid="agent-config-compliance"
      data-level={compliance.level}
    >
      <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between">
        <h2 className={`gba:text-sm gba:font-semibold ${style.text}`}>{style.title}</h2>
        <span className="gba:text-xs gba:text-muted-foreground">
          {compliance.passed}/{compliance.total} checks
        </span>
      </div>
      <ul className="gba:space-y-2">
        {compliance.checks.map(check => (
          <li key={check.id} className="gba:flex gba:items-start gba:gap-2">
            <CheckIcon level={check.level} />
            <div className="gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:text-foreground">{check.label}</p>
              <p className="gba:text-xs gba:text-muted-foreground">{check.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const ConfigFormError: React.FC<{ message: string; 'data-testid'?: string }> = ({
  message,
  'data-testid': dataTestId
}) => (
  <div
    className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:p-3 gba:text-sm gba:text-destructive gba:mb-3"
    data-testid={dataTestId}
  >
    {message}
  </div>
)

export const ConfigSkillBuiltInBadge: React.FC = () => (
  <span className="gba:shrink-0 gba:rounded gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
    Built-in
  </span>
)

export const ConfigSkillToolRefs: React.FC<{ toolRefs?: string[] }> = ({ toolRefs }) => {
  if (!toolRefs || toolRefs.length === 0) return null
  return (
    <div className="gba:mt-2 gba:ml-6.5 gba:flex gba:flex-wrap gba:gap-1.5">
      {toolRefs.map(tool => (
        <span
          key={tool}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-xs gba:text-muted-foreground"
        >
          <WrenchIcon className="gba:h-3 gba:w-3" />
          {tool}
        </span>
      ))}
    </div>
  )
}
