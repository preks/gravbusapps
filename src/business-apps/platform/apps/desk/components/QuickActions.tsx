import React, { useState } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Search, Plus, FileText, FileSpreadsheet, StickyNote } from 'lucide-react'

interface QuickActionsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateDocument: () => void
  onCreateSpreadsheet: () => void
  onCreateNote: () => void
  'data-testid'?: string
}

/**
 * QuickActions - Premium quick search and create section
 * Provides fast access to search and new content creation
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  searchQuery,
  onSearchChange,
  onCreateDocument,
  onCreateSpreadsheet,
  onCreateNote,
  'data-testid': testId = 'desk-quick-actions'
}) => {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
    >
      {/* Background transition */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-transparent gba:via-background gba:to-background" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto">
        {/* Search area */}
        <div
          className={`gba:relative gba:rounded-2xl gba:border gba:bg-card gba:transition-all gba:duration-300 ${isFocused ? 'gba:border-primary gba:ring-4 gba:ring-primary/10' : 'gba:border-border'}`}
        >
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
            <div className="gba:flex-1 gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search your documents, spreadsheets, and notes..."
                className="gba:pl-10 gba:border-0 gba:bg-transparent gba:text-base focus:gba:ring-0"
                data-testid={`${testId}-search-input`}
              />
            </div>

            {/* Divider */}
            <div className="gba:w-px gba:h-8 gba:bg-border" />

            {/* Quick create buttons */}
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-sky-600 hover:gba:bg-sky-500/10"
                onClick={onCreateDocument}
                data-testid={`${testId}-create-doc`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" />
                <FileText className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-teal-600 hover:gba:bg-teal-500/10"
                onClick={onCreateSpreadsheet}
                data-testid={`${testId}-create-sheet`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" />
                <FileSpreadsheet className="gba:w-4 gba:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-amber-600 hover:gba:bg-amber-500/10"
                onClick={onCreateNote}
                data-testid={`${testId}-create-note`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" />
                <StickyNote className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hint text */}
        <p className="gba:text-center gba:text-xs gba:text-muted-foreground gba:mt-3">
          Search across all your content or quickly create something new
        </p>
      </div>
    </section>
  )
}

export default QuickActions
