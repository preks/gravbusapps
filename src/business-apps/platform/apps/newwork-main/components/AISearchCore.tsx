import React, { useState, useCallback } from 'react'
import { Search, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

interface AISearchCoreProps {
  onSearch: (query: string) => void
  'data-testid'?: string
}

// Keyframes for search animations
const keyframesStyles = `
  @keyframes search-glow {
    0%, 100% { box-shadow: 0 0 20px var(--nw-ai-opacity-20, rgba(139, 92, 246, 0.2)); }
    50% { box-shadow: 0 0 40px var(--nw-ai-opacity-30, rgba(139, 92, 246, 0.3)); }
  }
  @keyframes border-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`

/**
 * AISearchCore - Central AI search interaction with visual effects
 * Features animated border, glow effects, and quick action chips
 */
export const AISearchCore: React.FC<AISearchCoreProps> = ({ onSearch, 'data-testid': testId = 'ai-search-core' }) => {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
        onSearch(query.trim())
      }
    },
    [query, onSearch]
  )

  const handleQuickAction = useCallback(
    (action: string) => {
      onSearch(action)
    },
    [onSearch]
  )

  const quickActions = [
    { label: 'Create a screen', query: 'create a new screen' },
    { label: 'Find documents', query: 'find my documents' },
    { label: 'Manage expenses', query: 'submit expense report' },
    { label: 'Chat with AI', query: 'help me with' }
  ]

  return (
    <>
      <style>{keyframesStyles}</style>
      <section
        className="gba:py-8 gba:px-6 gba:relative"
        data-testid={testId}
        style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
      >
        <div className="gba:max-w-3xl gba:mx-auto">
          {/* Header */}
          <div className="gba:text-center gba:mb-6">
            <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-ai gba:mb-2">
              <Sparkles className="gba:w-5 gba:h-5" />
              <span className="gba:text-sm gba:font-medium">AI-Powered</span>
            </div>
            <h2 className="gba:text-xl gba:sm:text-2xl gba:font-semibold gba:text-foreground">
              Ask NEWWORK AI anything
            </h2>
          </div>

          {/* Search container with animated border */}
          <div
            className={`
              gba:relative gba:rounded-2xl gba:p-[2px]
              ${isFocused ? 'gba:opacity-100' : 'gba:opacity-70'}
              gba:transition-opacity gba:duration-300
            `}
            style={{
              background: 'linear-gradient(90deg, var(--nw-ai), var(--nw-primary), var(--nw-info), var(--nw-ai))',
              backgroundSize: '300% 100%',
              animation: isFocused ? 'border-flow 3s ease infinite' : 'none'
            }}
          >
            <form
              onSubmit={handleSubmit}
              className={`
                gba:relative gba:flex gba:items-center gba:gap-3
                gba:bg-card gba:rounded-2xl gba:p-4
              `}
              style={{
                animation: isFocused ? 'search-glow 2s ease-in-out infinite' : 'none'
              }}
            >
              {/* Search icon */}
              <Search className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:flex-shrink-0" />

              {/* Input */}
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="What would you like to do today?"
                className="gba:flex-1 gba:bg-transparent gba:border-none gba:outline-none gba:text-foreground gba:placeholder-muted-foreground gba:text-lg"
                data-testid={`${testId}-input`}
              />

              {/* Submit button */}
              <Button type="submit" size="sm" disabled={!query.trim()} data-testid={`${testId}-submit`}>
                <ArrowRight className="gba:w-4 gba:h-4" />
              </Button>
            </form>
          </div>

          {/* Quick actions */}
          <div className="gba:mt-4 gba:flex gba:flex-wrap gba:justify-center gba:gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickAction(action.query)}
                className="gba:px-4 gba:py-2 gba:rounded-full gba:bg-muted/50 gba:text-muted-foreground gba:text-sm gba:font-medium gba:border gba:border-border gba:hover:bg-muted gba:hover:text-foreground gba:transition-colors gba:cursor-pointer"
                data-testid={`${testId}-quick-action-${index}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default AISearchCore
