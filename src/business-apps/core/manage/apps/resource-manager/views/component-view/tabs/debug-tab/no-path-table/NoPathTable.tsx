import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import type { Component } from '@/common/data/resources/types/component.types'

interface NoPathTableProps {
  components: Component[]
  dataTestIdPrefix?: string
}

const TITLE = 'No path'
const DESCRIPTION =
  'Components that have no component path set. They are excluded from the Bundles view and listed here for review or correction.'

export const NoPathTable: React.FC<NoPathTableProps> = ({ components, dataTestIdPrefix = 'no-path-table' }) => (
  <div className="gba:p-6">
    <header className="gba:mb-6">
      <h2 className="gba:text-lg gba:font-semibold gba:tracking-tight">{TITLE}</h2>
      <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{DESCRIPTION}</p>
    </header>
    {components.length === 0 ? (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">No components without component path</div>
    ) : (
      <div
        className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4"
        data-testid={`${dataTestIdPrefix}-grid`}
      >
        {components.map(c => (
          <Card
            key={c.id}
            className="gba:transition-shadow hover:gba:shadow-md"
            data-testid={`${dataTestIdPrefix}-${c.id}`}
          >
            <CardContent className="gba:p-4">
              <div className="gba:space-y-2">
                <h3 className="gba:font-semibold gba:text-base gba:truncate">{c.name || '-'}</h3>
                <p className="gba:text-xs gba:text-muted-foreground">{c.screenKey || '-'}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{c.type ?? 'SCREEN'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
)
