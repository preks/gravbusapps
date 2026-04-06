import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'
import type { Component } from '@/common/data/resources/types/component.types'

const normalizePath = (p: string): string => (p ?? '').trim().replace(/^\//, '') || ''

interface MissingComponentTableProps {
  components: Component[]
  dataTestIdPrefix?: string
  loadingCdn?: boolean
}

const TITLE = 'Without CDN index'
const DESCRIPTION =
  'Components that have a component path set, but this path does not exist in the CDN index (dev or prod). These screens may be missing from the deployed bundle or the path may be wrong.'

export const MissingComponentTable: React.FC<MissingComponentTableProps> = ({
  components,
  dataTestIdPrefix = 'missing-component-table',
  loadingCdn = false
}) => (
  <div className="gba:p-6">
    <header className="gba:mb-6">
      <h2 className="gba:text-lg gba:font-semibold gba:tracking-tight">{TITLE}</h2>
      <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{DESCRIPTION}</p>
    </header>
    {loadingCdn ? (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-12 gba:text-muted-foreground"
        data-testid={`${dataTestIdPrefix}-loading-cdn`}
      >
        <Spinner size="sm" />
        <span>Loading CDN data...</span>
      </div>
    ) : components.length === 0 ? (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        All components have a matching index in the CDN
      </div>
    ) : (
      <div
        className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4"
        data-testid={`${dataTestIdPrefix}-grid`}
      >
        {components.map(c => {
          const path = normalizePath(c.screenComponents?.formDefinition?.componentPath ?? '')
          return (
            <Card
              key={c.id}
              className="gba:transition-shadow hover:gba:shadow-md"
              data-testid={`${dataTestIdPrefix}-component-${c.id}`}
            >
              <CardContent className="gba:p-4">
                <div className="gba:space-y-2">
                  <h3 className="gba:font-semibold gba:text-base gba:truncate">{c.name || '-'}</h3>
                  <p className="gba:text-sm gba:text-muted-foreground gba:break-all" title={path}>
                    <code className="gba:text-xs">/{path}</code>
                  </p>
                  <p className="gba:text-xs gba:text-muted-foreground">{c.screenKey || '-'}</p>
                  <p className="gba:text-xs gba:text-muted-foreground">{c.type ?? 'SCREEN'}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )}
  </div>
)
