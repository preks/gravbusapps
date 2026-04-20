import React from 'react'
import { Plug } from 'lucide-react'
import type { TabProps } from './types'
import { FunctionToolsPanel } from './FunctionToolsPanel'
import { McpToolsPanel } from './McpToolsPanel'

export const CapabilitiesTab: React.FC<TabProps> = ({ context, state, actions, catalogs }) => {
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-capabilities-tab">
      <McpToolsPanel context={context} state={state} actions={actions} catalogs={catalogs} />
      <FunctionToolsPanel
        state={state}
        actions={actions}
        catalogs={catalogs}
        title="Connectors"
        description="External systems exposed via Newwork Connect (Anypoint Connect & Data Bridge)"
        headerIcon={Plug}
        mode="connectors"
        groupByConnectorKind
        testIdPrefix="agent-builder-connectors"
      />
      <FunctionToolsPanel
        state={state}
        actions={actions}
        catalogs={catalogs}
        mode="non-connectors"
        description="Business functions the agent can call"
      />
    </div>
  )
}

export default CapabilitiesTab
