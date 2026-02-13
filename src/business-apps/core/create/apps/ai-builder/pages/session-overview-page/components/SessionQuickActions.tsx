import React, { useState, useRef, useEffect } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import { Search, Plus, X } from 'lucide-react'
interface SessionQuickActionsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateSession: () => void
  disabled?: boolean
  'data-testid'?: string
}

export const SessionQuickActions: React.FC<SessionQuickActionsProps> = ({
  searchQuery,
  onSearchChange,
  onCreateSession,
  disabled = false,
  'data-testid': testId = 'session-quick-actions'
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }

      if (e.key === 'Escape' && searchQuery) {
        onSearchChange('')
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, onSearchChange])

  const handleClear = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative gba:z-50"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
    >
      {/* Background transition */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-transparent gba:via-background gba:to-background gba:-z-10" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto">
        {/* Search area */}
        <div
          className={`gba:relative gba:border gba:transition-all gba:duration-200 gba:shadow-lg gba:rounded-2xl ${isFocused ? 'gba:border-border/30 gba:shadow-xl' : 'gba:border-border/20'}`}
          style={{
            // eslint-disable-next-line newwork-local/no-hardcoded-colors
            backgroundColor: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
            <div className="gba:flex-1 gba:relative">
              <Search
                className={`gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:transition-colors ${
                  searchQuery ? 'gba:text-primary' : 'gba:text-muted-foreground'
                }`}
              />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Search your AI Builder sessions..."
                className="gba:pl-10 gba:pr-12 gba:border-0 gba:bg-transparent gba:text-base focus:gba:ring-0"
                data-testid={`${testId}-search-input`}
              />

              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:p-1.5 gba:rounded-full gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted/80 gba:transition-all"
                  data-testid={`${testId}-clear`}
                >
                  <X className="gba:w-4 gba:h-4" />
                </button>
              )}
            </div>

            <div className="gba:w-px gba:h-8 gba:bg-border" />

            <Button
              onClick={onCreateSession}
              disabled={disabled}
              className="gba:gap-2"
              size="lg"
              data-testid={`${testId}-create-session`}
            >
              <Plus className="gba:w-4 gba:h-4" />
              New Session
            </Button>
          </div>
        </div>

        {!searchQuery && (
          <p className="gba:text-center gba:text-xs gba:text-muted-foreground gba:mt-3">
            Press <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono gba:text-[10px]">⌘K</kbd>{' '}
            to search sessions
          </p>
        )}
      </div>
    </section>
  )
}

export default SessionQuickActions
