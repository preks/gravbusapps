import React from 'react'
import { Card, CardContent, Spinner } from '@newwork/nw-design-system'

export interface CdnPathRow {
  path: string
  inDev: boolean
  inProd: boolean
}

interface EmptyComponentTableProps {
  rows: CdnPathRow[]
  dataTestIdPrefix?: string
  loadingCdn?: boolean
}

const TITLE = 'CDN without Components'
const DESCRIPTION =
  'Paths that exist in the CDN index (dev or prod) but do not appear as component path on any component in the Components list. These may be orphaned or legacy bundle entries.'

export const EmptyComponentTable: React.FC<EmptyComponentTableProps> = ({
  rows,
  dataTestIdPrefix = 'empty-component-table',
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
    ) : rows.length === 0 ? (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        No CDN-only paths (every path in the CDN appears as component path in Components)
      </div>
    ) : (
      <div
        className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-4"
        data-testid={`${dataTestIdPrefix}-grid`}
      >
        {rows.map(({ path, inDev, inProd }) => (
          <Card
            key={path}
            className="gba:transition-shadow hover:gba:shadow-md"
            data-testid={`${dataTestIdPrefix}-path-${path.replace(/\//g, '-')}`}
          >
            <CardContent className="gba:p-4">
              <div className="gba:space-y-2">
                <p className="gba:font-medium gba:text-sm gba:break-all" title={path}>
                  <code className="gba:text-xs">/{path}</code>
                </p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {inDev && inProd ? 'DEV, PROD' : inDev ? 'DEV' : 'PROD'}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
)
