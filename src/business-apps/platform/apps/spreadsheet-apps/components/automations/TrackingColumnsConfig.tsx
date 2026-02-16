/**
 * TrackingColumnsConfig Component
 *
 * Allows users to select which tracking columns to include when running bulk collection.
 * These columns automatically track workflow metadata like recipient, sent time, response time, etc.
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Checkbox,
  Label,
  Button,
  Badge
} from '@newwork/nw-design-system'
import { User, Clock, CheckCircle, Mail, Calendar, Activity, X, Image, ExternalLink } from 'lucide-react'

/**
 * Available tracking column definitions
 */
export interface TrackingColumnDefinition {
  id: string
  name: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultEnabled: boolean
  category: 'recipient' | 'timing' | 'status'
}

/**
 * Standard tracking columns available for bulk collection
 */
export const TRACKING_COLUMNS: TrackingColumnDefinition[] = [
  {
    id: 'recipient_avatar',
    name: '_recipient_avatar',
    label: 'Avatar',
    description: 'Profile picture of the recipient',
    icon: Image,
    defaultEnabled: true,
    category: 'recipient'
  },
  {
    id: 'recipient_name',
    name: '_recipient_name',
    label: 'Recipient Name',
    description: 'Name of the person the form was sent to',
    icon: User,
    defaultEnabled: true,
    category: 'recipient'
  },
  {
    id: 'recipient_email',
    name: '_recipient_email',
    label: 'Recipient Email',
    description: 'Email address of the recipient',
    icon: Mail,
    defaultEnabled: true,
    category: 'recipient'
  },
  {
    id: 'sent_at',
    name: '_sent_at',
    label: 'Sent At',
    description: 'Date and time the form was sent',
    icon: Calendar,
    defaultEnabled: true,
    category: 'timing'
  },
  {
    id: 'responded_at',
    name: '_responded_at',
    label: 'Responded At',
    description: 'Date and time the recipient submitted their response',
    icon: CheckCircle,
    defaultEnabled: true,
    category: 'timing'
  },
  {
    id: 'response_time',
    name: '_response_time',
    label: 'Response Time',
    description: 'How long it took to respond (e.g., "2h 30m")',
    icon: Clock,
    defaultEnabled: false,
    category: 'timing'
  },
  {
    id: 'workflow_status',
    name: '_workflow_status',
    label: 'Workflow Status',
    description: 'Current status of the workflow (Sent, Completed, etc.)',
    icon: Activity,
    defaultEnabled: true,
    category: 'status'
  },
  {
    id: 'copy_link',
    name: '_copy_link',
    label: 'View Response',
    description: 'Link to open the completed sheet (Excel Collection)',
    icon: ExternalLink,
    defaultEnabled: true,
    category: 'status'
  }
]

/**
 * Get default enabled tracking column IDs
 */
export function getDefaultTrackingColumns(): string[] {
  return TRACKING_COLUMNS.filter(col => col.defaultEnabled).map(col => col.id)
}

/**
 * Get tracking column definitions by IDs
 */
export function getTrackingColumnDefinitions(columnIds: string[]): TrackingColumnDefinition[] {
  return columnIds
    .map(id => TRACKING_COLUMNS.find(col => col.id === id))
    .filter((col): col is TrackingColumnDefinition => col !== undefined)
}

interface TrackingColumnsConfigProps {
  /** Currently selected tracking column IDs */
  selectedColumns: string[]
  /** Callback when selection changes */
  onSelectionChange: (columnIds: string[]) => void
  /** Data test ID */
  'data-testid'?: string
}

/**
 * TrackingColumnsConfig Component
 */
export const TrackingColumnsConfig: React.FC<TrackingColumnsConfigProps> = ({
  selectedColumns,
  onSelectionChange,
  'data-testid': testId = 'tracking-columns-config'
}) => {
  const [expanded, setExpanded] = useState(false)

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      if (selectedColumns.includes(columnId)) {
        onSelectionChange(selectedColumns.filter(id => id !== columnId))
      } else {
        onSelectionChange([...selectedColumns, columnId])
      }
    },
    [selectedColumns, onSelectionChange]
  )

  const handleSelectAll = useCallback(() => {
    onSelectionChange(TRACKING_COLUMNS.map(col => col.id))
  }, [onSelectionChange])

  const handleSelectNone = useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  const handleSelectDefaults = useCallback(() => {
    onSelectionChange(getDefaultTrackingColumns())
  }, [onSelectionChange])

  // Group columns by category
  const recipientColumns = TRACKING_COLUMNS.filter(col => col.category === 'recipient')
  const timingColumns = TRACKING_COLUMNS.filter(col => col.category === 'timing')
  const statusColumns = TRACKING_COLUMNS.filter(col => col.category === 'status')

  const selectedCount = selectedColumns.length
  const totalCount = TRACKING_COLUMNS.length

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-sm gba:font-medium">Tracking Columns</CardTitle>
            <CardDescription className="gba:text-xs">Auto-generated columns to track workflow progress</CardDescription>
          </div>
          <Badge variant="secondary">
            {selectedCount}/{totalCount} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Quick actions */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="gba:text-xs">
            {expanded ? 'Collapse' : 'Customize'}
          </Button>
          {expanded && (
            <>
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="gba:text-xs">
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSelectNone} className="gba:text-xs">
                None
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSelectDefaults} className="gba:text-xs">
                Defaults
              </Button>
            </>
          )}
        </div>

        {/* Compact view when collapsed */}
        {!expanded && (
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {selectedColumns.map(id => {
              const col = TRACKING_COLUMNS.find(c => c.id === id)
              if (!col) return null
              return (
                <Badge key={id} variant="secondary" className="gba:flex gba:items-center gba:gap-1">
                  <col.icon className="gba:w-3 gba:h-3" />
                  {col.label}
                  <button
                    type="button"
                    onClick={() => handleToggleColumn(id)}
                    className="gba:ml-1 gba:hover:text-destructive"
                  >
                    <X className="gba:w-3 gba:h-3" />
                  </button>
                </Badge>
              )
            })}
            {selectedColumns.length === 0 && (
              <span className="gba:text-xs gba:text-muted-foreground">No tracking columns selected</span>
            )}
          </div>
        )}

        {/* Expanded view with categories */}
        {expanded && (
          <div className="gba:space-y-4">
            {/* Recipient Info */}
            <div>
              <Label className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                Recipient Info
              </Label>
              <div className="gba:mt-2 gba:space-y-2">
                {recipientColumns.map(col => (
                  <TrackingColumnItem
                    key={col.id}
                    column={col}
                    isSelected={selectedColumns.includes(col.id)}
                    onToggle={() => handleToggleColumn(col.id)}
                  />
                ))}
              </div>
            </div>

            {/* Timing */}
            <div>
              <Label className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wider">Timing</Label>
              <div className="gba:mt-2 gba:space-y-2">
                {timingColumns.map(col => (
                  <TrackingColumnItem
                    key={col.id}
                    column={col}
                    isSelected={selectedColumns.includes(col.id)}
                    onToggle={() => handleToggleColumn(col.id)}
                  />
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <Label className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wider">Status</Label>
              <div className="gba:mt-2 gba:space-y-2">
                {statusColumns.map(col => (
                  <TrackingColumnItem
                    key={col.id}
                    column={col}
                    isSelected={selectedColumns.includes(col.id)}
                    onToggle={() => handleToggleColumn(col.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Individual tracking column item
 */
interface TrackingColumnItemProps {
  column: TrackingColumnDefinition
  isSelected: boolean
  onToggle: () => void
}

const TrackingColumnItem: React.FC<TrackingColumnItemProps> = ({ column, isSelected, onToggle }) => {
  const Icon = column.icon

  return (
    <label className="gba:flex gba:items-start gba:gap-3 gba:p-2 gba:rounded-lg gba:cursor-pointer gba:hover:bg-muted/50 gba:transition-colors">
      <Checkbox checked={isSelected} onCheckedChange={onToggle} className="gba:mt-0.5" />
      <div className="gba:flex-1">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:text-sm gba:font-medium">{column.label}</span>
          {column.defaultEnabled && (
            <Badge variant="secondary" className="gba:text-[10px] gba:px-1 gba:py-0">
              default
            </Badge>
          )}
        </div>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{column.description}</p>
      </div>
    </label>
  )
}

export default TrackingColumnsConfig
