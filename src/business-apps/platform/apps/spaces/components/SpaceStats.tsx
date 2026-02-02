/**
 * SpaceStats - Statistics cards for space overview
 *
 * Clean, minimal KPI cards following NEWWORK design system
 * No borders, no shadows, flat design
 */

import React from 'react'
import { FileText, Table2, StickyNote, Presentation, Activity } from 'lucide-react'

export interface SpaceStatsProps {
  documents: number
  spreadsheets: number
  notes: number
  slides: number
  recentActivity: number
  'data-testid'?: string
}

const stats = [
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'spreadsheets', label: 'Spreadsheets', icon: Table2 },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'slides', label: 'Presentations', icon: Presentation },
  { key: 'recentActivity', label: 'Recent Activity', icon: Activity }
]

export const SpaceStats: React.FC<SpaceStatsProps> = ({
  documents,
  spreadsheets,
  notes,
  slides,
  recentActivity,
  'data-testid': testId = 'space-stats'
}) => {
  const values: Record<string, number> = { documents, spreadsheets, notes, slides, recentActivity }

  return (
    <div className="gba:grid gba:grid-cols-2 gba:lg:grid-cols-5 gba:gap-4" data-testid={testId}>
      {stats.map(stat => (
        <div key={stat.key} className="gba:rounded-lg gba:bg-card gba:p-5" data-testid={`${testId}-${stat.key}`}>
          {/* Label with icon */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <stat.icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:text-muted-foreground">{stat.label}</span>
          </div>

          {/* Value - using display font for large numbers */}
          <p
            className="gba:text-3xl gba:font-semibold gba:text-foreground gba:tracking-tight"
            style={{ fontFamily: "'Funnel Display', system-ui, sans-serif" }}
          >
            {values[stat.key]}
          </p>
        </div>
      ))}
    </div>
  )
}

export default SpaceStats
