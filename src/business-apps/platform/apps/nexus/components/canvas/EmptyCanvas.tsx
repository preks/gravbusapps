import { Card, CardContent } from '@newwork/nw-design-system'
import { MessageSquare, FileText, BarChart3, Presentation, Database, ArrowRight, Sparkles } from 'lucide-react'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'

interface EmptyCanvasProps {
  /** Called when the user wants to just open the chat (no text) */
  onOpenChat: () => void
  /** Called when the user picks a suggestion — opens chat + inserts text */
  onSuggestionClick: (prompt: string) => void
  testId?: string
}

// Video background — same approach as EveryOneHero
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

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

/** Glass-style card for the 5 suggestion options */
const GlassCard = ({
  suggestion,
  onClick,
  testId
}: {
  suggestion: (typeof suggestions)[number]
  onClick: () => void
  testId: string
}) => (
  <Card
    className="gba:bg-card/80 gba:backdrop-blur-sm gba:cursor-pointer gba:transition-all gba:duration-200 gba:hover:scale-[1.02] gba:hover:bg-card gba:group gba:overflow-hidden gba:border-border/60"
    onClick={onClick}
    data-testid={`${testId}-suggestion`}
  >
    <CardContent className="gba:p-5 gba:flex gba:items-start gba:gap-3.5">
      <div className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:group-hover:bg-primary/10 gba:transition-colors gba:duration-200">
        <suggestion.icon className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:group-hover:text-primary gba:transition-colors gba:duration-200" />
      </div>
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{suggestion.title}</h3>
          <ArrowRight className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:duration-200" />
        </div>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:leading-relaxed">{suggestion.description}</p>
      </div>
    </CardContent>
  </Card>
)

export const EmptyCanvas = ({ onOpenChat, onSuggestionClick, testId = 'nexus-empty-canvas' }: EmptyCanvasProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto" data-testid={testId}>
      {/* Hero Banner — same style as EveryOne dashboard */}
      <div className="gba:relative gba:overflow-hidden gba:flex-shrink-0">
        {useVideo ? (
          <video
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden
          />
        ) : (
          <SpaceHeroBackground />
        )}

        {/* Dark overlay for readability */}
        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none"
          style={{
            background: `linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)`
          }}
          aria-hidden
        />
        {/* eslint-enable newwork-local/no-hardcoded-colors */}

        {/* Hero content */}
        <div className="gba:relative gba:px-8 gba:py-8">
          <div className="gba:mb-3">
            <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
              NEWWORK
            </span>
          </div>
          <h1
            className="gba:font-funnel-display gba:text-4xl gba:font-semibold gba:text-white gba:tracking-tight gba:mb-2"
            data-testid={`${testId}-title`}
          >
            Nexus
          </h1>
          <p className="gba:text-sm gba:text-white/60 gba:max-w-lg">
            Your AI-powered workspace. Generate documents, build analyses, create presentations, and query live data.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-8 gba:py-10">
        <div className="gba:max-w-3xl gba:w-full gba:space-y-8">
          {/* Subtitle */}
          <div className="gba:text-center gba:space-y-2">
            <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:tracking-tight">
              What would you like to create?
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md gba:mx-auto gba:leading-relaxed">
              Choose a starting point below, or open the chat to ask anything.
            </p>
          </div>

          {/* Cards — 3 on top, 3 on bottom */}
          <div className="gba:grid gba:grid-cols-3 gba:gap-3">
            {/* 1st card: Open Chat — decorative blue */}
            <Card
              className="gba:bg-card-decorative gba:border-0 gba:cursor-pointer gba:transition-all gba:duration-200 gba:hover:scale-[1.02] gba:group gba:overflow-hidden"
              onClick={onOpenChat}
              data-testid={`${testId}-open-chat`}
            >
              <CardContent className="gba:p-5 gba:flex gba:items-start gba:gap-3.5">
                <div className="gba:h-10 gba:w-10 gba:rounded-xl gba:bg-decorative-foreground/15 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                  <Sparkles className="gba:h-5 gba:w-5 gba:text-decorative-foreground" />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-1.5">
                    <h3 className="gba:text-sm gba:font-bold gba:text-decorative-foreground">Start a conversation</h3>
                    <ArrowRight className="gba:h-3 gba:w-3 gba:text-decorative-foreground/60 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:duration-200" />
                  </div>
                  <p className="gba:text-xs gba:text-decorative-foreground/70 gba:mt-0.5 gba:leading-relaxed">
                    Open the AI chat and ask me anything about your content
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Remaining 5 glass-style cards */}
            {suggestions.map(suggestion => (
              <GlassCard
                key={suggestion.title}
                suggestion={suggestion}
                onClick={() => onSuggestionClick(suggestion.prompt)}
                testId={testId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
