import React, { useCallback, useState } from 'react'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Spinner } from '@newwork/nw-design-system'
import { Save, Sparkles } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { useAgentBuilderState } from '../../hooks/useAgentBuilderState'
import { OverviewTab } from './OverviewTab'
import { BehaviorTab } from './BehaviorTab'
import { KnowledgeTab } from './KnowledgeTab'
import { CapabilitiesTab } from './CapabilitiesTab'
import { AdvancedTab } from './AdvancedTab'
import { TestTab } from './TestTab'

export interface TaskExpertBuilderProps extends BusinessAppContextProps {
  mode: 'create' | 'edit'
  promptId?: string | null
  onSaved: () => void
  onNameLoaded?: (name: string) => void
}

type BuilderTab = 'overview' | 'behavior' | 'knowledge' | 'capabilities' | 'advanced' | 'test'

export const TaskExpertBuilder: React.FC<TaskExpertBuilderProps> = props => {
  const { mode, promptId, onSaved, onNameLoaded } = props
  const client = usePromptManagerClient(props.accessToken)
  const [activeTab, setActiveTab] = useState<BuilderTab>('overview')
  const [isSaving, setIsSaving] = useState(false)

  const { state, actions, catalogs, prompt, isLoadingPrompt, error, setError, isValid } = useAgentBuilderState(
    props,
    mode,
    promptId,
    onNameLoaded
  )

  // Save handler
  const onSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const toolCodes = catalogs.capabilities
        .filter(c => state.selectedToolIds.includes(c.id))
        .map(c => {
          const ver = state.selectedToolVersion[c.id]
          return ver && ver !== 'latest' ? `${c.code}@${ver}` : c.code
        })

      const modelSettings: Record<string, unknown> = {}
      if (state.responseType === 'json' && state.responseSchema) {
        modelSettings.response_format = { type: 'json_object' }
      }

      if (mode === 'create') {
        await client.createPrompt({
          name: state.name,
          description: state.description,
          type: 'completion',
          workspaceId: state.workspaceId,
          modelId: state.modelId,
          userContent: state.userContent,
          systemContent: state.systemContent,
          modelSettings,
          responseSchema: state.responseSchema ? JSON.parse(state.responseSchema) : null,
          tools: toolCodes,
          agentType: state.agentType,
          specialty: state.agentType === 'everyai' ? state.specialty : undefined,
          responseStyle: state.agentType === 'everyai' ? state.responseStyle : undefined,
          color: state.agentType === 'everyai' ? state.expertColor : undefined,
          citationMode: state.agentType === 'everyai' ? state.citationMode : undefined,
          knowledgeSources: state.knowledgeSources.length > 0 ? state.knowledgeSources : undefined,
          isPublic: state.agentType === 'everyai' ? state.isPublic : undefined,
          tags: state.agentType === 'everyai' && state.tags.length > 0 ? state.tags : undefined
        })
      } else if (prompt?._id) {
        await client.putPrompt(prompt._id, {
          description: state.description,
          type: 'completion',
          userContent: state.userContent,
          systemContent: state.systemContent,
          modelId: state.modelId,
          modelSettings,
          responseSchema: state.responseSchema ? JSON.parse(state.responseSchema) : null,
          tools: toolCodes,
          revisionMessage: '',
          agentType: state.agentType,
          specialty: state.agentType === 'everyai' ? state.specialty : undefined,
          responseStyle: state.agentType === 'everyai' ? state.responseStyle : undefined,
          color: state.agentType === 'everyai' ? state.expertColor : undefined,
          citationMode: state.agentType === 'everyai' ? state.citationMode : undefined,
          knowledgeSources: state.knowledgeSources.length > 0 ? state.knowledgeSources : undefined,
          isPublic: state.agentType === 'everyai' ? state.isPublic : undefined,
          tags: state.agentType === 'everyai' && state.tags.length > 0 ? state.tags : undefined
        })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [mode, prompt, client, state, catalogs.capabilities, onSaved, setError])

  if (isLoadingPrompt) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="agent-builder-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="agent-builder">
      {/* Header actions */}
      <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
        <Button variant="outline" size="sm" disabled data-testid="agent-builder-ai-assist">
          <Sparkles className="gba:w-4 gba:h-4 gba:mr-1" />
          AI Assist
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={!isValid || isSaving}
          data-testid="agent-builder-save"
        >
          <Save className="gba:w-4 gba:h-4 gba:mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {error && (
        <div
          className="gba:p-3 gba:rounded-lg gba:bg-destructive/10 gba:text-destructive gba:text-sm"
          data-testid="agent-builder-error"
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as BuilderTab)} className="gba:w-full">
        <TabsList className="gba:w-full gba:justify-start gba:bg-background" data-testid="agent-builder-tabs">
          <TabsTrigger value="overview" data-testid="agent-builder-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="behavior" data-testid="agent-builder-tab-behavior">
            Behavior
          </TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="agent-builder-tab-knowledge">
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="capabilities" data-testid="agent-builder-tab-capabilities">
            Capabilities
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="agent-builder-tab-advanced">
            Advanced
          </TabsTrigger>
          <TabsTrigger value="test" data-testid="agent-builder-tab-test">
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gba:mt-4">
          <OverviewTab context={props} state={state} actions={actions} catalogs={catalogs} mode={mode} />
        </TabsContent>
        <TabsContent value="behavior" className="gba:mt-4">
          <BehaviorTab context={props} state={state} actions={actions} catalogs={catalogs} mode={mode} />
        </TabsContent>
        <TabsContent value="knowledge" className="gba:mt-4">
          <KnowledgeTab
            context={props}
            state={state}
            actions={actions}
            catalogs={catalogs}
            mode={mode}
            promptId={prompt?._id || promptId}
          />
        </TabsContent>
        <TabsContent value="capabilities" className="gba:mt-4">
          <CapabilitiesTab context={props} state={state} actions={actions} catalogs={catalogs} mode={mode} />
        </TabsContent>
        <TabsContent value="advanced" className="gba:mt-4">
          <AdvancedTab context={props} state={state} actions={actions} catalogs={catalogs} mode={mode} />
        </TabsContent>
        <TabsContent value="test" className="gba:mt-4">
          <TestTab
            context={props}
            state={state}
            actions={actions}
            catalogs={catalogs}
            mode={mode}
            promptId={prompt?._id || promptId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TaskExpertBuilder
