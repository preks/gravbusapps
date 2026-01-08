/**
 * AppPreviewCard Component
 *
 * A card that displays a preview of a generated spreadsheet app
 * in the apps list/hub view.
 */

import React from 'react'
import { Card, Badge, Button } from '@newwork/nw-design-system'
import {
  FileSpreadsheet,
  Table2,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Copy,
  Download,
  Database,
  Clock,
  Layers,
  Share2,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import type { SpreadsheetAppSummary, AppStatus } from '../types'

export interface AppPreviewCardProps {
  app: SpreadsheetAppSummary
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onExport?: (id: string) => void
  onPromote?: (id: string) => void
  onShare?: (id: string) => void
  'data-testid'?: string
}

/**
 * Get status badge variant and label
 */
function getStatusInfo(status: AppStatus): { variant: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning' | 'info' | 'offline'; label: string } {
  switch (status) {
    case 'draft':
      return { variant: 'secondary', label: 'Draft' }
    case 'file_based':
      return { variant: 'info', label: 'File-based' }
    case 'promoted':
      return { variant: 'success', label: 'Database' }
    case 'archived':
      return { variant: 'offline', label: 'Archived' }
    default:
      return { variant: 'secondary', label: status }
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * AppPreviewCard Component
 */
export const AppPreviewCard: React.FC<AppPreviewCardProps> = ({
  app,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onPromote,
  onShare,
  'data-testid': testId = 'app-preview-card'
}) => {
  const statusInfo = getStatusInfo(app.status)
  const isShared = app.isShared || (app.sharedWithCount && app.sharedWithCount > 0)

  return (
    <Card
      className="gba:group gba:overflow-hidden gba:transition-all gba:hover:shadow-md gba:cursor-pointer"
      onClick={() => onOpen(app.id)}
      data-testid={`${testId}-${app.id}`}
    >
      {/* Card header with gradient */}
      <div className="gba:h-2 gba:w-full gba:bg-gradient-to-r gba:from-primary gba:via-primary/80 gba:to-primary/60" />

      <div className="gba:p-5">
        {/* Top row: icon, title, menu */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4 gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
            <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:transition-transform gba:group-hover:scale-105 gba:flex-shrink-0">
              {app.icon ? (
                <span className="gba:text-2xl">{app.icon}</span>
              ) : (
                <FileSpreadsheet className="gba:w-6 gba:h-6 gba:text-primary" />
              )}
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <h3 className="gba:font-semibold gba:text-foreground gba:truncate">
                {app.name}
              </h3>
              {app.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:truncate">
                  {app.description}
                </p>
              )}
            </div>
          </div>

          {/* Dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="gba:opacity-100 gba:relative gba:z-10 gba:flex-shrink-0"
              >
                <MoreVertical className="gba:w-4 gba:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              <DropdownMenuItem onClick={e => {
                e.stopPropagation()
                onOpen(app.id)
              }}>
                <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                Open
              </DropdownMenuItem>
              {onShare && (
                <DropdownMenuItem onClick={e => {
                  e.stopPropagation()
                  onShare(app.id)
                }}>
                  <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={e => {
                e.stopPropagation()
                onDuplicate(app.id)
              }}>
                <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                Duplicate
              </DropdownMenuItem>
                {onExport && (
                  <DropdownMenuItem onClick={e => {
                    e.stopPropagation()
                    onExport(app.id)
                  }}>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export
                  </DropdownMenuItem>
                )}
                {onPromote && app.status === 'file_based' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={e => {
                      e.stopPropagation()
                      onPromote(app.id)
                    }}>
                      <Database className="gba:w-4 gba:h-4 gba:mr-2" />
                      Promote to Database
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gba:text-destructive"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(app.id)
                  }}
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* Stats row */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-1">
            <Layers className="gba:w-4 gba:h-4" />
            <span>{app.sheetCount} sheet{app.sheetCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Table2 className="gba:w-4 gba:h-4" />
            <span>{app.rowCount.toLocaleString()} rows</span>
          </div>
          {isShared && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-primary">
              <Users className="gba:w-4 gba:h-4" />
              <span>Shared{app.sharedWithCount ? ` (${app.sharedWithCount})` : ''}</span>
            </div>
          )}
        </div>

        {/* Bottom row: status and time */}
        <div className="gba:flex gba:items-center gba:justify-between gba:pt-3 gba:border-t gba:border-border">
          <Badge variant={statusInfo.variant}>
            {app.status === 'promoted' && (
              <Database className="gba:w-3 gba:h-3 gba:mr-1" />
            )}
            {statusInfo.label}
          </Badge>
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <Clock className="gba:w-3 gba:h-3" />
            <span>{formatRelativeTime(app.updatedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state component for no apps
 */
export const NoAppsState: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => {
  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-4">
      <div className="gba:w-20 gba:h-20 gba:rounded-full gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-6">
        <FileSpreadsheet className="gba:w-10 gba:h-10 gba:text-muted-foreground" />
      </div>
      <h3 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-2">
        No apps yet
      </h3>
      <p className="gba:text-muted-foreground gba:text-center gba:max-w-md gba:mb-6">
        Upload an Excel file to transform it into a powerful business application.
        AI will analyze your data and suggest the best app structure.
      </p>
      <Button onClick={onCreateNew}>
        <FileSpreadsheet className="gba:w-4 gba:h-4 gba:mr-2" />
        Create Your First App
      </Button>
    </div>
  )
}
