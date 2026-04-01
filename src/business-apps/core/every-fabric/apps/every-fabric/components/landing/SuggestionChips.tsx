export interface SuggestionChip {
  icon: string
  label: string
  prompt: string
}

const DEFAULT_CHIPS: SuggestionChip[] = [
  { icon: '🔍', label: 'Deep research', prompt: 'Research in depth the topic of ' },
  { icon: '📊', label: 'Create presentation', prompt: 'Create a professional presentation about ' },
  { icon: '📄', label: 'Write document', prompt: 'Write a detailed document about ' },
  { icon: '📈', label: 'Analyze data', prompt: 'Analyze the following data and provide insights: ' },
  { icon: '🤖', label: 'Automate workflow', prompt: 'Help me automate the following workflow: ' }
]

interface SuggestionChipsProps {
  chips?: SuggestionChip[]
  onSelect: (prompt: string) => void
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ chips = DEFAULT_CHIPS, onSelect }) => {
  return (
    <div
      className="gba:flex gba:w-full gba:max-w-full gba:flex-wrap gba:gap-2 gba:justify-center"
      data-testid="fabric-suggestion-chips"
    >
      {chips.map(chip => (
        <button
          key={chip.label}
          onClick={() => onSelect(chip.prompt)}
          data-testid={`fabric-chip-${chip.label.toLowerCase().replace(/\s+/g, '-')}`}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-3.5 gba:py-1.5 gba:rounded-full gba:border gba:border-border gba:bg-card gba:text-xs gba:font-medium gba:text-muted-foreground gba:transition-all gba:hover:border-primary/40 gba:hover:text-foreground gba:hover:bg-primary/5 gba:hover:shadow-sm gba:active:scale-95"
        >
          <span>{chip.icon}</span>
          {chip.label}
        </button>
      ))}
    </div>
  )
}
