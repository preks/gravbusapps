import { ClockCounterClockwiseIcon, GearIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { SessionConfig } from '../../types/enterpriseAgent'
import { useFabricConnectors } from '../../hooks/useFabricConnectors'
import { useFabric } from '../../context/FabricContext'
import { resolveUserFirstName } from '../../utils/userUtils'
import { SETTINGS_KEY } from '../settings/agentSettings.types'
import { FabricInput } from './FabricInput'
import { ConnectorPickerSheet } from '../connectors/ConnectorPickerSheet'

interface LandingScreenProps {
  accessToken: string
  onStartSession: (
    task: string,
    config: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
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
  const { userInfo } = useFabric()
  const {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading: isLoadingConnectors
  } = useFabricConnectors(accessToken)
  const [isConnectorSheetOpen, setIsConnectorSheetOpen] = useState(false)
  const [fallbackSkillId, setFallbackSkillId] = useState<string | undefined>(undefined)

  const userFirstName = resolveUserFirstName(userInfo)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.defaultSkillId) {
          setFallbackSkillId(parsed.defaultSkillId)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  return (
    <div
      className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:bg-background gba:overflow-hidden"
      data-testid="fabric-landing"
    >
      <div className="gba:absolute gba:top-5 gba:left-0 gba:right-0 gba:z-20 gba:flex gba:items-center gba:justify-between gba:px-4 sm:gba:px-6 lg:gba:px-8">
        <button
          onClick={onOpenHistory}
          className="gba:inline-flex gba:items-center gba:gap-2 gba:h-10 gba:px-4 gba:rounded-full gba:border gba:border-border/70 gba:bg-card/95 gba:text-sm gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card gba:transition-colors"
          data-testid="fabric-landing-history-button"
        >
          <ClockCounterClockwiseIcon className="gba:h-4 gba:w-4" />
          History
        </button>

        <h2 className="gba:text-xl gba:font-bold gba:tracking-tight gba:text-foreground">NEWWORK Enterprise Agents</h2>

        <button
          onClick={onOpenSettings}
          className="gba:inline-flex gba:items-center gba:gap-2 gba:h-10 gba:px-4 gba:rounded-full gba:border gba:border-border/70 gba:bg-card/95 gba:text-sm gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-card gba:transition-colors"
          data-testid="fabric-landing-settings-button"
        >
          <GearIcon className="gba:h-4 gba:w-4" />
          Settings
        </button>
      </div>

      <GlowStyle />

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
        <div className="gba:min-h-full gba:px-6 gba:py-12">
          <div className="gba:mx-auto gba:flex gba:min-h-[calc(100vh-6rem)] gba:w-full gba:max-w-232 gba:flex-col gba:items-center">
            <div className="gba:flex-[0.84] gba:flex gba:flex-col gba:items-center gba:justify-end gba:pb-6">
              <div className="gba:mt-10 gba:text-center gba:space-y-2">
                <h1 className="gba:text-[3rem] sm:gba:text-[3.5rem] gba:font-semibold gba:tracking-[-0.04em] gba:text-foreground gba:leading-[0.98]">
                  {userFirstName ? `Hi ${userFirstName}, what` : 'What'} would you like to do?
                </h1>
                <p className="gba:text-base gba:text-muted-foreground/78">
                  Assign a task, ask anything, or continue a workflow.
                </p>
              </div>
            </div>

            <div className="gba:relative gba:w-full gba:max-w-184 gba:overflow-visible">
              <FabricInput
                variant="landing"
                onSubmit={(task, config) => {
                  const connectionIds = activeConnectors.map(c => c.connection_id)
                  return onStartSession(task, config, connectionIds, undefined, fallbackSkillId)
                }}
                selectedAgent={undefined}
                onClearAgent={() => {}}
                onConnectorsClick={() => setIsConnectorSheetOpen(true)}
                activeConnectors={activeConnectors}
                onRemoveConnector={toggleConnector}
                autoFocus
              />
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
