import React, { useMemo } from 'react'
import {
  Label,
  Textarea,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@newwork/nw-design-system'
import { MessageSquare, BookOpen, Quote, Variable, GitBranch, Plus, Trash2 } from 'lucide-react'
import type { TabProps } from './types'
import type { ResponseStyle, CitationMode } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const RESPONSE_STYLES: { value: ResponseStyle; label: string; description: string }[] = [
  { value: 'conversational', label: 'Conversational', description: 'Friendly and approachable' },
  { value: 'formal', label: 'Formal', description: 'Professional and structured' },
  { value: 'technical', label: 'Technical', description: 'Detailed and precise' }
]

const CITATION_MODES: { value: CitationMode; label: string; description: string }[] = [
  { value: 'always', label: 'Always', description: 'Include citations in every response' },
  { value: 'when_needed', label: 'When Needed', description: 'Include citations when referencing sources' },
  { value: 'never', label: 'Never', description: 'Do not include citations' }
]

export const BehaviorTab: React.FC<TabProps> = ({ state, actions }) => {
  const isDecision = state.agentType === 'decision'

  // Extract parameters from templates (variables like {customerName})
  const extractParameters = (content: string): string[] => {
    const params = new Set<string>()
    const pattern = /\{(\w+)\}/g
    let match
    while ((match = pattern.exec(content)) !== null) {
      params.add(match[1])
    }
    return Array.from(params).sort()
  }

  const userParams = useMemo(() => extractParameters(state.userContent), [state.userContent])
  const systemParams = useMemo(() => extractParameters(state.systemContent), [state.systemContent])

  return (
    <div className="gba:space-y-6" data-testid="agent-builder-behavior-tab">
      {/* Goal / User Prompt */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <MessageSquare className="gba:w-5 gba:h-5" />
            {isDecision ? 'Decision instructions' : 'Goal'}
          </CardTitle>
          <CardDescription>
            {isDecision
              ? 'Tell the Decision Expert how to decide and when to escalate.'
              : 'Define what the agent should accomplish'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          <Label>
            {isDecision ? 'How should this Decision Expert decide?' : 'What should this agent do?'}{' '}
            <span className="gba:text-destructive">*</span>
          </Label>
          <Textarea
            rows={isDecision ? 6 : 4}
            value={state.userContent}
            onChange={e => actions.setUserContent(e.target.value)}
            placeholder={
              isDecision
                ? 'Using the linked policy, choose the decision option that best matches the request category defined in the policy.\n\n{context}'
                : 'Describe what you want the agent to accomplish. Use {variableName} for dynamic values.'
            }
            data-testid="agent-builder-user-content"
          />
          {isDecision ? (
            <p className="gba:text-xs gba:text-muted-foreground">
              Required placeholder: <span className="gba:font-mono">{'{context}'}</span>. Decision options are
              configured below and included in System Instructions.
            </p>
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground">
              Use curly braces for variables, e.g., {'{customerName}'} or {'{question}'}
            </p>
          )}

          {userParams.length > 0 && (
            <div className="gba:pt-2 gba:space-y-2" data-testid="agent-builder-goal-detected-variables">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Variable className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">
                  {isDecision ? 'Detected placeholders' : 'Detected variables'}
                </span>
                <Badge variant="secondary">{userParams.length}</Badge>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {userParams.map(param => (
                  <div
                    key={`goal-${param}`}
                    className="gba:px-3 gba:py-1.5 gba:bg-muted gba:rounded-lg gba:text-sm gba:font-mono"
                  >
                    {'{' + param + '}'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Expert: allowed options */}
      {isDecision && (
        <Card className="gba:!bg-background">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <GitBranch className="gba:w-5 gba:h-5" />
              Decision options
            </CardTitle>
            <CardDescription>Define the allowed decision results for branching</CardDescription>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <p className="gba:text-xs gba:text-muted-foreground">
              These values are enforced by the response schema as{' '}
              <span className="gba:font-mono">decisionResult.enum</span>. The generated schema also requires{' '}
              <span className="gba:font-mono">reasoning</span>, <span className="gba:font-mono">escalate</span>, and{' '}
              <span className="gba:font-mono">confidence</span>.
            </p>

            <div className="gba:flex gba:flex-col gba:gap-2" data-testid="agent-builder-decision-options">
              {state.decisionOptions.map((opt, idx) => (
                <div key={idx} className="gba:flex gba:items-center gba:gap-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const next = [...(state.decisionOptions || [])]
                      next[idx] = e.target.value
                      actions.setDecisionOptions(next)
                    }}
                    placeholder={idx === 0 ? 'e.g. approve' : 'e.g. reject'}
                    data-testid={`agent-builder-decision-option-${idx}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = state.decisionOptions.filter((_, i) => i !== idx)
                      actions.setDecisionOptions(next)
                    }}
                    data-testid={`agent-builder-decision-option-remove-${idx}`}
                    disabled={state.decisionOptions.length <= 1}
                  >
                    <Trash2 className="gba:h-4 gba:w-4" />
                  </Button>
                </div>
              ))}

              <div className="gba:flex gba:items-center gba:justify-between gba:pt-1">
                <p className="gba:text-xs gba:text-muted-foreground">
                  Add at least one option. Options must be unique.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => actions.setDecisionOptions([...(state.decisionOptions || []), ''])}
                  data-testid="agent-builder-decision-option-add"
                >
                  <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
                  Add option
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Instructions */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BookOpen className="gba:w-5 gba:h-5" />
            System Instructions
          </CardTitle>
          <CardDescription>
            {isDecision ? 'Generated system rules (read-only)' : 'Define the agent personality and constraints'}
          </CardDescription>
        </CardHeader>
        <CardContent className="gba:space-y-2">
          <Textarea
            rows={6}
            value={state.systemContent}
            onChange={e => {
              if (!isDecision) actions.setSystemContent(e.target.value)
            }}
            readOnly={isDecision}
            placeholder={
              isDecision
                ? undefined
                : 'Optional: Provide context, personality, constraints, or specific instructions for the agent.'
            }
            data-testid="agent-builder-system-content"
          />

          {!isDecision && systemParams.length > 0 && (
            <div className="gba:pt-2 gba:space-y-2" data-testid="agent-builder-system-detected-variables">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Variable className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">Detected variables</span>
                <Badge variant="secondary">{systemParams.length}</Badge>
              </div>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {systemParams.map(param => (
                  <div
                    key={`system-${param}`}
                    className="gba:px-3 gba:py-1.5 gba:bg-muted gba:rounded-lg gba:text-sm gba:font-mono"
                  >
                    {'{' + param + '}'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Style (EveryAI only) */}
      {state.agentType === 'everyai' && (
        <Card className="gba:!bg-background">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Quote className="gba:w-5 gba:h-5" />
              Response Style
            </CardTitle>
            <CardDescription>How should the agent communicate?</CardDescription>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-3 gba:gap-3">
              {RESPONSE_STYLES.map(style => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => actions.setResponseStyle(style.value)}
                  className={`gba:p-3 gba:rounded-lg gba:border-2 gba:text-left gba:transition-all ${
                    state.responseStyle === style.value
                      ? 'gba:border-primary gba:bg-primary/5'
                      : 'gba:border-border gba:hover:border-primary/50 gba:hover:bg-muted/50'
                  }`}
                  data-testid={`agent-builder-style-${style.value}`}
                >
                  <div className="gba:font-semibold gba:text-sm">{style.label}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{style.description}</div>
                </button>
              ))}
            </div>

            <div className="gba:space-y-2">
              <Label>Citation Mode</Label>
              <Select value={state.citationMode} onValueChange={v => actions.setCitationMode(v as CitationMode)}>
                <SelectTrigger data-testid="agent-builder-citation-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITATION_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label} - {mode.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BehaviorTab
