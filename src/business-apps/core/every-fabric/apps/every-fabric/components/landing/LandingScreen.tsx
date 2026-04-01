import { CaretDown, Check, ClockCounterClockwise, Sparkle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { FabricInput } from './FabricInput'
import { SuggestionChips } from './SuggestionChips'

interface LandingScreenProps {
  accessToken: string
  onStartSession: (task: string, config: SessionConfig) => void | Promise<unknown>
  onOpenHistory: () => void
}

// ─── Radial glow background (CSS-in-JS since Tailwind can't express this) ────

const GlowStyle: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      top: '35%',
      left: '50%',
      transform: 'translate(-50%, -55%)',
      width: 700,
      height: 700,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(var(--fabric-glow, 99 102 241) / 0.07) 0%, transparent 68%)',
      pointerEvents: 'none'
    }}
  />
)

// ─── Pulsing status dot ────────────────────────────────────────────────────────

const PulseDot: React.FC = () => (
  <span className="gba:relative gba:flex gba:h-1.5 gba:w-1.5 gba:shrink-0">
    <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-green-400 gba:opacity-75" />
    <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-1.5 gba:w-1.5 gba:bg-green-500" />
  </span>
)

// ─── Main component ───────────────────────────────────────────────────────────

export const LandingScreen: React.FC<LandingScreenProps> = ({ accessToken, onStartSession, onOpenHistory }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [inputValue, setInputValue] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | undefined>(undefined)
  const [agents, setAgents] = useState<SpecialistAgent[]>([])
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false)

  useEffect(() => {
    client
      .listSpecialistAgents()
      .then(data => setAgents((data ?? []).filter(agent => agent.is_active !== false)))
      .catch(() => setAgents([]))
  }, [client])

  const handleChipSelect = (prompt: string) => {
    setInputValue(prompt)
  }

  // FabricInput is self-contained — we use its onSubmit to trigger the session.
  // The chip selection sets the initial value, which we surface via a controlled
  // textarea approach by re-rendering with a key trick isn't needed — instead we
  // pass the prefillValue and let FabricInput manage its own state after prefill.

  return (
    <div
      className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:bg-background gba:overflow-hidden"
      data-testid="fabric-landing"
    >
      <div className="gba:absolute gba:top-5 gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:z-20">
        <button
          onClick={onOpenHistory}
          className="gba:inline-flex gba:items-center gba:gap-2 gba:h-10 gba:px-4 gba:rounded-full gba:border gba:border-border/70 gba:bg-card/95 gba:text-sm gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card gba:transition-colors"
          data-testid="fabric-landing-history-button"
        >
          <ClockCounterClockwise className="gba:h-4 gba:w-4" />
          History
        </button>
      </div>

      <GlowStyle />

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
        <div className="gba:min-h-full gba:px-6 gba:py-12">
          <div className="gba:mx-auto gba:flex gba:min-h-[calc(100vh-6rem)] gba:w-full gba:max-w-[58rem] gba:flex-col gba:items-center">
            <div className="gba:flex-[0.84] gba:flex gba:flex-col gba:items-center gba:justify-end gba:pb-6">
              <div className="gba:inline-flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:border gba:border-border gba:bg-card gba:text-xs gba:font-medium gba:text-muted-foreground gba:shadow-sm">
                <PulseDot />
                Every Fabric — Autonomous Agent
              </div>

              <div className="gba:mt-5 gba:text-center gba:space-y-2">
                <h1 className="gba:text-[3rem] sm:gba:text-[3.5rem] gba:font-semibold gba:tracking-[-0.04em] gba:text-foreground gba:leading-[0.98]">
                  What would you like to do?
                </h1>
                <p className="gba:text-base gba:text-muted-foreground/78">
                  Assign a task, ask anything, or continue a workflow.
                </p>
              </div>
            </div>

            <div className="gba:relative gba:w-full gba:max-w-[46rem] gba:overflow-visible">
              <FabricInput
                variant="landing"
                onSubmit={onStartSession}
                prefillValue={inputValue}
                selectedAgent={selectedAgent}
                onClearAgent={() => setSelectedAgent(undefined)}
                autoFocus
              />

              {agents.length > 0 && (
                <div className="gba:absolute gba:top-4 gba:right-5 gba:z-20">
                  <button
                    onClick={() => setIsAgentMenuOpen(open => !open)}
                    className="gba:inline-flex gba:h-9 gba:items-center gba:gap-2 gba:rounded-full gba:border gba:border-border/75 gba:bg-card/96 gba:px-3.5 gba:text-sm gba:text-muted-foreground gba:shadow-[0_6px_18px_rgba(15,23,42,0.04)] gba:transition-colors gba:hover:bg-card gba:hover:text-foreground"
                    data-testid="fabric-landing-agent-menu"
                  >
                    <Sparkle className="gba:h-4 gba:w-4" />
                    {selectedAgent ? selectedAgent.display_name : 'Experts'}
                    <CaretDown className="gba:h-3.5 gba:w-3.5" />
                  </button>

                  <div
                    className={`gba:absolute gba:top-0 gba:z-30 gba:w-[18.5rem] gba:max-w-[calc(100vw-2rem)] gba:rounded-[1.25rem] gba:border gba:border-border/75 gba:bg-card/98 gba:shadow-[0_14px_32px_rgba(15,23,42,0.06)] gba:transition-all ${
                      isAgentMenuOpen
                        ? 'gba:opacity-100 gba:translate-y-0 gba:pointer-events-auto'
                        : 'gba:opacity-0 gba:translate-y-1 gba:pointer-events-none'
                    }`}
                    style={{ left: 'calc(100% + 1.5rem)', top: '-0.25rem' }}
                    data-testid="fabric-landing-agent-menu-panel"
                  >
                    <div className="gba:max-h-64 gba:overflow-y-auto gba:p-2">
                      {agents.map(agent => {
                        const isSelected = selectedAgent?.name === agent.name

                        return (
                          <button
                            key={agent.name}
                            onClick={() => {
                              setSelectedAgent(isSelected ? undefined : agent)
                              setIsAgentMenuOpen(false)
                            }}
                            className={`gba:flex gba:w-full gba:items-start gba:justify-between gba:gap-3 gba:rounded-[1rem] gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors ${
                              isSelected ? 'gba:bg-muted/70' : 'gba:hover:bg-muted/45'
                            }`}
                            data-testid={`fabric-landing-agent-option-${agent.name}`}
                          >
                            <div className="gba:min-w-0">
                              <p className="gba:text-sm gba:font-medium gba:text-foreground">{agent.display_name}</p>
                              <p className="gba:mt-0.5 gba:line-clamp-2 gba:text-xs gba:leading-5 gba:text-muted-foreground">
                                {agent.description}
                              </p>
                            </div>
                            {isSelected && <Check className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-foreground" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="gba:flex-[1.16] gba:flex gba:w-full gba:flex-col gba:items-center gba:pt-5 gba:overflow-visible">
              <div className="gba:w-full gba:max-w-[46rem] gba:flex gba:flex-col gba:gap-4">
                <SuggestionChips onSelect={handleChipSelect} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
