/**
 * CompleteView - Post-build canvas with tabbed navigation.
 * The chat side panel (handled by parent) replaces the old CompleteFixChat.
 * Tabs: Screen (default), Data Model, Functions, Task Expert, Flow.
 */

import React, { useMemo, useState } from 'react'
import { ScreenPreview } from '../preview/ScreenPreview'
import { CanvasTabHeader } from '../canvas/CanvasTabHeader'
import { ComponentPlaceholderList } from './ComponentPlaceholderList'
import type { ComponentSpec, CanvasTab } from '../../types'

export interface CompleteViewProps {
  components: ComponentSpec[]
  jobId?: string
  buildDuration: number
  prompt?: string
  accessToken?: string
  userInfo?: any
  /** Incremented by the chat panel when an AI fix modifies screen code */
  previewRefreshToken?: number
}

function firstScreenWithSession(components: ComponentSpec[]): ComponentSpec | null {
  return components.find(c => c.type === 'screen' && c.metadata?.sessionId && c.metadata?.repoId) ?? null
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  accessToken,
  userInfo,
  previewRefreshToken
}) => {
  const [activeTab, setActiveTab] = useState<CanvasTab>('screen')
  const previewComponent = useMemo(() => firstScreenWithSession(components), [components])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'screen':
        if (previewComponent && accessToken) {
          return (
            <ScreenPreview
              component={previewComponent}
              accessToken={accessToken}
              userInfo={userInfo}
              refreshToken={previewRefreshToken}
            />
          )
        }
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:px-6">
            {accessToken ? 'No screen preview available for this build.' : 'Sign in to see preview.'}
          </div>
        )

      case 'data-model':
        return (
          <ComponentPlaceholderList
            components={components.filter(c => c.type === 'data_model')}
            typeLabel="Data Model"
            emptyMessage="No data models were built."
          />
        )

      case 'functions':
        return (
          <ComponentPlaceholderList
            components={components.filter(c => c.type === 'function')}
            typeLabel="Function"
            emptyMessage="No functions were built."
          />
        )

      case 'task-expert':
        return (
          <ComponentPlaceholderList
            components={components.filter(c => c.type === 'agent')}
            typeLabel="Task Expert"
            emptyMessage="No task experts were built."
          />
        )

      case 'flow':
        return (
          <ComponentPlaceholderList
            components={components.filter(c => c.type === 'flow')}
            typeLabel="Flow"
            emptyMessage="No flows were built."
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
      {/* Tab Header */}
      <div className="gba:bg-background gba:border-b gba:border-border">
        <CanvasTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto">{renderTabContent()}</div>
    </div>
  )
}
