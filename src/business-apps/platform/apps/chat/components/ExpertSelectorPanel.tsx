/**
 * Expert Selector Panel
 *
 * Slide-in panel for adding Every Experts to a conversation
 */

import React, { useState, useMemo } from 'react'
import { Button, Input, Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { X, Search, Sparkles, BookOpen, Plus, Check } from 'lucide-react'
import type { AvailableExpert } from '../hooks/useEveryExperts'
import { getExpertColorStyles } from '../utils/expertColorUtils'

interface ExpertSelectorPanelProps {
  isOpen: boolean
  onClose: () => void
  experts: AvailableExpert[]
  activeExpertIds: string[]
  isLoading: boolean
  onAddExpert: (expert: AvailableExpert) => void
  'data-testid'?: string
}

export const ExpertSelectorPanel: React.FC<ExpertSelectorPanelProps> = ({
  isOpen,
  onClose,
  experts,
  activeExpertIds,
  isLoading,
  onAddExpert,
  'data-testid': testId = 'expert-selector-panel'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredExperts = useMemo(() => {
    if (!searchQuery) return experts

    const query = searchQuery.toLowerCase()
    return experts.filter(
      expert =>
        expert.name.toLowerCase().includes(query) ||
        expert.specialty.toLowerCase().includes(query) ||
        expert.description?.toLowerCase().includes(query) ||
        expert.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }, [experts, searchQuery])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:z-40"
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      />

      {/* Panel */}
      <div
        className="gba:fixed gba:right-0 gba:top-0 gba:bottom-0 gba:w-96 gba:bg-background gba:border-l gba:border-border gba:shadow-2xl gba:z-50 gba:flex gba:flex-col"
        data-testid={testId}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-5 gba:h-5 gba:text-primary" />
            <h2 className="gba:text-lg gba:font-semibold">Add Expert</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid={`${testId}-close-button`}>
            <X className="gba:w-5 gba:h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="gba:p-4 gba:border-b gba:border-border">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder="Search experts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-10"
              data-testid={`${testId}-search-input`}
            />
          </div>
        </div>

        {/* Expert List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredExperts.length === 0 ? (
            <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
              <Sparkles className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
              <p className="gba:text-sm">No experts found</p>
              <p className="gba:text-xs gba:mt-1">Create experts in Task Expert Studio</p>
            </div>
          ) : (
            <div className="gba:space-y-3">
              {filteredExperts.map(expert => {
                const isActive = activeExpertIds.includes(expert.id)

                return (
                  <Card
                    key={expert.id}
                    className={`gba:transition-all gba:cursor-pointer ${
                      isActive
                        ? 'gba:border-success gba:bg-success/5'
                        : 'hover:gba:border-primary/50 hover:gba:shadow-md'
                    }`}
                    data-testid={`${testId}-expert-card-${expert.id}`}
                  >
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-start gba:gap-3">
                        {/* Avatar */}
                        <div
                          className="gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:font-bold gba:text-sm gba:text-primary-foreground"
                          style={getExpertColorStyles(expert.color).avatar}
                        >
                          {expert.avatar || expert.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                            <div className="gba:flex-1">
                              <h3 className="gba:font-semibold gba:text-sm gba:line-clamp-1">{expert.name}</h3>
                              <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1">
                                {expert.specialty}
                              </p>
                            </div>

                            {/* Add/Active button */}
                            {isActive ? (
                              <div className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium gba:bg-success-secondary/60 gba:text-success-secondary-foreground gba:flex-shrink-0">
                                <Check className="gba:w-3 gba:h-3" />
                                Active
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onAddExpert(expert)}
                                data-testid={`${testId}-add-expert-button-${expert.id}`}
                              >
                                <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
                                Add
                              </Button>
                            )}
                          </div>

                          {/* Description */}
                          {expert.description && (
                            <p className="gba:text-xs gba:text-muted-foreground gba:mt-2 gba:line-clamp-2">
                              {expert.description}
                            </p>
                          )}

                          {/* Knowledge sources indicator */}
                          {expert.knowledgeSourceCount > 0 && (
                            <div className="gba:flex gba:items-center gba:gap-1 gba:mt-2 gba:text-xs gba:text-primary">
                              <BookOpen className="gba:w-3 gba:h-3" />
                              <span>
                                {expert.knowledgeSourceCount} knowledge source
                                {expert.knowledgeSourceCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Tags */}
                          {expert.tags && expert.tags.length > 0 && (
                            <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
                              {expert.tags.slice(0, 3).map(tag => (
                                <div
                                  key={tag}
                                  className="gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:bg-secondary gba:text-secondary-foreground"
                                >
                                  {tag}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Help */}
        <div className="gba:p-4 gba:border-t gba:border-border gba:bg-muted/30">
          <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
            Experts have specialized knowledge and can be mentioned using{' '}
            <span className="gba:font-mono">@ExpertName</span>
          </p>
        </div>
      </div>
    </>
  )
}
