import { useState, useEffect, useRef } from 'react'
import {
  ArrowsClockwise,
  Brain,
  ChartPieSlice,
  CurrencyDollar,
  MagnifyingGlass,
  Plus,
  Users,
  X
} from '@phosphor-icons/react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { ChatInput } from '../chat/ChatInput'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'

interface AgentPickerScreenProps {
  accessToken: string
  onSubmit: (task: string, config: SessionConfig) => void | Promise<unknown>
  onReply: (message: string) => void | Promise<unknown>
  onOpenMemory?: () => void
}

function getDomainIcon(domain: string, tags: string[]) {
  const combined = `${domain} ${tags.join(' ')}`.toLowerCase()
  if (/financ|revenue|budget|accounting|cost/.test(combined)) return CurrencyDollar
  if (/hr|human.resource|people|employee|leave|benefit/.test(combined)) return Users
  if (/strateg|analys|insight|synthesiz|intelligence/.test(combined)) return ChartPieSlice
  if (/workflow|automat|operations|process|orchestrat/.test(combined)) return ArrowsClockwise
  if (/market|research|competit|discover/.test(combined)) return MagnifyingGlass
  return Brain
}

const EMPTY_FORM = {
  display_name: '',
  domain: '',
  description: '',
  system_prompt: '',
  tags: ''
}

export const AgentPickerScreen = ({ accessToken, onSubmit, onReply, onOpenMemory }: AgentPickerScreenProps) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [agents, setAgents] = useState<SpecialistAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | undefined>(undefined)

  // Create-agent modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const loadAgents = () => {
    setLoading(true)
    client
      .listSpecialistAgents()
      .then(data => setAgents((data ?? []).filter(a => a.is_active !== false)))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (showModal) {
      setTimeout(() => firstFieldRef.current?.focus(), 50)
    }
  }, [showModal])

  const handleSelectAgent = (agent: SpecialistAgent) => {
    setSelectedAgent(prev => (prev?.name === agent.name ? undefined : agent))
  }

  const handleOpenModal = () => {
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    const name = form.display_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
    if (!name || !form.description) {
      setSaveError('Name and description are required.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      await client.createSpecialistAgent({
        name,
        display_name: form.display_name.trim(),
        description: form.description.trim(),
        domain: form.domain.trim(),
        system_prompt: form.system_prompt.trim(),
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
      })
      setShowModal(false)
      loadAgents()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(msg.includes('409') ? 'An agent with this name already exists.' : 'Failed to create agent.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:relative" data-testid="enterprise-agent-picker">
      {/* Scrollable content area */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-6 gba:pt-10 gba:pb-6">
        {/* Title row */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-1.5">
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">Choose AI agent</h2>
          <Button
            size="sm"
            variant="outline"
            className="gba:gap-1.5 gba:shrink-0 gba:ml-4 gba:mt-0.5"
            onClick={handleOpenModal}
            data-testid="enterprise-agent-new-agent-btn"
          >
            <Plus className="gba:h-3.5 gba:w-3.5" />
            New Agent
          </Button>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-8 gba:max-w-xl gba:leading-relaxed">
          Start with the right context. Each agent is designed for a specific business domain, so answers stay accurate
          and relevant.
        </p>

        {loading ? (
          <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="gba:h-32 gba:rounded-2xl gba:border gba:border-border gba:bg-muted/30 gba:animate-pulse"
              />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="gba:text-center gba:py-12 gba:text-sm gba:text-muted-foreground">
            No specialist agents yet.{' '}
            <button className="gba:underline gba:text-primary" onClick={handleOpenModal}>
              Create one
            </button>{' '}
            to get started.
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
            {agents.map(agent => {
              const Icon = getDomainIcon(agent.domain, agent.tags)
              const isSelected = selectedAgent?.name === agent.name
              return (
                <button
                  key={agent.name}
                  onClick={() => handleSelectAgent(agent)}
                  data-testid={`agent-card-${agent.name}`}
                  className={[
                    'gba:text-left gba:rounded-2xl gba:border gba:p-4 gba:transition-all gba:group gba:flex gba:flex-col gba:gap-2.5',
                    isSelected
                      ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary'
                      : 'gba:border-border gba:bg-background gba:hover:border-primary/50 gba:hover:bg-muted/30'
                  ].join(' ')}
                >
                  <div
                    className={[
                      'gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-xl gba:transition-colors',
                      isSelected
                        ? 'gba:bg-primary/15 gba:text-primary'
                        : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-primary/10 gba:group-hover:text-primary'
                    ].join(' ')}
                  >
                    <Icon className="gba:h-4 gba:w-4" weight="duotone" />
                  </div>

                  <div>
                    <p
                      className={[
                        'gba:text-sm gba:font-semibold gba:leading-tight gba:mb-1',
                        isSelected ? 'gba:text-primary' : 'gba:text-foreground'
                      ].join(' ')}
                    >
                      {agent.display_name}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed gba:line-clamp-3">
                      {agent.description}
                    </p>
                  </div>

                  {agent.domain && (
                    <span className="gba:mt-auto gba:inline-flex gba:self-start gba:text-[10px] gba:font-medium gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted gba:text-muted-foreground">
                      {agent.domain}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Input anchored to bottom */}
      <ChatInput
        onSubmit={onSubmit}
        disabled={false}
        isRunning={false}
        onStop={() => undefined}
        onReply={onReply}
        onOpenMemory={onOpenMemory}
        selectedAgent={selectedAgent}
        onClearAgent={() => setSelectedAgent(undefined)}
      />

      {/* Create Agent Modal */}
      {showModal && (
        <div
          className="gba:absolute gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:z-50 gba:flex gba:items-center gba:justify-center gba:p-6"
          data-testid="enterprise-agent-create-modal"
          onClick={e => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="gba:bg-background gba:border gba:border-border gba:rounded-2xl gba:shadow-xl gba:w-full gba:max-w-lg gba:flex gba:flex-col gba:max-h-[90vh]">
            {/* Modal header */}
            <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-4 gba:border-b gba:border-border gba:shrink-0">
              <h3 className="gba:text-base gba:font-semibold gba:text-foreground">New Specialist Agent</h3>
              <button
                onClick={() => setShowModal(false)}
                className="gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                data-testid="enterprise-agent-create-modal-close"
              >
                <X className="gba:h-4 gba:w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="gba:flex-1 gba:overflow-y-auto gba:p-5 gba:space-y-4">
              {/* Name */}
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1.5">
                  Name <span className="gba:text-destructive">*</span>
                </label>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="e.g. HR Policy Expert"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/50"
                  data-testid="create-agent-name"
                />
                {form.display_name && (
                  <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                    ID:{' '}
                    <span className="gba:font-mono">
                      {form.display_name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_|_$/g, '')}
                    </span>
                  </p>
                )}
              </div>

              {/* Domain */}
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1.5">
                  Domain / Topic
                </label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g. Human Resources"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/50"
                  data-testid="create-agent-domain"
                />
              </div>

              {/* Description */}
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1.5">
                  Description <span className="gba:text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this agent help with?"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/50"
                  data-testid="create-agent-description"
                />
              </div>

              {/* System prompt */}
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1.5">
                  System Prompt
                </label>
                <Textarea
                  value={form.system_prompt}
                  onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                  placeholder="You are an expert in… Always respond with… Structure answers as…"
                  rows={4}
                  className="gba:resize-none gba:text-sm gba:rounded-lg"
                  data-testid="create-agent-system-prompt"
                />
                <p className="gba:text-[10px] gba:text-muted-foreground/60 gba:mt-1">
                  Defines the agent's persona, expertise, and response style.
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="gba:block gba:text-xs gba:font-medium gba:text-foreground gba:mb-1.5">Tags</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="hr, policy, leave (comma-separated)"
                  className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/50"
                  data-testid="create-agent-tags"
                />
              </div>

              {saveError && (
                <p className="gba:text-xs gba:text-destructive gba:bg-destructive/10 gba:rounded-lg gba:px-3 gba:py-2">
                  {saveError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-5 gba:py-4 gba:border-t gba:border-border gba:shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                disabled={saving}
                data-testid="create-agent-cancel"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={saving || !form.display_name.trim() || !form.description.trim()}
                data-testid="create-agent-submit"
              >
                {saving ? 'Creating…' : 'Create Agent'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
