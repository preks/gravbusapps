import React, { useState } from 'react'
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import { Bot, Network, Sparkles, Workflow, Plus, GitBranch } from 'lucide-react'
import type { TabProps } from './types'
import type { AgentType } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const AGENT_TYPE_INFO: Record<AgentType, { label: string; description: string; icon: React.ReactNode }> = {
  flow: {
    label: 'FLOW Agent',
    description: 'For process automation and workflows',
    icon: <Workflow className="gba:w-5 gba:h-5" />
  },
  everyai: {
    label: 'EveryAI Expert',
    description: '',
    icon: <Sparkles className="gba:w-5 gba:h-5" />
  },
  general: {
    label: 'General Agent',
    description: 'General purpose agent for standalone use',
    icon: <Bot className="gba:w-5 gba:h-5" />
  },
  decision: {
    label: 'Decision Expert',
    description: 'Structured decision output for branching',
    icon: <GitBranch className="gba:w-5 gba:h-5" />
  }
}

export const OverviewTab: React.FC<TabProps> = ({ state, actions, catalogs, mode }) => {
  const { t } = useTranslation(translations)
  const [showNewWs, setShowNewWs] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creatingWs, setCreatingWs] = useState(false)

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || !catalogs.createWorkspace) return
    setCreatingWs(true)
    try {
      await catalogs.createWorkspace(newWsName.trim())
      setNewWsName('')
      setShowNewWs(false)
    } catch {
      console.error('Failed to create workspace')
    } finally {
      setCreatingWs(false)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="agent-builder-overview-tab">
      {/* Agent Type - First selection */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle>Agent Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-4 gba:gap-3">
            {(Object.keys(AGENT_TYPE_INFO) as AgentType[]).map(type => {
              const isSelected = state.agentType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => actions.setAgentType(type)}
                  className={`gba:relative gba:flex gba:flex-col gba:items-center gba:text-center gba:rounded-xl gba:p-5 gba:transition-all gba:cursor-pointer ${
                    isSelected
                      ? 'gba:bg-card-decorative gba:border-0'
                      : 'gba:bg-card gba:border gba:border-border gba:hover:border-primary/40 gba:hover:bg-muted/30'
                  }`}
                  data-testid={`agent-builder-type-${type}`}
                >
                  <div
                    className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:mb-3 ${
                      isSelected ? 'gba:bg-decorative-foreground/15' : 'gba:bg-muted'
                    }`}
                  >
                    <span className={isSelected ? 'gba:text-decorative-foreground' : 'gba:text-muted-foreground'}>
                      {AGENT_TYPE_INFO[type].icon}
                    </span>
                  </div>
                  <span
                    className={`gba:font-semibold gba:text-sm ${isSelected ? 'gba:text-decorative-foreground' : 'gba:text-foreground'}`}
                  >
                    {AGENT_TYPE_INFO[type].label}
                  </span>
                  <span
                    className={`gba:text-xs gba:mt-1 ${isSelected ? 'gba:text-decorative-foreground/70' : 'gba:text-muted-foreground'}`}
                  >
                    {type === 'everyai' ? t('agent-type-everyai-description') : AGENT_TYPE_INFO[type].description}
                  </span>
                  {type === 'everyai' && (
                    <span className="gba:absolute gba:top-2 gba:right-2 gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded-md gba:text-[10px] gba:font-semibold gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground">
                      <Network className="gba:w-3 gba:h-3" />
                      Mesh
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Identity */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle>Agent Identity</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:space-y-2">
              <Label>
                Name <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                value={state.name}
                onChange={e => actions.setName(e.target.value)}
                placeholder="e.g., Customer Support Agent"
                disabled={mode === 'edit'}
                data-testid="agent-builder-name"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>
                Workspace <span className="gba:text-destructive">*</span>
              </Label>
              {showNewWs ? (
                <div className="gba:flex gba:gap-2">
                  <Input
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="Workspace name..."
                    onKeyDown={e => e.key === 'Enter' && handleCreateWorkspace()}
                    disabled={creatingWs}
                    data-testid="agent-builder-workspace-new-input"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateWorkspace}
                    disabled={!newWsName.trim() || creatingWs}
                    data-testid="agent-builder-workspace-create-btn"
                  >
                    {creatingWs ? '...' : 'Create'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewWs(false)
                      setNewWsName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="gba:flex gba:gap-2">
                  <Select
                    value={state.workspaceId}
                    onValueChange={actions.setWorkspaceId}
                    disabled={mode === 'edit'}
                    data-testid="agent-builder-workspace"
                  >
                    <SelectTrigger className="gba:flex-1">
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogs.workspaces
                        .filter(ws => !!ws._id)
                        .map(ws => (
                          <SelectItem key={ws._id} value={ws._id as string}>
                            {ws.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {mode !== 'edit' && catalogs.createWorkspace && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowNewWs(true)}
                      data-testid="agent-builder-workspace-new"
                    >
                      <Plus className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="gba:space-y-2">
            <Label>Description</Label>
            <Input
              value={state.description}
              onChange={e => actions.setDescription(e.target.value)}
              placeholder="Brief description of what this agent does"
              data-testid="agent-builder-description"
            />
          </div>
        </CardContent>
      </Card>

      {/* EveryAI specific fields */}
      {state.agentType === 'everyai' && (
        <Card className="gba:!bg-background">
          <CardHeader>
            <CardTitle>EveryAI Configuration</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>
                  Specialty <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  value={state.specialty}
                  onChange={e => actions.setSpecialty(e.target.value)}
                  placeholder="e.g., Customer Service, Sales, HR"
                  data-testid="agent-builder-specialty"
                />
              </div>
              <div className="gba:space-y-2">
                <Label>Color</Label>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <input
                    type="color"
                    value={state.expertColor}
                    onChange={e => actions.setExpertColor(e.target.value)}
                    className="gba:w-10 gba:h-10 gba:rounded gba:border gba:cursor-pointer"
                    data-testid="agent-builder-color"
                  />
                  <Input
                    value={state.expertColor}
                    onChange={e => actions.setExpertColor(e.target.value)}
                    className="gba:flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-4">
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.isPublic}
                  onChange={e => actions.setIsPublic(e.target.checked)}
                  data-testid="agent-builder-is-public"
                />
                <span className="gba:text-sm">Make this expert publicly available</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Card (Mesh metadata) - for EveryAI agents */}
      {state.agentType === 'everyai' && (
        <Card className="gba:!bg-background">
          <CardHeader>
            <CardTitle>Agent Card (Mesh)</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              Configure mesh metadata so other agents can discover and connect to this expert.
            </p>
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:space-y-2">
                <Label>Division</Label>
                <Input
                  value={state.agentCardDivision ?? ''}
                  onChange={e => actions.setAgentCardDivision(e.target.value)}
                  placeholder="e.g., Mobility / Plant A"
                  data-testid="agent-builder-card-division"
                />
              </div>
              <div className="gba:space-y-2">
                <Label>Access Policy</Label>
                <Select
                  value={state.agentCardAccessPolicy ?? 'public'}
                  onValueChange={actions.setAgentCardAccessPolicy}
                  data-testid="agent-builder-card-access-policy"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="division_only">Division Only</SelectItem>
                    <SelectItem value="steering_only">Steering Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="gba:space-y-2">
              <Label>Data Domains (comma-separated)</Label>
              <Input
                value={state.agentCardDataDomains ?? ''}
                onChange={e => actions.setAgentCardDataDomains(e.target.value)}
                placeholder="e.g., production_throughput, quality_metrics"
                data-testid="agent-builder-card-data-domains"
              />
            </div>
            <div className="gba:space-y-2">
              <Label>Capabilities (comma-separated)</Label>
              <Input
                value={state.agentCardCapabilities ?? ''}
                onChange={e => actions.setAgentCardCapabilities(e.target.value)}
                placeholder="e.g., Production KPIs, Quality Analysis"
                data-testid="agent-builder-card-capabilities"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OverviewTab
