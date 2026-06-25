import React from 'react'
import type { TabProps } from './types'
import { KnowledgeSourcesPanel } from '../KnowledgeSourcesPanel'
import { TaskExpertPoliciesPanel } from '../TaskExpertPoliciesPanel'

export const KnowledgeTab: React.FC<TabProps> = ({ context, state, actions, promptId }) => {
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-knowledge-tab">
      <KnowledgeSourcesPanel
        {...context}
        promptId={promptId || undefined}
        sources={state.knowledgeSources}
        onSourcesChange={actions.setKnowledgeSources}
        data-testid="agent-builder-knowledge-sources"
      />
      <TaskExpertPoliciesPanel {...context} promptId={promptId || undefined} data-testid="agent-builder-policies" />
    </div>
  )
}

export default KnowledgeTab
