import { CaretDownIcon, CheckIcon, ClockCounterClockwiseIcon, GearIcon, PackageIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { SessionConfig, EnterpriseSkill } from '../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { useFabricConnectors } from '../../hooks/useFabricConnectors'
import { SETTINGS_KEY } from '../settings/agentSettings.types'
import { FabricInput } from './FabricInput'
import { ConnectorPickerSheet } from '../connectors/ConnectorPickerSheet'

interface LandingScreenProps {
  accessToken: string
  onStartSession: (
    task: string,
    config: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string
  ) => void | Promise<unknown>
  onOpenHistory: () => void
  onOpenSettings: () => void
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

// ─── Main component ───────────────────────────────────────────────────────────

export const LandingScreen: React.FC<LandingScreenProps> = ({
  accessToken,
  onStartSession,
  onOpenHistory,
  onOpenSettings
}) => {
  const client = useEnterpriseAgentClient(accessToken)
  const {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading: isLoadingConnectors
  } = useFabricConnectors(accessToken)
  const [selectedSkill, setSelectedSkill] = useState<EnterpriseSkill | undefined>(undefined)
  const [skills, setSkills] = useState<EnterpriseSkill[]>([])
  const [isSkillMenuOpen, setIsSkillMenuOpen] = useState(false)
  const [isConnectorSheetOpen, setIsConnectorSheetOpen] = useState(false)
  const skillMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    client
      .listEnterpriseSkills()
      .then(data => {
        const active = (data ?? []).filter(skl => skl.is_active !== false)
        setSkills(active)

        // Pre-select the default skill from settings (if configured and not already chosen)
        if (!selectedSkill && active.length > 0) {
          try {
            const raw = localStorage.getItem(SETTINGS_KEY)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed.defaultSkillId) {
                const match = active.find(s => s.skill_id === parsed.defaultSkillId)
                if (match) setSelectedSkill(match)
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      })
      .catch(() => setSkills([]))
  }, [client])

  useEffect(() => {
    if (!isSkillMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (skillMenuRef.current && !skillMenuRef.current.contains(event.target as Node)) {
        setIsSkillMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSkillMenuOpen])

  return (
    <div
      className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:bg-background gba:overflow-hidden"
      data-testid="fabric-landing"
    >
      <div className="gba:absolute gba:top-5 gba:right-4 sm:gba:right-6 lg:gba:right-8 gba:z-20 gba:flex gba:items-center gba:gap-2">
        <button
          onClick={onOpenSettings}
          className="gba:inline-flex gba:items-center gba:gap-2 gba:h-10 gba:px-4 gba:rounded-full gba:border gba:border-border/70 gba:bg-card/95 gba:text-sm gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card gba:transition-colors"
          data-testid="fabric-landing-settings-button"
        >
          <GearIcon className="gba:h-4 gba:w-4" />
          Settings
        </button>
        <button
          onClick={onOpenHistory}
          className="gba:inline-flex gba:items-center gba:gap-2 gba:h-10 gba:px-4 gba:rounded-full gba:border gba:border-border/70 gba:bg-card/95 gba:text-sm gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card gba:transition-colors"
          data-testid="fabric-landing-history-button"
        >
          <ClockCounterClockwiseIcon className="gba:h-4 gba:w-4" />
          History
        </button>
      </div>

      <GlowStyle />

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
        <div className="gba:min-h-full gba:px-6 gba:py-12">
          <div className="gba:mx-auto gba:flex gba:min-h-[calc(100vh-6rem)] gba:w-full gba:max-w-[58rem] gba:flex-col gba:items-center">
            <div className="gba:flex-[0.84] gba:flex gba:flex-col gba:items-center gba:justify-end gba:pb-6">
              <div className="gba:inline-flex gba:items-center gba:px-3 gba:py-1.5 gba:rounded-full gba:border gba:border-border gba:bg-card gba:text-xs gba:font-medium gba:text-muted-foreground gba:shadow-sm">
                Every Fabric
              </div>

              <h2 className="gba:mt-3 gba:text-xl gba:font-bold gba:tracking-tight gba:text-foreground">
                NEWWORK Enterprise Agents
              </h2>

              <div className="gba:mt-10 gba:text-center gba:space-y-2">
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
                onSubmit={(task, config) => {
                  const connectionIds = activeConnectors.map(c => c.connection_id)
                  return onStartSession(task, config, connectionIds, selectedSkill?.skill_id)
                }}
                selectedAgent={undefined}
                onClearAgent={() => setSelectedSkill(undefined)}
                onConnectorsClick={() => setIsConnectorSheetOpen(true)}
                activeConnectors={activeConnectors}
                onRemoveConnector={toggleConnector}
                autoFocus
              />

              {skills.length > 0 && (
                <div ref={skillMenuRef} className="gba:absolute gba:top-4 gba:right-5 gba:z-20">
                  <button
                    onClick={() => setIsSkillMenuOpen(open => !open)}
                    className="gba:inline-flex gba:h-9 gba:items-center gba:gap-2 gba:rounded-full gba:border gba:border-border/75 gba:bg-card/96 gba:px-3.5 gba:text-sm gba:text-muted-foreground gba:shadow-[0_6px_18px_rgba(15,23,42,0.04)] gba:transition-colors gba:hover:bg-card gba:hover:text-foreground"
                    data-testid="fabric-landing-module-menu"
                  >
                    <PackageIcon className="gba:h-4 gba:w-4" />
                    {selectedSkill ? selectedSkill.name : 'Enterprise Skills'}
                    <CaretDownIcon className="gba:h-3.5 gba:w-3.5" />
                  </button>

                  <div
                    className={`gba:absolute gba:top-0 gba:z-30 gba:w-[20rem] gba:max-w-[calc(100vw-2rem)] gba:rounded-[1.25rem] gba:border gba:border-border/75 gba:bg-card/98 gba:shadow-[0_14px_32px_rgba(15,23,42,0.06)] gba:transition-all ${
                      isSkillMenuOpen
                        ? 'gba:opacity-100 gba:translate-y-0 gba:pointer-events-auto'
                        : 'gba:opacity-0 gba:translate-y-1 gba:pointer-events-none'
                    }`}
                    style={{ left: 'calc(100% + 1.5rem)', top: '-0.25rem' }}
                    data-testid="fabric-landing-skill-menu-panel"
                  >
                    <div className="gba:max-h-80 gba:overflow-y-auto gba:p-2">
                      {skills.map(skill => {
                        const isSelected = selectedSkill?.skill_id === skill.skill_id

                        return (
                          <button
                            key={skill.skill_id}
                            onClick={() => {
                              setSelectedSkill(isSelected ? undefined : skill)
                              setIsSkillMenuOpen(false)
                            }}
                            className={`gba:flex gba:w-full gba:items-start gba:justify-between gba:gap-3 gba:rounded-[1rem] gba:px-3 gba:py-3 gba:text-left gba:transition-colors ${
                              isSelected ? 'gba:bg-muted/70' : 'gba:hover:bg-muted/45'
                            }`}
                            data-testid={`fabric-landing-skill-option-${skill.skill_id}`}
                          >
                            <div className="gba:flex gba:items-start gba:gap-3 gba:min-w-0 gba:flex-1">
                              {skill.icon && (
                                <div className="gba:text-2xl gba:leading-none gba:flex-shrink-0 gba:mt-0.5">
                                  {skill.icon}
                                </div>
                              )}
                              <div className="gba:min-w-0 gba:flex-1">
                                <p className="gba:text-sm gba:font-semibold gba:text-foreground">{skill.name}</p>
                                <p className="gba:mt-1 gba:line-clamp-2 gba:text-xs gba:leading-5 gba:text-muted-foreground">
                                  {skill.description}
                                </p>
                                <div className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:text-xs">
                                  <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted/60 gba:text-muted-foreground gba:font-medium">
                                    {skill.category}
                                  </span>
                                  {skill.install_count > 0 && (
                                    <span className="gba:text-muted-foreground/60">{skill.install_count} installs</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-foreground gba:mt-1" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="gba:flex-[1.16] gba:flex gba:w-full gba:flex-col gba:items-center gba:pt-5 gba:overflow-visible" />
          </div>
        </div>
      </div>

      <ConnectorPickerSheet
        isOpen={isConnectorSheetOpen}
        onClose={() => setIsConnectorSheetOpen(false)}
        connectors={availableConnectors}
        activeConnectorIds={new Set(activeConnectors.map(c => c.connection_id))}
        onToggle={toggleConnector}
        isLoading={isLoadingConnectors}
      />
    </div>
  )
}
