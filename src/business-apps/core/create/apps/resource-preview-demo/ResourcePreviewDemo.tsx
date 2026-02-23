import React, { useMemo, useState } from 'react'
import { PageHeader, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { FlaskConical, Workflow, Bot, Code2, Database } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowPreview, AgentPreview, FunctionPreview, DataModelPreview } from '@/common/components/ai-builder'
import type {
  FlowPreviewItem,
  AgentPreviewItem,
  FunctionPreviewItem,
  DataModelPreviewItem
} from '@/common/components/ai-builder'
import { DEMO_COMPONENTS } from './demoData'
import { buildMockForComponent } from './mockData'

export interface ResourcePreviewDemoProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const ResourcePreviewDemo: React.FC<ResourcePreviewDemoProps> = ({
  accessToken,
  'data-testid': testId = 'resource-preview-demo'
}) => {
  const token = accessToken ?? ''
  const [activeTab, setActiveTab] = useState('flow')

  const flowItems = useMemo<FlowPreviewItem[]>(
    () =>
      DEMO_COMPONENTS.filter(c => c.type === 'flow').flatMap(c => {
        const m = buildMockForComponent(c)
        return m?.flow ? [{ id: c.id, label: c.name, template: m.flow }] : []
      }),
    []
  )

  const agentItems = useMemo<AgentPreviewItem[]>(
    () =>
      DEMO_COMPONENTS.filter(c => c.type === 'agent').flatMap(c => {
        const m = buildMockForComponent(c)
        return m?.agent ? [{ id: c.id, label: c.name, prompt: m.agent.prompt, paramKeys: m.agent.paramKeys }] : []
      }),
    []
  )

  const functionItems = useMemo<FunctionPreviewItem[]>(
    () =>
      DEMO_COMPONENTS.filter(c => c.type === 'function').flatMap(c => {
        const m = buildMockForComponent(c)
        return m?.function ? [{ id: c.id, label: c.name, definition: m.function }] : []
      }),
    []
  )

  const dataModelItems = useMemo<DataModelPreviewItem[]>(
    () =>
      DEMO_COMPONENTS.filter(c => c.type === 'data_model').flatMap(c => {
        const m = buildMockForComponent(c)
        return m?.data_model ? [{ id: c.id, label: c.name, definition: m.data_model, onCreateRow: async () => {} }] : []
      }),
    []
  )

  return (
    <div className="gba:flex gba:flex-col gba:min-h-0 gba:flex-1 gba:h-full gba:w-full" data-testid={testId}>
      <PageHeader
        icon={FlaskConical}
        title="Resource Preview Demo"
        description="Tabs with Flow, Agent, Function, and Data Model previews using demo data."
      />
      <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:w-full gba:px-4 gba:py-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:w-full"
        >
          <TabsList className="gba:shrink-0" data-testid={`${testId}-tabs`}>
            <TabsTrigger value="flow" className="gba:gap-1">
              <Workflow className="gba:h-4 gba:w-4" /> Flow
            </TabsTrigger>
            <TabsTrigger value="agent" className="gba:gap-1">
              <Bot className="gba:h-4 gba:w-4" /> Agent
            </TabsTrigger>
            <TabsTrigger value="function" className="gba:gap-1">
              <Code2 className="gba:h-4 gba:w-4" /> Function
            </TabsTrigger>
            <TabsTrigger value="data_model" className="gba:gap-1">
              <Database className="gba:h-4 gba:w-4" /> Data Model
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="flow"
            className="gba:flex-1 gba:min-h-0 gba:h-full gba:mt-4 gba:overflow-hidden gba:flex gba:flex-col"
          >
            <FlowPreview accessToken={token} items={flowItems} />
          </TabsContent>
          <TabsContent
            value="agent"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
          >
            <AgentPreview accessToken={token} items={agentItems} />
          </TabsContent>
          <TabsContent
            value="function"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
          >
            <FunctionPreview accessToken={token} items={functionItems} />
          </TabsContent>
          <TabsContent
            value="data_model"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
          >
            <DataModelPreview items={dataModelItems} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
