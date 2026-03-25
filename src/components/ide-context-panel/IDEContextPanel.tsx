import React from 'react'
import { ShellContextPanel, useContextPanel } from '@newwork/nw-design-system'
import { ChatWithCalendar } from '@/business-apps/platform/apps/chat'

export interface UserInfoProps {
  id?: string
  name?: string
  email?: string
  [key: string]: any
}

export interface IDEContextPanelProps {
  accessToken: string
  userInfo?: UserInfoProps
  enabled?: boolean
}

export const IDEContextPanel: React.FC<IDEContextPanelProps> = ({ accessToken, userInfo, enabled = false }) => {
  const contextPanel = useContextPanel()

  return (
    <ShellContextPanel className="gba:overflow-hidden">
      {enabled ? (
        <div className={contextPanel.isVisible ? 'gba:h-full gba:min-h-0' : 'gba:hidden'}>
          <ChatWithCalendar accessToken={accessToken} userInfo={userInfo} prefixDataTestId="ide-context-panel" />
        </div>
      ) : null}
    </ShellContextPanel>
  )
}
