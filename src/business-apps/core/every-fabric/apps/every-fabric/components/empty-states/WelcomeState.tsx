import { Brain } from '@phosphor-icons/react'

const SUGGESTED_TASKS = [
  'Analyse Q1 sales performance and identify trends',
  'Research our top 5 competitors and summarise findings',
  'Find the HR policy on contractor onboarding',
  "Generate a board report draft from this week's data",
  'Identify underperforming accounts and recommend actions',
  'Summarise all deals closed this month with key contacts'
]

interface WelcomeStateProps {
  onSelectSuggestion: (task: string) => void
}

export const WelcomeState = ({ onSelectSuggestion }: WelcomeStateProps) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:px-6 gba:py-12 gba:text-center"
      data-testid="enterprise-agent-welcome"
    >
      <div className="gba:flex gba:items-center gba:justify-center gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-primary/10 gba:mb-6">
        <Brain className="gba:h-8 gba:w-8 gba:text-primary" weight="fill" />
      </div>

      <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">What would you like to accomplish?</h2>
      <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md gba:mb-10 gba:leading-relaxed">
        Describe any goal. The agent will plan, research, and execute — even while you work on other things.
      </p>

      <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-3 gba:w-full gba:max-w-2xl gba:mb-6">
        {SUGGESTED_TASKS.map(task => (
          <button
            key={task}
            className="gba:text-left gba:px-4 gba:py-3 gba:rounded-xl gba:border gba:border-border gba:bg-muted/30 gba:hover:bg-muted/60 gba:transition-colors gba:text-sm gba:text-foreground gba:font-medium"
            onClick={() => onSelectSuggestion(task)}
            data-testid="enterprise-agent-suggestion"
          >
            {task}
          </button>
        ))}
      </div>

      <p className="gba:text-xs gba:text-muted-foreground/60">
        The agent works in the background. Come back when it&rsquo;s done.
      </p>
    </div>
  )
}
