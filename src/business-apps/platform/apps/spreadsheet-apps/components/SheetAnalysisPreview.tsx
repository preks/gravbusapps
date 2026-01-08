/**
 * SheetAnalysisPreview Component
 *
 * Displays the AI analysis results for a spreadsheet before app generation.
 * Allows users to review and adjust detected column types and app structure.
 */

import React, { useState, useMemo } from 'react'
import { Card, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import {
  Sparkles,
  Check,
  AlertCircle,
  Table2,
  FileInput,
  BarChart3,
  Kanban,
  Calendar,
  ArrowRight,
  RefreshCw,
  Link2
} from 'lucide-react'
import type { SpreadsheetAnalysis, SheetAnalysis, ColumnAnalysis, ColumnType, ViewType } from '../types'

export interface SheetAnalysisPreviewProps {
  analysis: SpreadsheetAnalysis
  onConfirm: (analysis: SpreadsheetAnalysis) => void
  onReanalyze?: () => void
  isLoading?: boolean
  'data-testid'?: string
}

/**
 * Get icon for view type
 */
function getViewIcon(type: ViewType) {
  switch (type) {
    case 'table':
      return Table2
    case 'form':
      return FileInput
    case 'dashboard':
      return BarChart3
    case 'kanban':
      return Kanban
    case 'calendar':
      return Calendar
    default:
      return Table2
  }
}

/**
 * Get color for column type
 */
function getColumnTypeColor(type: ColumnType): string {
  switch (type) {
    case 'text':
      return 'gba:bg-muted gba:text-muted-foreground'
    case 'number':
    case 'currency':
    case 'percentage':
      return 'gba:bg-info-secondary gba:text-info-secondary-foreground'
    case 'date':
    case 'datetime':
      return 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
    case 'email':
    case 'phone':
    case 'url':
      return 'gba:bg-primary/10 gba:text-primary'
    case 'select':
    case 'multiselect':
      return 'gba:bg-success-secondary gba:text-success-secondary-foreground'
    case 'boolean':
      return 'gba:bg-offline-secondary gba:text-offline-secondary-foreground'
    case 'calculated':
      return 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground'
    case 'reference':
      return 'gba:bg-primary/20 gba:text-primary'
    default:
      return 'gba:bg-muted gba:text-muted-foreground'
  }
}

/**
 * SheetAnalysisPreview Component
 */
export const SheetAnalysisPreview: React.FC<SheetAnalysisPreviewProps> = ({
  analysis,
  onConfirm,
  onReanalyze,
  isLoading = false,
  'data-testid': testId = 'sheet-analysis-preview'
}) => {
  const [activeSheet, setActiveSheet] = useState(analysis.sheets[0]?.name || '')

  const confidenceColor = useMemo(() => {
    if (analysis.confidence >= 0.8) return 'gba:text-success'
    if (analysis.confidence >= 0.6) return 'gba:text-warning'
    return 'gba:text-destructive'
  }, [analysis.confidence])

  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      {/* Header with AI branding */}
      <div className="gba:bg-gradient-to-r gba:from-primary/10 gba:to-primary/5 gba:px-6 gba:py-4 gba:border-b">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/20 gba:flex gba:items-center gba:justify-center">
              <Sparkles className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div>
              <h3 className="gba:font-semibold gba:text-foreground">AI Analysis Complete</h3>
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <span className="gba:text-muted-foreground">Confidence:</span>
                <span className={confidenceColor}>{Math.round(analysis.confidence * 100)}%</span>
              </div>
            </div>
          </div>
          {onReanalyze && (
            <Button variant="outline" size="sm" onClick={onReanalyze} disabled={isLoading}>
              <RefreshCw className={`gba:w-4 gba:h-4 gba:mr-2 ${isLoading ? 'gba:animate-spin' : ''}`} />
              Re-analyze
            </Button>
          )}
        </div>
      </div>

      {/* App suggestion */}
      <div className="gba:px-6 gba:py-4 gba:bg-muted/30 gba:border-b">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Suggested App Name</p>
            <p className="gba:text-lg gba:font-semibold gba:text-foreground">{analysis.suggestedAppName}</p>
          </div>
          <Badge variant="outline" className="gba:capitalize">
            {analysis.suggestedAppType.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Tabs for each sheet */}
      <div className="gba:p-6">
        <Tabs value={activeSheet} onValueChange={setActiveSheet}>
          <TabsList className="gba:mb-4">
            {analysis.sheets.map(sheet => (
              <TabsTrigger key={sheet.name} value={sheet.name}>
                {sheet.name}
                {sheet.isLookupTable && (
                  <Badge variant="secondary" className="gba:ml-2 gba:text-xs">
                    Lookup
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {analysis.sheets.map(sheet => (
            <TabsContent key={sheet.name} value={sheet.name}>
              <SheetAnalysisContent sheet={sheet} testId={testId} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Relationships */}
      {analysis.relationships.length > 0 && (
        <div className="gba:px-6 gba:pb-6">
          <div className="gba:bg-muted/30 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Link2 className="gba:w-4 gba:h-4 gba:text-primary" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground">Detected Relationships</span>
            </div>
            <div className="gba:space-y-2">
              {analysis.relationships.map((rel, idx) => (
                <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                  <Badge variant="secondary" className="gba:text-xs">
                    {rel.fromSheet}.{rel.fromColumn}
                  </Badge>
                  <ArrowRight className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                  <Badge variant="secondary" className="gba:text-xs">
                    {rel.toSheet}.{rel.toColumn}
                  </Badge>
                  <span className="gba:text-xs gba:text-muted-foreground">({rel.type})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="gba:px-6 gba:py-4 gba:border-t gba:bg-muted/20 gba:flex gba:items-center gba:justify-between">
        <p className="gba:text-sm gba:text-muted-foreground">
          Review the analysis and click "Generate App" to create your application
        </p>
        <Button onClick={() => onConfirm(analysis)} disabled={isLoading}>
          <Check className="gba:w-4 gba:h-4 gba:mr-2" />
          Generate App
          <ArrowRight className="gba:w-4 gba:h-4 gba:ml-2" />
        </Button>
      </div>
    </Card>
  )
}

/**
 * Sheet analysis content component
 */
interface SheetAnalysisContentProps {
  sheet: SheetAnalysis
  testId: string
}

const SheetAnalysisContent: React.FC<SheetAnalysisContentProps> = ({ sheet, testId }) => {
  return (
    <div className="gba:space-y-6" data-testid={`${testId}-sheet-${sheet.name}`}>
      {/* Purpose */}
      <div>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">Detected Purpose</p>
        <p className="gba:text-foreground">{sheet.purpose}</p>
      </div>

      {/* Suggested views */}
      <div>
        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">Suggested Views</p>
        <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
          {sheet.suggestedViews.map((view, idx) => {
            const ViewIcon = getViewIcon(view.type)
            return (
              <div key={idx} className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-card">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                  <ViewIcon className="gba:w-4 gba:h-4 gba:text-primary" />
                  <span className="gba:font-medium gba:text-foreground">{view.name}</span>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">{view.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Columns */}
      <div>
        <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">
          Column Analysis ({sheet.columns.length} columns)
        </p>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <table className="gba:w-full">
            <thead>
              <tr className="gba:bg-muted/50">
                <th className="gba:px-4 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                  Column
                </th>
                <th className="gba:px-4 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground">
                  Type
                </th>
                <th className="gba:px-4 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground gba:hidden gba:sm:table-cell">
                  Attributes
                </th>
                <th className="gba:px-4 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground gba:hidden gba:md:table-cell">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.columns.map((col, idx) => (
                <ColumnRow key={idx} column={col} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Primary key indicator */}
      {sheet.primaryKeyColumn && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-info-secondary/30 gba:rounded-lg">
          <AlertCircle className="gba:w-4 gba:h-4 gba:text-info" />
          <span className="gba:text-sm gba:text-foreground">
            Primary key detected: <strong>{sheet.primaryKeyColumn}</strong>
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Column row component
 */
interface ColumnRowProps {
  column: ColumnAnalysis
}

const ColumnRow: React.FC<ColumnRowProps> = ({ column }) => {
  return (
    <tr className="gba:border-t gba:border-border">
      <td className="gba:px-4 gba:py-3">
        <span className="gba:font-medium gba:text-foreground">{column.name}</span>
        {column.description && <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{column.description}</p>}
      </td>
      <td className="gba:px-4 gba:py-3">
        <Badge className={`gba:text-xs ${getColumnTypeColor(column.detectedType)}`}>{column.detectedType}</Badge>
      </td>
      <td className="gba:px-4 gba:py-3 gba:hidden gba:sm:table-cell">
        <div className="gba:flex gba:gap-1 gba:flex-wrap">
          {column.isRequired && (
            <Badge variant="outline" className="gba:text-xs">
              Required
            </Badge>
          )}
          {column.isUnique && (
            <Badge variant="outline" className="gba:text-xs">
              Unique
            </Badge>
          )}
          {column.formula && (
            <Badge variant="outline" className="gba:text-xs">
              Calculated
            </Badge>
          )}
          {column.selectOptions && column.selectOptions.length > 0 && (
            <Badge variant="outline" className="gba:text-xs">
              {column.selectOptions.length} options
            </Badge>
          )}
        </div>
      </td>
      <td className="gba:px-4 gba:py-3 gba:hidden gba:md:table-cell">
        <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[200px]">
          {column.sampleValues.slice(0, 3).map((v, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {String(v)}
            </span>
          ))}
        </div>
      </td>
    </tr>
  )
}
