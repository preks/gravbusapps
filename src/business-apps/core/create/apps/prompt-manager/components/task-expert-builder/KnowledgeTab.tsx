import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@newwork/nw-design-system'
import { BookOpen } from 'lucide-react'
import type { TabProps } from './types'
import { KnowledgeSourcesPanel } from '../KnowledgeSourcesPanel'

export const KnowledgeTab: React.FC<TabProps> = ({ context, state, actions, promptId }) => {
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-knowledge-tab">
      <Card className="gba:!bg-background">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BookOpen className="gba:w-5 gba:h-5" />
            Knowledge Sources
          </CardTitle>
          <CardDescription>Add documents, URLs, and content the agent can reference</CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeSourcesPanel
            {...context}
            promptId={promptId || undefined}
            sources={state.knowledgeSources}
            onSourcesChange={actions.setKnowledgeSources}
            data-testid="agent-builder-knowledge-sources"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default KnowledgeTab
