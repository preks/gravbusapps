/**
 * CompleteView - Post-build canvas with tabbed navigation.
 * The chat side panel (handled by parent) replaces the old CompleteFixChat.
 * Tabs: Screen (default), Data Model, Functions, Task Expert, Flow.
 */

import React, { useMemo, useState, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { Upload, Loader2, CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { ScreenPreview } from '../preview/ScreenPreview'
import { CanvasTabHeader } from '../canvas/CanvasTabHeader'
import { ComponentPlaceholderList } from './ComponentPlaceholderList'
import { OverviewTab } from './OverviewTab'
import { AppIconBadge } from '../ui/AppIconBadge'
import { AppAboutView } from './AppAboutView'
import { DataModelPreview } from '@/common/components/ai-builder/data-model-preview/DataModelPreview'
import { FunctionPreview } from '@/common/components/ai-builder/function-preview/FunctionPreview'
import { FlowPreview } from '@/common/components/ai-builder/flow-preview/FlowPreview'
import { AgentPreview } from '@/common/components/ai-builder/agent-preview/AgentPreview'
import { AgentMeshPreview } from '@/common/components/ai-builder/agent-mesh-preview/AgentMeshPreview'
import { PreviewTemplate } from '@/common/components/ai-builder/preview-template/PreviewTemplate'
import { mapDataModelSpec, mapFunctionSpec, mapFlowSpec, mapAgentSpec } from './componentSpecPreviewMappers'
import type { ComponentSpec, CanvasTab } from '../../types'
import { getVisibleCanvasTabs } from '../../types'
import type { AppMetadata, BuildAnalysis, UserSummary } from '../../types/build'

export interface CompleteViewProps {
  components: ComponentSpec[]
  jobId?: string
  buildDuration: number
  prompt?: string
  accessToken?: string
  userInfo?: any
  builtBy?: any
  builtByLoading?: boolean
  /** Incremented by the chat panel when an AI fix modifies screen code */
  previewRefreshToken?: number
  appMetadata?: AppMetadata
  analysis?: BuildAnalysis
  userSummary?: UserSummary
  createdAt?: string
  isPublishing?: boolean
  publishSuccess?: boolean
  publishError?: string | null
  onPublish?: () => void | Promise<void>
  onReset?: () => void
  isRestoringSession?: boolean
}

function firstScreenWithSession(components: ComponentSpec[]): ComponentSpec | null {
  return components.find(c => c.type === 'screen' && c.metadata?.sessionId && c.metadata?.repoId) ?? null
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  components,
  accessToken,
  userInfo,
  builtBy,
  builtByLoading,
  previewRefreshToken,
  appMetadata,
  analysis,
  userSummary,
  createdAt,
  prompt,
  isPublishing,
  publishSuccess,
  publishError,
  onPublish,
  isRestoringSession = false
}) => {
  const [activeTab, setActiveTab] = useState<CanvasTab>('screen')
  const visibleTabs = useMemo(() => getVisibleCanvasTabs(components), [components])
  const previewComponent = useMemo(() => firstScreenWithSession(components), [components])

  useEffect(() => {
    const visibleIds = visibleTabs.map(t => t.id)
    if (visibleIds.length > 0 && !visibleIds.includes(activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'build-plan':
        return <OverviewTab components={components} userSummary={userSummary} prompt={prompt} />

      case 'screen':
        if (previewComponent && accessToken) {
          return (
            <ScreenPreview
              component={previewComponent}
              accessToken={accessToken}
              userInfo={userInfo}
              refreshToken={previewRefreshToken}
              isRestoringSession={isRestoringSession}
            />
          )
        }
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:px-6">
            {accessToken ? 'No screen preview available for this build.' : 'Sign in to see preview.'}
          </div>
        )

      case 'data-model': {
        const built = components.filter(
          c => c.type === 'data_model' && (c.status === 'completed' || c.status === 'reused') && c.dataModelSpec
        )
        if (built.length === 0) {
          return (
            <ComponentPlaceholderList
              components={components.filter(c => c.type === 'data_model')}
              typeLabel="Data Model"
              emptyMessage="No data models were built."
            />
          )
        }
        const items = built.map(c => ({
          id: c.id,
          label: c.dataModelSpec!.name,
          definition: mapDataModelSpec(c.dataModelSpec!)
        }))
        return (
          <div className="gba:h-full gba:overflow-y-auto gba:p-4">
            <DataModelPreview items={items} accessToken={accessToken} />
          </div>
        )
      }

      case 'functions': {
        const eligible = components.filter(
          c =>
            c.type === 'function' &&
            (c.status === 'completed' || c.status === 'reused') &&
            (c.functionSpec || c.existingId || c.createdId)
        )
        if (eligible.length === 0) {
          return (
            <ComponentPlaceholderList
              components={components.filter(c => c.type === 'function')}
              typeLabel="Function"
              emptyMessage="No functions were built."
            />
          )
        }
        return (
          <div className="gba:h-full gba:overflow-y-auto gba:p-4">
            <PreviewTemplate items={eligible.map(c => ({ id: c.id, label: c.functionSpec?.name ?? c.name }))}>
              {selectedId => {
                const comp = eligible.find(c => c.id === selectedId) ?? eligible[0]
                const effectiveId = comp.createdId ?? comp.existingId ?? comp.id
                if (comp.functionSpec) {
                  return (
                    <FunctionPreview
                      key={comp.id}
                      accessToken={accessToken ?? ''}
                      definition={mapFunctionSpec(comp.functionSpec, effectiveId)}
                    />
                  )
                }
                return <FunctionPreview key={comp.id} accessToken={accessToken ?? ''} functionId={effectiveId} />
              }}
            </PreviewTemplate>
          </div>
        )
      }

      case 'task-expert': {
        const eligible = components.filter(
          c =>
            c.type === 'agent' &&
            (c.status === 'completed' || c.status === 'reused') &&
            (c.agentSpec || c.existingId || c.createdId)
        )
        if (eligible.length === 0) {
          return (
            <ComponentPlaceholderList
              components={components.filter(c => c.type === 'agent')}
              typeLabel="Task Expert"
              emptyMessage="No task experts were built."
            />
          )
        }
        return (
          <div className="gba:h-full gba:overflow-y-auto gba:p-4">
            <PreviewTemplate items={eligible.map(c => ({ id: c.id, label: c.agentSpec?.name ?? c.name }))}>
              {selectedId => {
                const comp = eligible.find(c => c.id === selectedId) ?? eligible[0]
                const effectiveId = comp.createdId ?? comp.existingId ?? comp.id
                if (comp.agentSpec) {
                  return (
                    <AgentPreview key={comp.id} accessToken={accessToken ?? ''} prompt={mapAgentSpec(comp.agentSpec)} />
                  )
                }
                return <AgentPreview key={comp.id} accessToken={accessToken ?? ''} agentId={effectiveId} />
              }}
            </PreviewTemplate>
          </div>
        )
      }

      case 'flow': {
        const eligible = components.filter(
          c =>
            c.type === 'flow' &&
            (c.status === 'completed' || c.status === 'reused') &&
            (c.flowSpec || c.existingId || c.createdId)
        )
        if (eligible.length === 0) {
          return (
            <ComponentPlaceholderList
              components={components.filter(c => c.type === 'flow')}
              typeLabel="Flow"
              emptyMessage="No flows were built."
            />
          )
        }
        return (
          <div className="gba:h-full gba:min-h-0 gba:flex gba:flex-col gba:overflow-y-auto gba:p-4">
            <PreviewTemplate items={eligible.map(c => ({ id: c.id, label: c.flowSpec?.name ?? c.name }))}>
              {selectedId => {
                const comp = eligible.find(c => c.id === selectedId) ?? eligible[0]
                const effectiveId = comp.createdId ?? comp.existingId ?? comp.id
                if (comp.flowSpec) {
                  const specTemplate = { ...mapFlowSpec(comp.flowSpec), id: effectiveId }
                  return (
                    <FlowPreview
                      key={comp.id}
                      accessToken={accessToken ?? ''}
                      userInfo={userInfo}
                      template={specTemplate}
                    />
                  )
                }
                return (
                  <FlowPreview key={comp.id} accessToken={accessToken ?? ''} userInfo={userInfo} flowId={effectiveId} />
                )
              }}
            </PreviewTemplate>
          </div>
        )
      }

      case 'agent-mesh': {
        const builtAgents = components.filter(
          c =>
            c.type === 'agent' && (c.status === 'completed' || c.status === 'reused') && (c.createdId || c.existingId)
        )
        const agentIds = builtAgents.map(c => c.createdId ?? c.existingId ?? c.id)
        return (
          <AgentMeshPreview
            accessToken={accessToken ?? ''}
            agentIds={agentIds}
            data-testid="complete-view-agent-mesh-preview"
          />
        )
      }

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
            builtBy={builtBy}
            builtByLoading={builtByLoading}
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
          {(() => {
            if (publishSuccess) {
              return (
                <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                  <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-success gba:font-medium">
                    <CheckCircle2 className="gba:w-4 gba:h-4" />
                    Published!
                  </span>
                  {previewComponent?.resourceUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateTo(buildPlatformUrl(previewComponent.resourceUrl!))}
                    >
                      <ExternalLink className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                      Open App
                    </Button>
                  )}
                </div>
              )
            }
            if (publishError) {
              return (
                <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
                  <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-sm gba:text-destructive gba:font-medium">
                    <XCircle className="gba:w-4 gba:h-4 gba:shrink-0" />
                    Publish failed
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPublish}
                    disabled={isPublishing}
                    aria-label={isPublishing ? 'Retry publishing' : undefined}
                  >
                    {isPublishing ? <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" /> : 'Retry'}
                  </Button>
                </div>
              )
            }
            return (
              <Button
                onClick={onPublish}
                disabled={isPublishing}
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
            )
          })()}
        </div>
      )}

      {/* Tab Header */}
      <div className="gba:bg-background gba:border-b gba:border-border">
        <CanvasTabHeader activeTab={activeTab} onTabChange={setActiveTab} tabs={visibleTabs} />
      </div>

      {/* Tab Content — position:relative so DataFlowDiagram can use absolute inset:0; no key so content switches without remount flash */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:relative">{renderTabContent()}</div>
    </div>
  )
}
