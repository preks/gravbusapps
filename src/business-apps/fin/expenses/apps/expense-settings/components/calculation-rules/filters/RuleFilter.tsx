import React, { useState, useMemo, useRef, useCallback } from 'react'
import { Input, Checkbox } from '@newwork/nw-design-system'
import { ExpenseRule } from '../../../types/ExpenseRuleTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RuleFilterProps {
  rules: ExpenseRule[]
  selectedRuleIds: string[]
  onChange: (ruleIds: string[]) => void
  'data-testid'?: string
}

const LIMIT = 50

const RuleFilter: React.FC<RuleFilterProps> = ({ rules, selectedRuleIds, onChange, 'data-testid': dataTestId }) => {
  const [search, setSearch] = useState('')
  const [displayCount, setDisplayCount] = useState(LIMIT)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleToggle = (ruleId: string) => {
    const newSelection = selectedRuleIds.includes(ruleId)
      ? selectedRuleIds.filter(id => id !== ruleId)
      : [...selectedRuleIds, ruleId]
    onChange(newSelection)
  }

  // Filter and sort rules
  const filteredAndSortedRules = useMemo(() => {
    let filtered = [...rules]

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        rule => rule.code?.toLowerCase().includes(searchLower) || rule.name?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by code
    filtered.sort((a, b) => (a.code || '').localeCompare(b.code || ''))

    return filtered
  }, [rules, search])

  // Get visible rules (paginated)
  const visibleRules = useMemo(() => {
    return filteredAndSortedRules.slice(0, displayCount)
  }, [filteredAndSortedRules, displayCount])

  const hasMore = displayCount < filteredAndSortedRules.length

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50

      if (scrolledToBottom && hasMore) {
        setDisplayCount(prev => Math.min(prev + LIMIT, filteredAndSortedRules.length))
      }
    },
    [hasMore, filteredAndSortedRules.length]
  )

  // Reset display count when search changes
  React.useEffect(() => {
    setDisplayCount(LIMIT)
  }, [search])

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <Input
        placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.filters.searchRule', 'Search rule...')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        data-testid={`${dataTestId}-search`}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        className="[&::-webkit-scrollbar]:gba:hidden gba:space-y-1"
        data-testid={`${dataTestId}-list`}
      >
        {visibleRules.map(rule => (
          <div key={rule.id} className="gba:py-1">
            <Checkbox
              checked={selectedRuleIds.includes(rule.id)}
              onChange={() => handleToggle(rule.id)}
              data-testid={`${dataTestId}-option-${rule.id}`}
            >
              <div className="gba:flex gba:flex-col">
                <span className="gba:text-sm gba:font-medium">{rule.code}</span>
                {rule.name && <span className="gba:text-xs gba:text-gray-500">{rule.name}</span>}
              </div>
            </Checkbox>
          </div>
        ))}

        {hasMore && (
          <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:py-2">
            {getTranslationFromI18nKeyAndLabel('common.scrollForMore', 'Scroll for more...')}
          </div>
        )}

        {visibleRules.length === 0 && (
          <div className="gba:text-center gba:text-sm gba:text-gray-500 gba:py-2">
            {getTranslationFromI18nKeyAndLabel('common.noResults', 'No results found')}
          </div>
        )}
      </div>

      {selectedRuleIds.length > 0 && (
        <div className="gba:text-xs gba:text-gray-500 gba:pt-2 gba:border-t">
          {getTranslationFromI18nKeyAndLabel('common.selected', 'Selected')}: {selectedRuleIds.length}
        </div>
      )}
    </div>
  )
}

export default RuleFilter
