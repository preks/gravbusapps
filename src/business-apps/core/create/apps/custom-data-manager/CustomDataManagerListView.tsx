import React, { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@newwork/nw-design-system'
import { Database, Plus, Sparkles, FolderOpen } from 'lucide-react'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import type { CustomDataNamespace } from './types'

type ListSubView = 'create' | 'namespaces'

interface CustomDataManagerListViewProps {
  namespaces: CustomDataNamespace[]
  onSelectNamespace: (namespace: string) => void
  onOpenCreateNamespace: () => void
  onOpenAiGenerator: (namespace?: string) => void
  'data-testid'?: string
}

export const CustomDataManagerListView: React.FC<CustomDataManagerListViewProps> = ({
  namespaces,
  onSelectNamespace,
  onOpenCreateNamespace,
  onOpenAiGenerator,
  'data-testid': testId = 'custom-data-manager-list'
}) => {
  const [subView, setSubView] = useState<ListSubView>('namespaces')

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full" data-testid={testId}>
      {/* Hero */}
      <div className="gba:relative gba:overflow-hidden gba:shrink-0">
        <PremiumHeroBackground data-testid={`${testId}-hero-bg`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />
        <div className="gba:relative gba:px-6 gba:py-5">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/15">
                <Database className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-0.5">
                <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                  DATA MODELS
                </span>
                <div className="gba:text-xl gba:font-semibold gba:text-white">Custom Data Manager</div>
                <span className="gba:text-sm gba:text-white/80">Design and manage your custom data schemas</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              tone="inverse"
              onClick={onOpenCreateNamespace}
              data-testid={`${testId}-hero-create-ns`}
              type="button"
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              New Namespace
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:bg-background">
          <div
            className="gba:shrink-0 gba:border-b gba:border-border gba:bg-muted/50 gba:px-4 gba:sm:px-6 gba:lg:px-8"
            role="tablist"
            data-testid={`${testId}-tabs`}
          >
            <div className="gba:flex gba:gap-1">
              <TabButton
                active={subView === 'create'}
                onClick={() => setSubView('create')}
                icon={<Sparkles className="gba:h-4 gba:w-4" />}
                label="Create"
                testId={`${testId}-tab-create`}
              />
              <TabButton
                active={subView === 'namespaces'}
                onClick={() => setSubView('namespaces')}
                icon={<FolderOpen className="gba:h-4 gba:w-4" />}
                label="Namespaces"
                testId={`${testId}-tab-namespaces`}
              />
            </div>
          </div>

          <div className="gba:flex-1 gba:min-h-0 gba:overflow-auto">
            {subView === 'create' ? (
              <CreateTabContent onOpenAiGenerator={onOpenAiGenerator} testId={testId} />
            ) : (
              <NamespacesTabContent namespaces={namespaces} onSelectNamespace={onSelectNamespace} testId={testId} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TabButton: React.FC<{
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  testId: string
}> = ({ active, onClick, icon, label, testId }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    className={`gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:text-sm gba:font-medium gba:border-b-2 gba:transition-colors gba:-mb-px ${
      active
        ? 'gba:border-primary gba:text-foreground'
        : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground'
    }`}
    onClick={onClick}
    data-testid={testId}
  >
    {icon}
    {label}
  </button>
)

const CreateTabContent: React.FC<{
  onOpenAiGenerator: (namespace?: string) => void
  testId: string
}> = ({ onOpenAiGenerator, testId }) => (
  <div className="gba:max-w-4xl gba:mx-auto gba:px-6 gba:py-8">
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
      <Card
        className="gba:cursor-pointer gba:transition-shadow hover:gba:shadow-md"
        onClick={() => onOpenAiGenerator()}
        data-testid={`${testId}-create-ai`}
      >
        <CardContent className="gba:pt-6 gba:text-center">
          <Sparkles className="gba:h-10 gba:w-10 gba:mx-auto gba:text-primary gba:mb-3" />
          <h3 className="gba:font-semibold gba:mb-1">Create with AI</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            Describe your data structure in natural language and let AI generate the schema.
          </p>
        </CardContent>
      </Card>
      <Card
        className="gba:cursor-pointer gba:transition-shadow hover:gba:shadow-md"
        onClick={() => onOpenAiGenerator()}
        data-testid={`${testId}-create-scratch`}
      >
        <CardContent className="gba:pt-6 gba:text-center">
          <Database className="gba:h-10 gba:w-10 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
          <h3 className="gba:font-semibold gba:mb-1">Build from Scratch</h3>
          <p className="gba:text-sm gba:text-muted-foreground">
            Manually define your entities, columns, and relationships step by step.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
)

const NamespacesTabContent: React.FC<{
  namespaces: CustomDataNamespace[]
  onSelectNamespace: (ns: string) => void
  testId: string
}> = ({ namespaces, onSelectNamespace, testId }) => (
  <div className="gba:max-w-4xl gba:mx-auto gba:px-6 gba:py-6">
    {namespaces.length === 0 ? (
      <div className="gba:text-center gba:py-12">
        <FolderOpen className="gba:h-12 gba:w-12 gba:mx-auto gba:text-muted-foreground gba:mb-3" />
        <p className="gba:text-muted-foreground">No namespaces yet. Create one to get started.</p>
      </div>
    ) : (
      <div className="gba:space-y-2">
        {namespaces.map(ns => {
          return (
            <Card
              key={ns.namespace}
              className="gba:cursor-pointer gba:transition-all hover:gba:shadow-md hover:gba:border-primary/50"
              onClick={() => onSelectNamespace(ns.namespace)}
              data-testid={`${testId}-ns-${ns.namespace}`}
            >
              <CardContent className="gba:py-4 gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <FolderOpen className="gba:h-5 gba:w-5 gba:text-primary" />
                  <div>
                    <p className="gba:font-medium">{ns.display_name || ns.namespace}</p>
                    {ns.description && <p className="gba:text-xs gba:text-muted-foreground">{ns.description}</p>}
                    <p className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:mt-0.5">{ns.namespace}</p>
                  </div>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Badge variant="outline" className="gba:text-xs">
                    Namespace
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )}
  </div>
)
