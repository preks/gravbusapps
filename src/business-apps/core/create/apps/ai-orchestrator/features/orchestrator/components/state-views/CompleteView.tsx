/**
 * CompleteView - Post-build canvas with tabbed navigation.
 * The chat side panel (handled by parent) replaces the old CompleteFixChat.
 * Tabs: Screen (default), Data Model, Functions, Task Expert, Flow.
 */

import React, { useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { ScreenPreview } from '../preview/ScreenPreview'
import { CanvasTabHeader } from '../canvas/CanvasTabHeader'
import { ComponentPlaceholderList } from './ComponentPlaceholderList'
import { BuildPlanTab } from './BuildPlanTab'
import { DataFlowDiagram } from './DataFlowDiagram'
import { AppIconBadge } from '../ui/AppIconBadge'
import { AppAboutView } from './AppAboutView'
import type { ComponentSpec, CanvasTab } from '../../types'
import type { AppMetadata, BuildAnalysis, UserSummary } from '../../types/build'

export interface CompleteViewProps {
  components: ComponentSpec[]
  jobId?: string
  buildDuration: number
  prompt?: string
  accessToken?: string
  userInfo?: any
  /** Incremented by the chat panel when an AI fix modifies screen code */
  previewRefreshToken?: number
  appMetadata?: AppMetadata
  analysis?: BuildAnalysis
  userSummary?: UserSummary
  createdAt?: string
  isPublishing?: boolean
  publishSuccess?: boolean
  publishError?: string | null
  onPublish?: () => void
  onReset?: () => void
}

function firstScreenWithSession(components: ComponentSpec[]): ComponentSpec | null {
  return components.find(c => c.type === 'screen' && c.metadata?.sessionId && c.metadata?.repoId) ?? null
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  accessToken,
  userInfo,
  previewRefreshToken,
  appMetadata,
  analysis,
  userSummary,
  createdAt,
  prompt,
  isPublishing,
  publishSuccess,
  publishError,
  onPublish
}) => {
  const [activeTab, setActiveTab] = useState<CanvasTab>('screen')
  const previewComponent = useMemo(() => firstScreenWithSession(components), [components])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'build-plan':
        return <BuildPlanTab components={components} userSummary={userSummary} analysis={analysis} prompt={prompt} />

      case 'data-flow':
        return <DataFlowDiagram components={components} />

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

      case 'about':
        return (
          <AppAboutView
            appMetadata={appMetadata}
            components={components}
            analysis={analysis}
            userSummary={userSummary}
            originalPrompt={prompt}
            createdAt={createdAt}
            userInfo={userInfo}
            accessToken={accessToken}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
      {/* App Identity Banner */}
      {appMetadata && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-background">
          <AppIconBadge iconName={appMetadata.icon} size="md" />
          <div className="gba:min-w-0 gba:flex-1">
            <p className="gba:font-semibold gba:text-foreground gba:text-base gba:leading-tight">{appMetadata.name}</p>
            <p className="gba:text-sm gba:text-muted-foreground gba:truncate">{appMetadata.description}</p>
          </div>
          {publishSuccess ? (
            <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-success gba:font-medium gba:shrink-0">
              <CheckCircle2 className="gba:w-4 gba:h-4" />
              Published!
            </span>
          ) : (
            <Button
              onClick={onPublish}
              disabled={isPublishing}
              title={publishError ?? undefined}
              className="gba:shrink-0 gba:gap-2 gba:rounded-2xl gba:bg-linear-to-r gba:from-blue-500 gba:to-indigo-600 gba:text-white gba:border-0 gba:px-5 gba:font-semibold gba:shadow-none gba:hover:opacity-90"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish App
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Tab Header */}
      <div className="gba:bg-background gba:border-b gba:border-border">
        <CanvasTabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content — position:relative so DataFlowDiagram can use absolute inset:0 */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:relative">{renderTabContent()}</div>
    </div>
  )
}
