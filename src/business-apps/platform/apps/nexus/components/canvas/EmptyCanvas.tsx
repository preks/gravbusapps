import { Card, CardContent } from '@newwork/nw-design-system'
import { MessageSquare, FileText, BarChart3, Presentation, Sparkles, Database } from 'lucide-react'

interface EmptyCanvasProps {
  onSuggestionClick: (prompt: string) => void
  testId?: string
}

const suggestions = [
  {
    icon: MessageSquare,
    title: 'Ask about your documents',
    description: 'Search and query across all your documents, notes, and spreadsheets',
    prompt: 'What are the key topics across my recent documents?'
  },
  {
    icon: FileText,
    title: 'Generate a document',
    description: 'Create reports, memos, proposals, or summaries from your content',
    prompt: 'Create a comprehensive summary document based on my recent notes'
  },
  {
    icon: BarChart3,
    title: 'Create an analysis',
    description: 'Build dashboards with KPIs, charts, tables, and key insights',
    prompt: 'Create an analysis dashboard with key metrics and trends from my data'
  },
  {
    icon: Presentation,
    title: 'Build a presentation',
    description: 'Generate professional slide decks from your content',
    prompt: 'Create a presentation about the main topics in my documents'
  },
  {
    icon: Database,
    title: 'Query system data',
    description: 'Pull real HR, CRM, or finance data from NEWWORK (enable Data Access first)',
    prompt: 'Get me the latest employee data from the system'
  }
]

export const EmptyCanvas = ({ onSuggestionClick, testId = 'nexus-empty-canvas' }: EmptyCanvasProps) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:px-8 gba:py-12"
      data-testid={testId}
    >
      <div className="gba:max-w-2xl gba:w-full gba:space-y-8">
        {/* Hero */}
        <div className="gba:text-center gba:space-y-3">
          <div className="gba:flex gba:justify-center">
            <div className="gba:h-14 gba:w-14 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <Sparkles className="gba:h-7 gba:w-7 gba:text-primary" />
            </div>
          </div>
          <h1 className="gba:text-2xl gba:font-semibold gba:text-foreground gba:tracking-tight">
            What would you like to create?
          </h1>
          <p className="gba:text-sm gba:text-muted-foreground gba:max-w-lg gba:mx-auto gba:leading-relaxed">
            Nexus connects your content with AI to help you ask questions, generate documents, build analyses, and
            create presentations. You can also query live system data.
          </p>
        </div>

        {/* Suggestion Cards */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {suggestions.map(suggestion => (
            <Card
              key={suggestion.title}
              className="gba:cursor-pointer gba:transition-all gba:hover:border-primary/50 gba:group"
              onClick={() => onSuggestionClick(suggestion.prompt)}
              data-testid={`${testId}-suggestion`}
            >
              <CardContent className="gba:p-5 gba:space-y-3">
                <div className="gba:h-9 gba:w-9 gba:rounded-lg gba:bg-muted gba:flex gba:items-center gba:justify-center gba:group-hover:bg-primary/10 gba:transition-colors">
                  <suggestion.icon className="gba:h-4.5 gba:w-4.5 gba:text-muted-foreground gba:group-hover:text-primary gba:transition-colors" />
                </div>
                <div>
                  <h3 className="gba:text-sm gba:font-medium gba:text-foreground">{suggestion.title}</h3>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
