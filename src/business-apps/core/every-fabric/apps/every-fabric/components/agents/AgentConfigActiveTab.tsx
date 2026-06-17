import React from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  ArrowSquareOutIcon,
  ArticleIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerGapIcon,
  TagIcon,
  XIcon
} from '@phosphor-icons/react'
import {
  DESCRIPTION_EXAMPLE,
  NAME_HINT,
  SPECIALTY_HINT,
  type DescriptionSignals as DescriptionSignalsType
} from './agentStandard'
import { evaluateAgentCompliance } from './agentStandard'
import { AgentPoliciesEditor } from './AgentPoliciesEditor'
import { AgentWorkerSections } from './AgentWorkerSections'
import { DeploymentsSection } from './DeploymentsSection'
import type { FabricAgent } from './agentTypes'
import { agentDisplayLabel } from './agentTypes'
import { isImageAvatar } from './agentAvatarUtils'
import type { WorkforceAgentConfigState } from '../enterprise-workforce/useWorkforceAgentConfig'
import {
  AgentAvatarPreview,
  AvatarClearButtonContent,
  AvatarGenerateButtonContent,
  ComplianceBanner,
  ConfigFormError,
  ConfigSkillBuiltInBadge,
  ConfigSkillToolRefs,
  DescriptionSignals,
  SaveButtonContent,
  SystemPromptConfigPanel
} from './agentConfigViewParts'
import { WorkforceTabEmptyState } from './WorkforceTabEmptyState'

type AgentConfigTab = 'profile' | 'capabilities' | 'deployment' | 'passport' | 'activation'

interface SkillOption {
  skill_id: string
  name: string
  description: string
  status: string
  is_active?: boolean
  tool_refs?: string[]
}

export interface AgentConfigActiveTabProps {
  activeTab: AgentConfigTab
  agent: FabricAgent
  accessToken: string
  workforceConfigEnabled: boolean
  workforceConfig: WorkforceAgentConfigState
  avatarPreview: string | null
  avatarGenerating: boolean
  avatarClearing: boolean
  avatarError: string | null
  canGenerateAvatar: boolean
  detailsName: string
  detailsDescription: string
  detailsTags: string
  detailsSpecialty: string
  detailsLoading: boolean
  detailsSaving: boolean
  detailsSaved: boolean
  detailsDirty: boolean
  detailsError: string | null
  descriptionSignals: DescriptionSignalsType
  detailAvailable: boolean
  systemPrompt: string | null
  savedSystemPrompt: string | null
  systemPromptError: string | null
  systemPromptDirty: boolean
  systemPromptSaving: boolean
  systemPromptSaved: boolean
  skillsLoading: boolean
  skillsError: string | null
  assignedSkills: SkillOption[]
  unassignedSkills: SkillOption[]
  showSkillPicker: boolean
  skillSearchQuery: string
  compliance: ReturnType<typeof evaluateAgentCompliance>
  onViewActivity?: (agentId: string) => void
  onWorkforceDeployed?: () => void
  setActiveTab: (tab: AgentConfigTab) => void
  setDetailsName: (value: string) => void
  setDetailsDescription: (value: string) => void
  setDetailsTags: (value: string) => void
  setDetailsSpecialty: (value: string) => void
  setSystemPrompt: (value: string | null) => void
  setSystemPromptError: (value: string | null) => void
  setShowSkillPicker: (value: boolean) => void
  setSkillSearchQuery: (value: string) => void
  setWorkforceJustDeployed: (value: boolean) => void
  handleGenerateAvatar: () => void | Promise<void>
  handleClearAvatar: () => void | Promise<void>
  handleSaveDetails: () => void | Promise<void>
  handleSaveSystemPrompt: () => void | Promise<void>
  toggleSkill: (skillId: string) => void
}

export function AgentConfigActiveTab(props: AgentConfigActiveTabProps): React.ReactNode {
  const {
    activeTab,
    agent,
    accessToken,
    workforceConfigEnabled,
    workforceConfig,
    avatarPreview,
    avatarGenerating,
    avatarClearing,
    avatarError,
    canGenerateAvatar,
    detailsName,
    detailsDescription,
    detailsTags,
    detailsSpecialty,
    detailsLoading,
    detailsSaving,
    detailsSaved,
    detailsDirty,
    detailsError,
    descriptionSignals,
    detailAvailable,
    systemPrompt,
    savedSystemPrompt,
    systemPromptError,
    systemPromptDirty,
    systemPromptSaving,
    systemPromptSaved,
    skillsLoading,
    skillsError,
    assignedSkills,
    unassignedSkills,
    showSkillPicker,
    skillSearchQuery,
    compliance,
    onViewActivity,
    onWorkforceDeployed,
    setActiveTab,
    setDetailsName,
    setDetailsDescription,
    setDetailsTags,
    setDetailsSpecialty,
    setSystemPrompt,
    setSystemPromptError,
    setShowSkillPicker,
    setSkillSearchQuery,
    setWorkforceJustDeployed,
    handleGenerateAvatar,
    handleClearAvatar,
    handleSaveDetails,
    handleSaveSystemPrompt,
    toggleSkill
  } = props

  const hasImageAvatar = isImageAvatar(avatarPreview)
  const avatarBusy = avatarGenerating || avatarClearing

  return (
    <>
      {/* Profile — how this agent is discovered and selected. */}
      {activeTab === 'profile' && (
        <div className="gba:space-y-10">
          {/* Profile: Name, Description, Tags, Specialty — the fields that drive discovery/selection */}
          <section data-testid="agent-config-details">
            <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">
              <TagIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              Profile
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
              Name, description, and specialty are how this agent gets discovered and chosen for a task.
            </p>

            <div
              className="gba:mb-4 gba:flex gba:items-center gba:gap-4 gba:rounded-xl gba:border gba:border-border gba:bg-muted/20 gba:p-4"
              data-testid="agent-config-avatar-card"
            >
              <AgentAvatarPreview
                avatar={avatarPreview}
                label={detailsName || agentDisplayLabel(agent)}
                className="gba:h-20 gba:w-20"
              />
              <div className="gba:min-w-0 gba:flex-1">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Agent avatar</h3>
                <p className="gba:mt-1 gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
                  Generate a polished ID-style avatar from this agent&apos;s name, role, specialty, and instructions.
                </p>
                {avatarError && (
                  <p className="gba:mt-2 gba:text-xs gba:text-destructive" data-testid="agent-avatar-error">
                    {avatarError}
                  </p>
                )}
              </div>
              <div className="gba:flex gba:shrink-0 gba:flex-col gba:items-stretch gba:gap-2 sm:gba:items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleGenerateAvatar()}
                  disabled={!canGenerateAvatar || avatarBusy}
                  data-testid="agent-avatar-generate"
                >
                  <AvatarGenerateButtonContent avatarGenerating={avatarGenerating} hasAvatar={hasImageAvatar} />
                </Button>
                {canGenerateAvatar && hasImageAvatar ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleClearAvatar()}
                    disabled={avatarBusy}
                    className="gba:text-muted-foreground gba:hover:text-destructive"
                    data-testid="agent-avatar-clear"
                  >
                    <AvatarClearButtonContent avatarClearing={avatarClearing} />
                  </Button>
                ) : null}
              </div>
            </div>
            {!canGenerateAvatar && (
              <p className="gba:-mt-2 gba:mb-4 gba:text-xs gba:text-muted-foreground">
                Avatar generation is available for unified Agent records.
              </p>
            )}

            {detailsError && <ConfigFormError message={detailsError} />}

            {detailsLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : (
              <div className="gba:space-y-4">
                <div>
                  <label
                    htmlFor="details-name"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="details-name"
                    type="text"
                    value={detailsName}
                    onChange={e => setDetailsName(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    data-testid="details-name-input"
                  />
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{NAME_HINT}</p>
                </div>

                <div>
                  <label
                    htmlFor="details-description"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Description
                  </label>
                  <p className="gba:mb-1.5 gba:text-[11px] gba:text-muted-foreground">
                    The single biggest factor in whether this agent gets picked. Describe what it does using the words
                    people will actually type.
                  </p>
                  <textarea
                    id="details-description"
                    value={detailsDescription}
                    onChange={e => setDetailsDescription(e.target.value)}
                    rows={3}
                    placeholder={DESCRIPTION_EXAMPLE}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring gba:resize-y"
                    data-testid="details-description-input"
                  />
                  <DescriptionSignals signals={descriptionSignals} />
                  <p className="gba:mt-1.5 gba:text-[11px] gba:text-muted-foreground">
                    Example: <span className="gba:italic">{DESCRIPTION_EXAMPLE}</span>
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="details-tags"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Tags
                  </label>
                  <input
                    id="details-tags"
                    type="text"
                    value={detailsTags}
                    onChange={e => setDetailsTags(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    placeholder="Comma-separated, e.g. support, tickets, internal-ops"
                    data-testid="details-tags-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="details-specialty"
                    className="gba:block gba:text-sm gba:font-medium gba:text-foreground gba:mb-1"
                  >
                    Specialty
                  </label>
                  <input
                    id="details-specialty"
                    type="text"
                    value={detailsSpecialty}
                    onChange={e => setDetailsSpecialty(e.target.value)}
                    className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
                    placeholder="e.g. Employee support, procurement"
                    data-testid="details-specialty-input"
                  />
                  <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">{SPECIALTY_HINT}</p>
                </div>

                <div className="gba:pt-2 gba:flex gba:items-center gba:justify-end gba:gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSaveDetails()}
                    disabled={!detailsDirty || detailsSaving || !descriptionSignals.isValid}
                    data-testid="details-save"
                  >
                    <SaveButtonContent
                      saving={detailsSaving}
                      saved={detailsSaved && !detailsDirty}
                      label="Save Changes"
                    />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Capabilities — what this agent can do. */}
      {activeTab === 'capabilities' && (
        <div className="gba:space-y-10">
          {/* Standard compliance — pushes authors toward a real prompt + skills + tools */}
          {!detailsLoading && !skillsLoading && <ComplianceBanner compliance={compliance} />}

          {/* System Prompt Section (editable) — defines who the agent is */}
          <section data-testid="agent-config-system-prompt">
            <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">
              <ArticleIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              System Prompt
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              Define the agent&apos;s identity, capabilities, and hard constraints (MUST / NEVER). This is the single
              biggest driver of how the agent behaves.
            </p>
            <SystemPromptConfigPanel
              detailsLoading={detailsLoading}
              detailAvailable={detailAvailable}
              systemPrompt={systemPrompt}
              systemPromptError={systemPromptError}
              systemPromptDirty={systemPromptDirty}
              systemPromptSaving={systemPromptSaving}
              systemPromptSaved={systemPromptSaved}
              onSystemPromptChange={setSystemPrompt}
              onResetSystemPrompt={() => {
                setSystemPrompt(savedSystemPrompt)
                setSystemPromptError(null)
              }}
              onSaveSystemPrompt={() => void handleSaveSystemPrompt()}
            />
          </section>

          {/* Skills Section */}
          <section data-testid="agent-config-skills">
            <h2 className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold gba:text-foreground gba:mb-4">
              <LightbulbIcon className="gba:h-4 gba:w-4 gba:text-amber-600" />
              Skills
            </h2>

            {skillsError && <ConfigFormError message={skillsError} />}

            {skillsLoading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <SpinnerGapIcon className="gba:h-6 gba:w-6 gba:animate-spin gba:text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Assigned skills */}
                {assignedSkills.length === 0 ? (
                  <p className="gba:text-sm gba:text-muted-foreground gba:py-4">No skills assigned.</p>
                ) : (
                  <div className="gba:space-y-2">
                    {assignedSkills.map(skill => (
                      <div
                        key={skill.skill_id}
                        className="gba:rounded-lg gba:border gba:border-primary gba:bg-primary/5 gba:p-3"
                        data-testid={`config-skill-${skill.skill_id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                          <span className="gba:flex-1 gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {skill.name || skill.skill_id}
                          </span>
                          {skill.status === 'built_in' && <ConfigSkillBuiltInBadge />}
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill.skill_id)}
                            className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded gba:text-muted-foreground gba:hover:text-destructive gba:hover:bg-destructive/10 gba:transition-colors"
                            data-testid={`config-skill-remove-${skill.skill_id}`}
                          >
                            <XIcon className="gba:h-3.5 gba:w-3.5" />
                          </button>
                        </div>
                        <ConfigSkillToolRefs toolRefs={skill.tool_refs} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Skill button / picker */}
                {!showSkillPicker ? (
                  <button
                    type="button"
                    onClick={() => setShowSkillPicker(true)}
                    className="gba:mt-3 gba:inline-flex gba:items-center gba:gap-1.5 gba:text-sm gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors"
                    data-testid="config-skill-add-button"
                  >
                    <PlusIcon className="gba:h-4 gba:w-4" />
                    Add Skill
                  </button>
                ) : (
                  <div className="gba:mt-3 gba:rounded-lg gba:border gba:border-border gba:p-3">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Available skills</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSkillPicker(false)
                          setSkillSearchQuery('')
                        }}
                        className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80"
                        data-testid="config-skill-picker-done"
                      >
                        Done
                      </button>
                    </div>
                    <div className="gba:relative gba:mb-2">
                      <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                      <input
                        type="text"
                        value={skillSearchQuery}
                        onChange={e => setSkillSearchQuery(e.target.value)}
                        placeholder="Search skills…"
                        className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:pl-8 gba:pr-2.5 gba:py-1.5 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring placeholder:gba:text-muted-foreground/50"
                        data-testid="config-skill-search"
                      />
                    </div>
                    {unassignedSkills.length === 0 ? (
                      <p className="gba:text-xs gba:text-muted-foreground gba:py-2">
                        {skillSearchQuery.trim() ? 'No matching skills found.' : 'All skills are already assigned.'}
                      </p>
                    ) : (
                      <div className="gba:space-y-1.5">
                        {unassignedSkills.map(skill => (
                          <button
                            key={skill.skill_id}
                            type="button"
                            onClick={() => toggleSkill(skill.skill_id)}
                            className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-2.5 gba:text-left gba:hover:border-primary/50 gba:hover:bg-muted/30 gba:transition-colors"
                            data-testid={`config-skill-pick-${skill.skill_id}`}
                          >
                            <LightbulbIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-600 gba:shrink-0" />
                            <div className="gba:flex-1 gba:min-w-0">
                              <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                                {skill.name || skill.skill_id}
                              </span>
                              {skill.description && (
                                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1">
                                  {skill.description}
                                </p>
                              )}
                            </div>
                            {skill.status === 'built_in' && <ConfigSkillBuiltInBadge />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Policies Section (agent-level intranet policy allow-list).
                  Self-managed by AgentPoliciesEditor; renders nothing when the
                  agent's ODM does not support per-agent policy_refs. */}
          <AgentPoliciesEditor agentId={agent.id} accessToken={accessToken} />
        </div>
      )}

      {/* Passport — who the Worker is and who is accountable. */}
      {activeTab === 'passport' && (
        <div className="gba:space-y-6">
          {workforceConfigEnabled ? (
            <AgentWorkerSections
              accessToken={accessToken}
              group="passport"
              config={workforceConfig}
              data-testid="agent-config-passport"
              emptyLabel="No Passport configuration available."
            />
          ) : (
            <WorkforceTabEmptyState
              icon={IdentificationCardIcon}
              title="Not a Worker yet"
              description="Activate this agent as a Worker to give it a role, an owner, and governance."
              data-testid="agent-config-passport-empty"
              gotoTestId="agent-config-passport-goto-activation"
              onGoToDeployment={() => setActiveTab('deployment')}
            />
          )}
        </div>
      )}

      {/* Deployment — where this agent runs and whether it is a Worker. */}
      {activeTab === 'deployment' && (
        <div className="gba:space-y-6">
          <DeploymentsSection
            agentId={agent.id}
            accessToken={accessToken}
            isWorkforceEnabled={workforceConfigEnabled}
            deployments={agent.deployments}
            hideHeading
            onWorkforceDeployed={() => {
              // Reveal the worker runtime config straight away, then let the
              // parent refresh the list/badges.
              setWorkforceJustDeployed(true)
              onWorkforceDeployed?.()
            }}
          />
        </div>
      )}

      {/* Activation — runtime behavior once this agent is a Worker. */}
      {activeTab === 'activation' && (
        <div className="gba:space-y-10">
          {workforceConfigEnabled && (
            <>
              <AgentWorkerSections
                accessToken={accessToken}
                group="activation"
                config={workforceConfig}
                data-testid="agent-config-activation"
                emptyLabel="No runtime configuration available."
              />
              <div
                className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
                data-testid="agent-config-activity-linkout"
              >
                <div className="gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">Live activity</p>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    Cases, runs, and traces for this Worker live in Digital Workforce.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!onViewActivity}
                  onClick={() => onViewActivity?.(agent.id)}
                  data-testid="agent-config-view-activity"
                >
                  <ArrowSquareOutIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" />
                  View live activity in Digital Workforce
                </Button>
              </div>
            </>
          )}
          {!workforceConfigEnabled && (
            <WorkforceTabEmptyState
              icon={LightningIcon}
              title="No Worker runtime yet"
              description="Activate this agent as a Worker in Deployment before configuring autonomy, triggers, and live activity."
              data-testid="agent-config-activation-empty"
              gotoTestId="agent-config-activation-goto-deployment"
              onGoToDeployment={() => setActiveTab('deployment')}
            />
          )}
        </div>
      )}
    </>
  )
}
