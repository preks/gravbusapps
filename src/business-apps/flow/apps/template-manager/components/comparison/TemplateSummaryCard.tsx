/**
 * TemplateSummaryCard Component
 * Displays comparison summary statistics
 */

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { ComparisonSummary } from '../../types/comparison'

interface TemplateSummaryCardProps {
  summary: ComparisonSummary
}

export const TemplateSummaryCard: React.FC<TemplateSummaryCardProps> = ({ summary }) => {
  const identicalPercentage =
    summary.totalTemplates > 0 ? Math.round((summary.identical / summary.totalTemplates) * 100) : 0

  return (
    <Card className="gba:mb-6">
      <CardHeader>
        <CardTitle>Comparison Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-primary">{summary.totalTemplates}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Total Templates</div>
          </div>

          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-success">{summary.identical}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Identical ({identicalPercentage}%)</div>
          </div>

          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-warning">
              {summary.versionDrift + summary.sourceAhead}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">Version Drift</div>
          </div>

          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-destructive">{summary.contentDrift}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Content Drift</div>
          </div>

          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-info">{summary.newInSource}</div>
            <div className="gba:text-sm gba:text-muted-foreground">New in Source</div>
          </div>

          <div>
            <div className="gba:text-2xl gba:font-bold gba:text-secondary">{summary.newInTarget}</div>
            <div className="gba:text-sm gba:text-muted-foreground">New in Target</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
