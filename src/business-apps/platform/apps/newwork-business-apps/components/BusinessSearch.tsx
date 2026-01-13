import React, { useState, useCallback } from 'react'
import { Card, Input, Button } from '@newwork/nw-design-system'
import { Search, Sparkles, ArrowRight } from 'lucide-react'

interface BusinessSearchProps {
  onSearch: (query: string) => void
  'data-testid'?: string
}

export const BusinessSearch: React.FC<BusinessSearchProps> = ({
  onSearch,
  'data-testid': testId = 'business-search'
}) => {
  const [query, setQuery] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
        onSearch(query.trim())
      }
    },
    [query, onSearch]
  )

  const quickActions = [
    { label: 'Find employee', query: 'find employee' },
    { label: 'Submit expense', query: 'submit expense' },
    { label: 'View leads', query: 'view leads' },
    { label: 'Request time off', query: 'request time off' }
  ]

  return (
    <section className="gba:py-6 gba:px-6" data-testid={testId}>
      <div className="gba:max-w-3xl gba:mx-auto">
        <Card className="gba:p-6 gba:bg-gradient-to-br gba:from-primary/5 gba:to-info/5 gba:border-primary/20">
          {/* Header */}
          <div className="gba:text-center gba:mb-4">
            <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-sm gba:text-primary gba:font-medium gba:mb-2">
              <Sparkles className="gba:w-4 gba:h-4" />
              <span>AI-Powered Search</span>
            </div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">What would you like to do?</h3>
          </div>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="gba:mb-4">
            <div className="gba:flex gba:gap-2">
              <div className="gba:relative gba:flex-1">
                <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search across all business apps..."
                  className="gba:pl-10"
                  data-testid={`${testId}-input`}
                />
              </div>
              <Button type="submit" variant="default" data-testid={`${testId}-submit`}>
                <ArrowRight className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </form>

          {/* Quick actions */}
          <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => onSearch(action.query)}
                className="gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:rounded-full gba:bg-background gba:border gba:border-border gba:text-muted-foreground gba:hover:border-primary gba:hover:text-primary gba:transition-colors"
                data-testid={`${testId}-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
