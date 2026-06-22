import { useTranslation } from '@newwork/nw-design-system'
import { useCallback, useEffect, useState } from 'react'
import type { SessionConfig, SpecialistAgent } from '../../types/enterpriseAgent'
import { useFabricConnectors } from '../../hooks/useFabricConnectors'
import { useFabricAgents } from '../../hooks/useFabricAgents'
import { useFabric } from '../../context/FabricContext'
import { resolveUserFirstName } from '../../utils/userUtils'
import { SETTINGS_KEY } from '../settings/agentSettings.types'
import translations from '../../_i18n'
import { FabricInput } from './FabricInput'

interface LandingScreenProps {
  accessToken: string
  devModeEnabled?: boolean
  onStartSession: (
    task: string,
    config: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
  ) => void | Promise<unknown>
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
  devModeEnabled = false
}) => {
  const { t } = useTranslation(translations)
  const {
    userInfo,
    sessionAttachments,
    pendingSessionAttachments,
    uploadSessionAttachment,
    removeSessionAttachment,
    modelOptions,
    selectedModelId,
    selectedReasoningEffort,
    isLoadingModels,
    setModelSelection
  } = useFabric()
  const {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading: isLoadingConnectors
  } = useFabricConnectors(accessToken)
  const {
    agents: availableAgents,
    isLoading: isLoadingAgents,
    ensureLoaded: ensureAgentsLoaded
  } = useFabricAgents(accessToken)
  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent | undefined>(undefined)
  const [fallbackSkillId, setFallbackSkillId] = useState<string | undefined>(undefined)

  const userFirstName = resolveUserFirstName(userInfo)

  const handleOpenAgents = useCallback(() => {
    void ensureAgentsLoaded()
  }, [ensureAgentsLoaded])

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
      <GlowStyle />

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
        <div className="gba:min-h-full gba:px-6 gba:py-12">
          <div className="gba:mx-auto gba:flex gba:min-h-[calc(100vh-6rem)] gba:w-full gba:max-w-232 gba:flex-col gba:items-center">
            <div className="gba:flex-[0.84] gba:flex gba:flex-col gba:items-center gba:justify-end gba:pb-6">
              <div className="gba:mt-10 gba:text-center gba:space-y-2">
                <h1 className="gba:text-[3rem] sm:gba:text-[3.5rem] gba:font-semibold gba:tracking-[-0.04em] gba:text-foreground gba:leading-[0.98]">
                  {userFirstName
                    ? `${t('landing-greeting-with-name', { name: userFirstName })} ${t('landing-heading-suffix')}`
                    : `${t('landing-greeting')} ${t('landing-heading-suffix')}`}
                </h1>
                <p className="gba:text-base gba:text-muted-foreground/78">{t('landing-subtitle')}</p>
              </div>
            </div>

            <div className="gba:relative gba:w-full gba:max-w-184 gba:overflow-visible">
              <FabricInput
                variant="landing"
                onSubmit={(task, config) => {
                  const connectionIds = activeConnectors.map(c => c.connection_id)
                  return onStartSession(task, config, connectionIds, undefined, fallbackSkillId)
                }}
                selectedAgent={selectedAgent}
                onClearAgent={() => setSelectedAgent(undefined)}
                availableAgents={availableAgents}
                onSelectAgent={setSelectedAgent}
                isLoadingAgents={isLoadingAgents}
                onOpenAgents={handleOpenAgents}
                availableConnectors={availableConnectors}
                activeConnectorIds={new Set(activeConnectors.map(c => c.connection_id))}
                onToggleConnector={toggleConnector}
                isLoadingConnectors={isLoadingConnectors}
                onUploadAttachment={uploadSessionAttachment}
                onRemoveAttachment={removeSessionAttachment}
                attachments={sessionAttachments}
                pendingAttachments={pendingSessionAttachments}
                modelSelectorModels={modelOptions}
                selectedModelId={selectedModelId}
                selectedEffort={selectedReasoningEffort}
                onModelChange={setModelSelection}
                isLoadingModels={isLoadingModels}
                devModeEnabled={devModeEnabled}
                autoFocus
              />
            </div>

            <div className="gba:flex-[1.16] gba:flex gba:w-full gba:flex-col gba:items-center gba:pt-5 gba:overflow-visible" />
          </div>
        </div>
      </div>
    </div>
  )
}
