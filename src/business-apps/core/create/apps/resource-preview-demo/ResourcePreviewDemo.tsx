import React, { useMemo, useState } from 'react'
import { PageHeader, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { FlaskConical, Workflow, Bot, Code2, Database } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowPreview, AgentPreview, FunctionPreview, DataModelPreview } from '@/common/components/ai-builder'
import { DEMO_COMPONENTS } from './demoData'
import { buildMockForComponent } from './mockData'

export interface ResourcePreviewDemoProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const ResourcePreviewDemo: React.FC<ResourcePreviewDemoProps> = ({
  accessToken,
  'data-testid': testId = 'resource-preview-demo'
}) => {
  const [activeTab, setActiveTab] = useState<string>('flow')
  const token = accessToken ?? ''

  const flowComponents = useMemo(() => DEMO_COMPONENTS.filter(c => c.type === 'flow'), [])
  const flowComp = flowComponents[0]
  const flowBranchComp = flowComponents[1]
  const agentComp = useMemo(() => DEMO_COMPONENTS.find(c => c.type === 'agent'), [])
  const functionComp = useMemo(() => DEMO_COMPONENTS.find(c => c.type === 'function'), [])
  const dataModelComp = useMemo(() => DEMO_COMPONENTS.find(c => c.type === 'data_model'), [])

  const flowMock = useMemo(() => (flowComp ? buildMockForComponent(flowComp) : null), [flowComp])
  const flowBranchMock = useMemo(
    () => (flowBranchComp ? buildMockForComponent(flowBranchComp) : null),
    [flowBranchComp]
  )
  const agentMock = useMemo(() => (agentComp ? buildMockForComponent(agentComp) : null), [agentComp])
  const functionMock = useMemo(() => (functionComp ? buildMockForComponent(functionComp) : null), [functionComp])
  const dataModelMock = useMemo(() => (dataModelComp ? buildMockForComponent(dataModelComp) : null), [dataModelComp])

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
          <TabsList
            className="gba:w-full gba:flex-wrap gba:h-auto gba:gap-1 gba:shrink-0"
            data-testid={`${testId}-tabs`}
          >
            <TabsTrigger value="flow" className="gba:gap-1" data-testid={`${testId}-tab-flow`}>
              <Workflow className="gba:h-4 gba:w-4" /> Flow
            </TabsTrigger>
            <TabsTrigger value="flow-branch" className="gba:gap-1" data-testid={`${testId}-tab-flow-branch`}>
              <Workflow className="gba:h-4 gba:w-4" /> Flow (branching)
            </TabsTrigger>
            <TabsTrigger value="agent" className="gba:gap-1" data-testid={`${testId}-tab-agent`}>
              <Bot className="gba:h-4 gba:w-4" /> Agent
            </TabsTrigger>
            <TabsTrigger value="function" className="gba:gap-1" data-testid={`${testId}-tab-function`}>
              <Code2 className="gba:h-4 gba:w-4" /> Function
            </TabsTrigger>
            <TabsTrigger value="data_model" className="gba:gap-1" data-testid={`${testId}-tab-data_model`}>
              <Database className="gba:h-4 gba:w-4" /> Data Model
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="flow"
            className="gba:flex-1 gba:min-h-0 gba:h-full gba:mt-4 gba:overflow-hidden gba:flex gba:flex-col"
            data-testid={`${testId}-content-flow`}
          >
            {flowMock?.flow ? (
              <FlowPreview accessToken={token} template={flowMock.flow} data-testid={`${testId}-preview-flow`} />
            ) : (
              <p className="gba:text-muted-foreground">No demo flow.</p>
            )}
          </TabsContent>
          <TabsContent
            value="flow-branch"
            className="gba:flex-1 gba:min-h-0 gba:h-full gba:mt-4 gba:overflow-hidden gba:flex gba:flex-col"
            data-testid={`${testId}-content-flow-branch`}
          >
            {flowBranchMock?.flow ? (
              <FlowPreview
                accessToken={token}
                template={flowBranchMock.flow}
                data-testid={`${testId}-preview-flow-branch`}
              />
            ) : (
              <p className="gba:text-muted-foreground">No branching flow.</p>
            )}
          </TabsContent>
          <TabsContent
            value="agent"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
            data-testid={`${testId}-content-agent`}
          >
            {agentMock?.agent ? (
              <AgentPreview
                accessToken={token}
                prompt={agentMock.agent.prompt}
                paramKeys={agentMock.agent.paramKeys}
                data-testid={`${testId}-preview-agent`}
              />
            ) : (
              <p className="gba:text-muted-foreground">No demo agent.</p>
            )}
          </TabsContent>
          <TabsContent
            value="function"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
            data-testid={`${testId}-content-function`}
          >
            {functionMock?.function ? (
              <FunctionPreview
                accessToken={token}
                mockFunction={functionMock.function}
                data-testid={`${testId}-preview-function`}
              />
            ) : (
              <p className="gba:text-muted-foreground">No demo function.</p>
            )}
          </TabsContent>
          <TabsContent
            value="data_model"
            className="gba:flex-1 gba:min-h-0 gba:mt-4 gba:overflow-auto gba:flex gba:flex-col"
            data-testid={`${testId}-content-data_model`}
          >
            {dataModelMock?.data_model ? (
              <DataModelPreview
                definition={dataModelMock.data_model}
                onCreateRow={async () => {}}
                data-testid={`${testId}-preview-datamodel`}
              />
            ) : (
              <p className="gba:text-muted-foreground">No demo data model.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
