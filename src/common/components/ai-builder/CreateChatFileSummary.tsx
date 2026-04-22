/**
 * Optional "Files changed" block above chat input. Expand/collapse; shows create/modify/delete counts and file list.
 * Used by CreateChatPanel when fileSummary is provided (e.g. AI Builder); Flow Creator and Function Manager omit it.
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileCode, Plus, FileEdit, Trash2 } from 'lucide-react'

export interface CreateChatFileSummaryShape {
  totalUniqueFiles: number
  createCount: number
  modifyCount: number
  deleteCount: number
  files: Array<{ path: string; type: 'create' | 'modify' | 'delete' }>
}

export interface CreateChatFileSummaryProps {
  summary: CreateChatFileSummaryShape
  /** Label for "Files changed". Default "Files changed". */
  label?: string
}

export const CreateChatFileSummary: React.FC<CreateChatFileSummaryProps> = ({ summary, label = 'Files changed' }) => {
  const [expanded, setExpanded] = useState(false)

  if (summary.totalUniqueFiles <= 0) return null

  return (
    <div className="gba:border-b gba:border-border gba:bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="gba:w-full gba:px-4 gba:py-2 gba:flex gba:items-center gba:gap-2 gba:text-xs hover:gba:bg-muted/50 gba:transition-colors"
      >
        {expanded ? (
          <ChevronDown className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
        ) : (
          <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
        )}
        <FileCode className="gba:w-3.5 gba:h-3.5 gba:text-primary gba:flex-shrink-0" />
        <span className="gba:text-muted-foreground">
          {label} {summary.totalUniqueFiles}
        </span>
        <div className="gba:flex gba:flex-wrap gba:gap-1.5">
          {summary.createCount > 0 && (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-green-500/10 gba:text-green-600 dark:gba:text-green-400">
              <Plus className="gba:w-3 gba:h-3" />
              {summary.createCount}
            </span>
          )}
          {summary.modifyCount > 0 && (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-blue-500/10 gba:text-blue-600 dark:gba:text-blue-400">
              <FileEdit className="gba:w-3 gba:h-3" />
              {summary.modifyCount}
            </span>
          )}
          {summary.deleteCount > 0 && (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-red-500/10 gba:text-red-600 dark:gba:text-red-400">
              <Trash2 className="gba:w-3 gba:h-3" />
              {summary.deleteCount}
            </span>
          )}
        </div>
      </button>
      {expanded && summary.files.length > 0 ? (
        <div className="gba:px-4 gba:pb-2 gba:max-h-48 gba:overflow-y-auto">
          <div className="gba:space-y-1">
            {summary.files.map(file => (
              <div
                key={file.path}
                className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-1 gba:px-2 gba:rounded gba:bg-muted/50"
              >
                {file.type === 'create' && (
                  <Plus className="gba:w-3 gba:h-3 gba:text-green-600 dark:gba:text-green-400 gba:flex-shrink-0" />
                )}
                {file.type === 'modify' && (
                  <FileEdit className="gba:w-3 gba:h-3 gba:text-blue-600 dark:gba:text-blue-400 gba:flex-shrink-0" />
                )}
                {file.type === 'delete' && (
                  <Trash2 className="gba:w-3 gba:h-3 gba:text-red-600 dark:gba:text-red-400 gba:flex-shrink-0" />
                )}
                <span className="gba:text-muted-foreground gba:truncate" title={file.path}>
                  {file.path}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
