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
      <CardContent className="gba:space-y-4">
        {/* Instance Counts */}
        <div className="gba:flex gba:items-center gba:gap-6 gba:pb-4 gba:border-b">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-3 gba:w-3 gba:rounded-full gba:bg-primary"></div>
            <span className="gba:text-sm gba:font-medium">Source:</span>
            <span className="gba:text-lg gba:font-bold gba:text-primary">{summary.sourceCount}</span>
            <span className="gba:text-sm gba:text-muted-foreground">templates</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:h-3 gba:w-3 gba:rounded-full gba:bg-success"></div>
            <span className="gba:text-sm gba:font-medium">Target:</span>
            <span className="gba:text-lg gba:font-bold gba:text-success">{summary.targetCount}</span>
            <span className="gba:text-sm gba:text-muted-foreground">templates</span>
          </div>
        </div>

        {/* Comparison Stats */}
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-6">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-primary">{summary.totalTemplates}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Total Compared</div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-success">{summary.identical}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Identical ({identicalPercentage}%)</div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-warning">
              {summary.versionDrift + summary.sourceAhead}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">Version Drift</div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-destructive">{summary.contentDrift}</div>
            <div className="gba:text-sm gba:text-muted-foreground">Content Drift</div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-info">{summary.newInSource}</div>
            <div className="gba:text-sm gba:text-muted-foreground">New in Source</div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:text-2xl gba:font-bold gba:text-secondary">{summary.newInTarget}</div>
            <div className="gba:text-sm gba:text-muted-foreground">New in Target</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
