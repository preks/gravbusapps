import React from 'react'
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { Bot, Sparkles, Workflow, GitBranch } from 'lucide-react'
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
    description: 'Specialized AI assistant for chat conversations',
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
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-overview-tab">
      {/* Agent Type - First selection */}
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle>Agent Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            {(Object.keys(AGENT_TYPE_INFO) as AgentType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => actions.setAgentType(type)}
                className={`gba:p-4 gba:rounded-lg gba:border-2 gba:text-left gba:transition-all ${
                  state.agentType === type
                    ? 'gba:border-primary gba:bg-primary/5'
                    : 'gba:border-border gba:hover:border-primary/50 gba:hover:bg-muted/50'
                }`}
                data-testid={`agent-builder-type-${type}`}
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <span className={state.agentType === type ? 'gba:text-primary' : 'gba:text-muted-foreground'}>
                    {AGENT_TYPE_INFO[type].icon}
                  </span>
                  <span className="gba:font-semibold">{AGENT_TYPE_INFO[type].label}</span>
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">{AGENT_TYPE_INFO[type].description}</div>
              </button>
            ))}
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
              <Select
                value={state.workspaceId}
                onValueChange={actions.setWorkspaceId}
                disabled={mode === 'edit'}
                data-testid="agent-builder-workspace"
              >
                <SelectTrigger>
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
    </div>
  )
}

export default OverviewTab
