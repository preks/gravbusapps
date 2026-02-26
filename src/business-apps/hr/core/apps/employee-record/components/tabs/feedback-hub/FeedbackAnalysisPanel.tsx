'use client'

import React, { useState } from 'react'
import { Badge, Button, Card, CardContent, Spinner } from '@newwork/nw-design-system'
import { Sparkle, TrendUp, TrendDown, Minus, X, CaretDown, CaretUp, Lightbulb } from '@phosphor-icons/react'
import { FeedbackAnalysisResult } from '../../../hooks/useFeedbackAnalysis'

const sentimentColor = (score: number) => {
  if (score >= 81) return 'gba:text-green-600'
  if (score >= 61) return 'gba:text-green-500'
  if (score >= 41) return 'gba:text-yellow-500'
  if (score >= 21) return 'gba:text-orange-500'
  return 'gba:text-red-500'
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'improving') return <TrendUp className="gba:h-4 gba:w-4 gba:text-green-500" weight="bold" />
  if (trend === 'declining') return <TrendDown className="gba:h-4 gba:w-4 gba:text-red-500" weight="bold" />
  return <Minus className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="bold" />
}

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="gba:border gba:rounded-lg gba:bg-background">
      <button
        className="gba:flex gba:items-center gba:justify-between gba:w-full gba:p-3 gba:text-sm gba:font-medium hover:gba:bg-muted/50 gba:transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span>
          {title} ({count})
        </span>
        {open ? <CaretUp className="gba:h-4 gba:w-4" /> : <CaretDown className="gba:h-4 gba:w-4" />}
      </button>
      {open && <div className="gba:p-3 gba:pt-0">{children}</div>}
    </div>
  )
}

interface FeedbackAnalysisPanelProps {
  receivedResult: FeedbackAnalysisResult | null
  givenResult: FeedbackAnalysisResult | null
  isAnalyzing: boolean
  error: string | null
  receivedCount: number
  givenCount: number
  onClose: () => void
}

const FeedbackAnalysisPanel: React.FC<FeedbackAnalysisPanelProps> = ({
  receivedResult,
  givenResult,
  isAnalyzing,
  error,
  receivedCount,
  givenCount,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'given'>(receivedCount > 0 ? 'received' : 'given')
  const activeResult = activeTab === 'received' ? receivedResult : givenResult
  const hasReceived = receivedCount > 0
  const hasGiven = givenCount > 0
  const hasBoth = hasReceived && hasGiven

  return (
    <Card className="gba:border-primary/20 gba:bg-primary/5" data-testid="feedback-analysis-panel">
      <CardContent className="gba:p-5">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkle className="gba:h-5 gba:w-5 gba:text-primary" weight="fill" />
            <h4 className="gba:font-semibold gba:text-base">AI Feedback Analysis</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-analysis-button">
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        {isAnalyzing && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:gap-3">
            <Spinner size="md" />
            <span className="gba:text-muted-foreground">
              Analyzing feedback ({receivedCount > 0 ? `${receivedCount} received` : ''}
              {receivedCount > 0 && givenCount > 0 ? ', ' : ''}
              {givenCount > 0 ? `${givenCount} given` : ''})…
            </span>
          </div>
        )}

        {error && <div className="gba:text-destructive gba:text-sm gba:py-4">{error}</div>}

        {!isAnalyzing && (receivedResult || givenResult) && (
          <>
            {hasBoth && (
              <div className="gba:flex gba:gap-1 gba:mb-4 gba:p-1 gba:bg-muted/50 gba:rounded-lg gba:w-fit">
                <button
                  className={`gba:px-4 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-colors ${
                    activeTab === 'received'
                      ? 'gba:bg-background gba:shadow-sm gba:text-foreground'
                      : 'gba:text-muted-foreground hover:gba:text-foreground'
                  }`}
                  onClick={() => setActiveTab('received')}
                >
                  Received ({receivedCount})
                </button>
                <button
                  className={`gba:px-4 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-colors ${
                    activeTab === 'given'
                      ? 'gba:bg-background gba:shadow-sm gba:text-foreground'
                      : 'gba:text-muted-foreground hover:gba:text-foreground'
                  }`}
                  onClick={() => setActiveTab('given')}
                >
                  Given ({givenCount})
                </button>
              </div>
            )}

            {activeResult ? (
              <AnalysisContent result={activeResult} />
            ) : (
              <div className="gba:text-sm gba:text-muted-foreground gba:py-4">No {activeTab} feedback to analyze.</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

const AnalysisContent: React.FC<{ result: FeedbackAnalysisResult }> = ({ result }) => (
  <div className="gba:space-y-5">
    <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{result.summary}</p>

    {/* Score cards */}
    <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
      <div className="gba:text-center gba:p-3 gba:rounded-lg gba:bg-background gba:border">
        <div className={`gba:text-2xl gba:font-bold ${sentimentColor(result.sentiment.overall_score)}`}>
          {result.sentiment.overall_score}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{result.sentiment.label}</div>
      </div>
      <div className="gba:text-center gba:p-3 gba:rounded-lg gba:bg-background gba:border">
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
          <TrendIcon trend={result.sentiment.trend} />
          <span className="gba:text-sm gba:font-medium gba:capitalize">{result.sentiment.trend.replace('_', ' ')}</span>
        </div>
        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Trend</div>
      </div>
      <div className="gba:text-center gba:p-3 gba:rounded-lg gba:bg-background gba:border">
        <div className="gba:text-2xl gba:font-bold">{result.total_entries}</div>
        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Entries Analyzed</div>
      </div>
      <div className="gba:p-3 gba:rounded-lg gba:bg-background gba:border">
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:text-sm">
          <span className="gba:text-green-500 gba:font-medium">{result.sentiment.distribution.positive} pos</span>
          <span className="gba:text-yellow-500 gba:font-medium">{result.sentiment.distribution.neutral} neu</span>
          <span className="gba:text-red-500 gba:font-medium">{result.sentiment.distribution.negative} neg</span>
        </div>
        {result.total_entries > 0 && (
          <div className="gba:flex gba:h-2 gba:rounded-full gba:overflow-hidden gba:mt-2">
            <div
              className="gba:bg-green-500"
              style={{ width: `${(result.sentiment.distribution.positive / result.total_entries) * 100}%` }}
            />
            <div
              className="gba:bg-yellow-500"
              style={{ width: `${(result.sentiment.distribution.neutral / result.total_entries) * 100}%` }}
            />
            <div
              className="gba:bg-red-500"
              style={{ width: `${(result.sentiment.distribution.negative / result.total_entries) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>

    {/* Highlights */}
    {result.highlights && (result.highlights.most_positive || result.highlights.most_constructive) && (
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
        {result.highlights.most_positive && (
          <div className="gba:p-3 gba:rounded-lg gba:bg-green-50 gba:dark:bg-green-950/20 gba:border gba:border-green-200 gba:dark:border-green-800">
            <div className="gba:text-xs gba:font-medium gba:text-green-600 gba:mb-1">Most Positive</div>
            <div className="gba:text-sm gba:italic">&ldquo;{result.highlights.most_positive}&rdquo;</div>
          </div>
        )}
        {result.highlights.most_constructive && (
          <div className="gba:p-3 gba:rounded-lg gba:bg-orange-50 gba:dark:bg-orange-950/20 gba:border gba:border-orange-200 gba:dark:border-orange-800">
            <div className="gba:text-xs gba:font-medium gba:text-orange-600 gba:mb-1">Most Constructive</div>
            <div className="gba:text-sm gba:italic">&ldquo;{result.highlights.most_constructive}&rdquo;</div>
          </div>
        )}
      </div>
    )}

    {/* Themes */}
    {result.themes.length > 0 && (
      <CollapsibleSection title="Themes" count={result.themes.length} defaultOpen>
        <div className="gba:space-y-3">
          {result.themes.map((theme, i) => (
            <div key={i} className="gba:flex gba:items-start gba:gap-3 gba:p-2 gba:rounded gba:bg-muted/30">
              <div className="gba:flex-1">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                  <span className="gba:font-medium gba:text-sm">{theme.name}</span>
                  <Badge
                    variant={
                      theme.sentiment === 'positive'
                        ? 'default'
                        : theme.sentiment === 'negative'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {theme.sentiment}
                  </Badge>
                  <span className="gba:text-xs gba:text-muted-foreground">({theme.frequency}x)</span>
                </div>
                {theme.evidence?.map((e, j) => (
                  <div key={j} className="gba:text-xs gba:text-muted-foreground gba:ml-2">
                    &bull; {e}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    )}

    {/* Strengths */}
    {result.strengths.length > 0 && (
      <CollapsibleSection title="Strengths" count={result.strengths.length} defaultOpen>
        {result.strengths.map((s, i) => (
          <div key={i} className="gba:flex gba:items-start gba:gap-2 gba:py-1">
            <span className="gba:text-green-500 gba:mt-0.5">&#10003;</span>
            <span className="gba:text-sm">{s}</span>
          </div>
        ))}
      </CollapsibleSection>
    )}

    {/* Growth Areas */}
    {result.growth_areas.length > 0 && (
      <CollapsibleSection title="Growth Areas" count={result.growth_areas.length}>
        {result.growth_areas.map((g, i) => (
          <div key={i} className="gba:flex gba:items-start gba:gap-2 gba:py-1">
            <span className="gba:text-orange-500 gba:mt-0.5">&rarr;</span>
            <span className="gba:text-sm">{g}</span>
          </div>
        ))}
      </CollapsibleSection>
    )}

    {/* Recommendations */}
    {result.recommendations.length > 0 && (
      <CollapsibleSection title="Recommendations" count={result.recommendations.length}>
        {result.recommendations.map((r, i) => (
          <div key={i} className="gba:flex gba:items-start gba:gap-2 gba:py-1">
            <Lightbulb className="gba:h-4 gba:w-4 gba:text-primary gba:mt-0.5 gba:shrink-0" weight="fill" />
            <span className="gba:text-sm">{r}</span>
          </div>
        ))}
      </CollapsibleSection>
    )}
  </div>
)

export default FeedbackAnalysisPanel
