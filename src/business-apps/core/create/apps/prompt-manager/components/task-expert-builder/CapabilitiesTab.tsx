import React from 'react'
import type { TabProps } from './types'
import { ToolsPickerPanel } from './ToolsPickerPanel'
import { McpToolsPanel } from './McpToolsPanel'

export const CapabilitiesTab: React.FC<TabProps> = ({ context, state, actions, catalogs }) => {
  return (
    <div className="gba:space-y-6" data-testid="agent-builder-capabilities-tab">
      <ToolsPickerPanel state={state} actions={actions} catalogs={catalogs} />
      <McpToolsPanel context={context} state={state} actions={actions} catalogs={catalogs} />
    </div>
  )
}

export default CapabilitiesTab
