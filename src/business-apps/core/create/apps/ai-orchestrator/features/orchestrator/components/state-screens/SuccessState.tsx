/**
 * SuccessState - Celebratory success screen with navigation
 * Shows completed components and provides clear next actions
 */

import React from 'react'
import {
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Plus,
  Recycle,
  Clock,
  Eye,
  Monitor,
  Bot,
  Code2,
  Workflow,
  Database
} from 'lucide-react'
import { Card, CardContent, Button, Badge, cn, useTranslation } from '@newwork/nw-design-system'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { ComponentSpec, ComponentType } from '../../types'
import translations from '../../../../_i18n'

export interface SuccessStateProps {
  components: ComponentSpec[]
  buildDuration: number
  completedCount: number
  reusedCount: number
  onBuildMore: () => void
  className?: string
  'data-testid'?: string
}

const componentTypeInfo: Record<
  ComponentType,
  { icon: React.ElementType; label: string; route: (id: string) => string }
> = {
  screen: {
    icon: Monitor,
    label: 'Screen',
    route: (id: string) => `/platform/create/screen-builder?screenId=${id}`
  },
  agent: {
    icon: Bot,
    label: 'Agent',
    route: (id: string) => `/platform/create/prompt-manager?expertId=${id}`
  },
  function: {
    icon: Code2,
    label: 'Function',
    route: (id: string) => `/platform/create/function-manager?functionId=${id}`
  },
  flow: {
    icon: Workflow,
    label: 'Flow',
    route: (id: string) => buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { flowId: id })
  },
  data_model: {
    icon: Database,
    label: 'Data Model',
    route: (id: string) => buildPlatformUrl(Navigation.CREATE_CUSTOM_DATA_MANAGER, { modelId: id })
  }
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  components,
  buildDuration,
  completedCount,
  reusedCount,
  onBuildMore,
  className,
  'data-testid': testId = 'success-state'
}) => {
  const { t } = useTranslation(translations)
  const resolveTypeInfo = (type: ComponentType) => {
    const base = componentTypeInfo[type]
    if (type === 'agent') return { ...base, label: t('type-label-agent') }
    return base
  }
  const createdComponents = components.filter(c => c.status === 'completed' && c.createdId)
  const reusedComponents = components.filter(c => c.status === 'reused')

  const handleOpenComponent = (component: ComponentSpec) => {
    // For screens with resourceUrl, navigate directly to the built screen
    if (component.type === 'screen' && component.resourceUrl) {
      navigateTo(buildPlatformUrl(component.resourceUrl))
      return
    }

    // For other components or screens without resourceUrl, use admin route
    if (!component.createdId && !component.existingId) return

    const id = component.createdId || component.existingId!
    const route = componentTypeInfo[component.type].route(id)
    navigateTo(buildPlatformUrl(route))
  }

  return (
    <div className={cn('gba:space-y-6 gba:animate-in gba:fade-in gba:duration-500', className)} data-testid={testId}>
      {/* Design Preview Header */}
      <Card className="gba:border-border">
        <CardContent className="gba:p-0">
          {/* Design Preview Placeholder */}
          <div className="gba:relative gba:w-full gba:aspect-video gba:bg-muted gba:flex gba:items-center gba:justify-center gba:border-b gba:border-border">
            <div className="gba:text-center gba:space-y-3">
              <Monitor className="gba:w-16 gba:h-16 gba:text-muted-foreground gba:mx-auto" />
              <p className="gba:text-sm gba:text-muted-foreground">Design Preview</p>
            </div>
          </div>

          {/* Design Info */}
          <div className="gba:p-6">
            <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
              <div>
                <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-1">
                  {createdComponents[0]?.name || 'Your Design'}
                </h2>
                <p className="gba:text-sm gba:text-muted-foreground">
                  Built {completedCount} component{completedCount === 1 ? '' : 's'} in{' '}
                  {Math.round(buildDuration / 1000)}s
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => createdComponents[0] && handleOpenComponent(createdComponents[0])}
                className="gba:min-w-[120px]"
              >
                <ExternalLink className="gba:w-4 gba:h-4 gba:mr-2" />
                Open Design
              </Button>
            </div>

            {/* Quick stats */}
            <div className="gba:flex gba:items-center gba:gap-6 gba:pt-4 gba:border-t gba:border-border">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground">
                    {Math.round(buildDuration / 1000)}s
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">Build Time</div>
                </div>
              </div>

              {reusedCount > 0 && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Recycle className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">{reusedCount}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">Reused</div>
                  </div>
                </div>
              )}

              <div className="gba:flex gba:items-center gba:gap-2">
                <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground">{completedCount}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Components</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Created components */}
      {createdComponents.length > 0 && (
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <FolderOpen className="gba:w-5 gba:h-5" />
            Created Components ({createdComponents.length})
          </h3>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {createdComponents.map(component => {
              const typeInfo = resolveTypeInfo(component.type)
              const Icon = typeInfo.icon

              return (
                <Card
                  key={component.id}
                  className="gba:group gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:shadow-lg hover:gba:border-info/50"
                  onClick={() => handleOpenComponent(component)}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      {/* Icon */}
                      <div className="gba:p-2 gba:rounded-lg gba:bg-info-secondary group-hover:gba:bg-info/20 gba:transition-colors">
                        <Icon className="gba:w-5 gba:h-5 gba:text-info" />
                      </div>

                      {/* Content */}
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <h4 className="gba:font-medium gba:text-foreground gba:truncate">{component.name}</h4>
                          <Badge variant="secondary" className="gba:shrink-0">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">
                          {component.description}
                        </p>
                        <div className="gba:space-y-1">
                          {/* Resource URL (for screens) */}
                          {component.resourceUrl && (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <ExternalLink className="gba:w-3 gba:h-3 gba:text-info" />
                              <code className="gba:text-xs gba:text-info gba:font-mono">{component.resourceUrl}</code>
                            </div>
                          )}
                          {/* Component ID */}
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <code className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                              {component.createdId?.slice(0, 16)}...
                            </code>
                          </div>
                          {/* Azure CDN URL (if published) */}
                          {component.azureUrl && (
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                              <span>CDN:</span>
                              <a
                                href={component.azureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gba:text-info hover:gba:underline gba:font-mono gba:truncate"
                                onClick={e => e.stopPropagation()}
                              >
                                {component.azureUrl.slice(0, 40)}...
                              </a>
                            </div>
                          )}
                          {/* Published files count (only when orchestration published; publish is now from preview) */}
                          {component.publishedFileCount != null && component.publishedFileCount > 0 && (
                            <div className="gba:text-xs gba:text-muted-foreground">
                              Published {component.publishedFileCount} files
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Open button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                        onClick={e => {
                          e.stopPropagation()
                          handleOpenComponent(component)
                        }}
                      >
                        <ExternalLink className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Reused components */}
      {reusedComponents.length > 0 && (
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <Recycle className="gba:w-5 gba:h-5 gba:text-success" />
            Reused Components ({reusedComponents.length})
          </h3>
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            {reusedComponents.map(component => {
              const typeInfo = resolveTypeInfo(component.type)
              const Icon = typeInfo.icon

              return (
                <Card
                  key={component.id}
                  className="gba:group gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:shadow-lg hover:gba:border-success/50"
                  onClick={() => handleOpenComponent(component)}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <div className="gba:p-2 gba:rounded-lg gba:bg-success-secondary">
                        <Icon className="gba:w-5 gba:h-5 gba:text-success" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <h4 className="gba:font-medium gba:text-foreground gba:truncate">{component.name}</h4>
                          <Badge variant="secondary" className="gba:bg-success-secondary gba:text-success gba:shrink-0">
                            Reused
                          </Badge>
                        </div>
                        <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">
                          {component.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                      >
                        <Eye className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:pt-4">
        <Button size="lg" onClick={onBuildMore} className="gba:min-w-[200px]">
          <Plus className="gba:w-5 gba:h-5 gba:mr-2" />
          Build Something Else
        </Button>
      </div>
    </div>
  )
}

export default SuccessState
