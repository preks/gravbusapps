import React from 'react'

interface LabelSuggestionItem {
  id: string
  name: string
}

interface LabelSuggestionsListProps {
  suggestions: LabelSuggestionItem[]
  isLoading: boolean
  activeIndex: number
  onSelect: (name: string) => void
  onHover: (index: number) => void
  loadingText: string
  emptyText: string
  itemTextClassName: string
  testIdPrefix: string
}

export const LabelSuggestionsList: React.FC<LabelSuggestionsListProps> = ({
  suggestions,
  isLoading,
  activeIndex,
  onSelect,
  onHover,
  loadingText,
  emptyText,
  itemTextClassName,
  testIdPrefix
}) => {
  if (isLoading) {
    return <p className="gba:text-xs gba:text-muted-foreground">{loadingText}</p>
  }

  if (suggestions.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground">{emptyText}</p>
  }

  return (
    <>
      {suggestions.map((suggestion, index) => (
        <button
          key={`${testIdPrefix}-${suggestion.id}`}
          type="button"
          className={`gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded ${itemTextClassName} ${
            activeIndex === index ? 'gba:bg-muted/60' : 'hover:gba:bg-muted/50'
          }`}
          onClick={() => onSelect(suggestion.name)}
          onMouseEnter={() => onHover(index)}
          data-testid={`${testIdPrefix}-${suggestion.id}`}
        >
          {suggestion.name}
        </button>
      ))}
    </>
  )
}
