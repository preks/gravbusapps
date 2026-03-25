import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  AiButton,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Separator
} from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import {
  ContentArticleAnalyzerService,
  type ContentArticleAnalyzerOutput
} from '../services/ContentArticleAnalyzerService'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { useContentDescendants } from '../hooks/useContentDescendants'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

interface ContentArticleAnalyzerProps {
  contentEntry: ContentEntry
  accessToken: string
  userId: string | undefined
}

export const ContentArticleAnalyzer: React.FC<ContentArticleAnalyzerProps> = ({
  contentEntry,
  accessToken,
  userId
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ContentArticleAnalyzerOutput | null>(null)
  const serviceRef = useRef<ContentArticleAnalyzerService | null>(null)
  const promptManagerClient = usePromptManagerClient(accessToken)

  // Fetch all descendants (comments and replies) - only when popover is open
  const { descendants, isLoading: isLoadingDescendants } = useContentDescendants(
    isPopoverOpen ? contentEntry.id : undefined,
    isPopoverOpen ? accessToken : undefined
  )

  // Initialize service
  useEffect(() => {
    if (accessToken) {
      serviceRef.current = new ContentArticleAnalyzerService(promptManagerClient)
    }
  }, [accessToken, promptManagerClient])

  const handleAnalyze = useCallback(async () => {
    if (!serviceRef.current || !userId || !contentEntry.id) {
      setError('Missing required data for analysis')
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await serviceRef.current.analyzeArticle({
        contentEntry,
        descendants: descendants || [],
        userId
      })
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze article')
    } finally {
      setIsLoading(false)
    }
  }, [contentEntry, descendants, userId])

  // Auto-analyze when popover opens
  useEffect(() => {
    if (isPopoverOpen && !analysis && !isLoading && !isLoadingDescendants) {
      handleAnalyze()
    }
  }, [isPopoverOpen, analysis, isLoading, isLoadingDescendants, descendants, handleAnalyze])

  const renderAnalysis = () => {
    if (isLoading || isLoadingDescendants) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:p-8">
          <Spinner size="lg" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" className="gba:m-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!analysis) {
      return <div className="gba:p-4 gba:text-center gba:text-muted-foreground">Click to analyze article</div>
    }

    const isAuthor = userId === contentEntry.creatorEmployeeId

    return (
      <div className="gba:p-6 gba:space-y-6 gba:max-h-[80vh] gba:overflow-y-auto">
        {/* Engagement Analysis - Always shown */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Analysis</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div>
              <p className="gba:text-sm gba:text-muted-foreground">Overall Score</p>
              <p className="gba:text-3xl gba:font-bold gba:mt-1">{analysis.engagementAnalysis.overallScore}/100</p>
            </div>

            <Separator />

            {/* Reaction Analysis */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Reactions</h4>
              <p className="gba:text-sm gba:text-muted-foreground">
                Total: {analysis.engagementAnalysis.reactionAnalysis.totalReactions}
              </p>
              {analysis.engagementAnalysis.reactionAnalysis.reactionBreakdown.length > 0 && (
                <div className="gba:mt-2 gba:space-y-1">
                  {analysis.engagementAnalysis.reactionAnalysis.reactionBreakdown.map((reaction, idx) => (
                    <div key={idx} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                      <span>{reaction.reactionType}</span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Badge variant="secondary">{reaction.count}</Badge>
                        <span className="gba:text-muted-foreground">{reaction.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="gba:mt-2 gba:flex gba:gap-4 gba:text-xs gba:text-muted-foreground">
                <span>
                  Positive: {analysis.engagementAnalysis.reactionAnalysis.sentimentScore.positive.toFixed(1)}%
                </span>
                <span>Neutral: {analysis.engagementAnalysis.reactionAnalysis.sentimentScore.neutral.toFixed(1)}%</span>
                <span>
                  Negative: {analysis.engagementAnalysis.reactionAnalysis.sentimentScore.negative.toFixed(1)}%
                </span>
              </div>
            </div>

            <Separator />

            {/* Comment Analysis */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Comments</h4>
              <p className="gba:text-sm gba:text-muted-foreground">
                Total: {analysis.engagementAnalysis.commentAnalysis.totalComments}
              </p>
              <p className="gba:text-sm gba:text-muted-foreground">
                Average Depth: {analysis.engagementAnalysis.commentAnalysis.averageDepth.toFixed(1)}
              </p>
              <p className="gba:text-sm gba:text-muted-foreground">
                Comment Score: {analysis.engagementAnalysis.commentAnalysis.commentScore}/100
              </p>
            </div>

            <Separator />

            {/* Reader Reception */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Reader Reception</h4>
              <p className="gba:text-sm gba:font-medium gba:mb-1">
                Rating: {analysis.engagementAnalysis.readerReception.rating}/100
              </p>
              <p className="gba:text-sm gba:mt-2">{analysis.engagementAnalysis.readerReception.summary}</p>
              {analysis.engagementAnalysis.readerReception.keyInsights.length > 0 && (
                <ul className="gba:mt-2 gba:list-disc gba:list-inside gba:text-sm gba:space-y-1">
                  {analysis.engagementAnalysis.readerReception.keyInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary - Only if not author */}
        {analysis.summary && !isAuthor && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              {analysis.summary.text && <p className="gba:text-sm">{analysis.summary.text}</p>}
              {analysis.summary.keyPoints && analysis.summary.keyPoints.length > 0 && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Key Points</h4>
                  <ul className="gba:list-disc gba:list-inside gba:text-sm gba:space-y-1">
                    {analysis.summary.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Improvement Recommendations - Only if author */}
        {analysis.improvementRecommendations && isAuthor && (
          <Card>
            <CardHeader>
              <CardTitle>Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              {/* Writing Tips */}
              {analysis.improvementRecommendations.writingTips.length > 0 && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Writing Tips</h4>
                  <div className="gba:space-y-3">
                    {analysis.improvementRecommendations.writingTips.map((tip, idx) => (
                      <div key={idx} className="gba:border-l-2 gba:border-primary gba:pl-3">
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <Badge
                            variant={
                              tip.priority === 'high'
                                ? 'destructive'
                                : tip.priority === 'medium'
                                  ? 'warning'
                                  : 'secondary'
                            }
                          >
                            {tip.priority}
                          </Badge>
                        </div>
                        <p className="gba:text-sm gba:font-medium">{tip.tip}</p>
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{tip.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Structure */}
              {analysis.improvementRecommendations.contentStructure.length > 0 && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Content Structure</h4>
                  <ul className="gba:list-disc gba:list-inside gba:text-sm gba:space-y-1">
                    {analysis.improvementRecommendations.contentStructure.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Future Considerations */}
              {analysis.improvementRecommendations.futureConsiderations.length > 0 && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Future Considerations</h4>
                  <div className="gba:space-y-2">
                    {analysis.improvementRecommendations.futureConsiderations.map((consideration, idx) => (
                      <div key={idx}>
                        <p className="gba:text-sm gba:font-medium">{consideration.consideration}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">{consideration.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intranet Best Practices */}
              {analysis.improvementRecommendations.intranetBestPractices.length > 0 && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Intranet Best Practices</h4>
                  <div className="gba:space-y-2">
                    {analysis.improvementRecommendations.intranetBestPractices.map((practice, idx) => (
                      <div key={idx}>
                        <p className="gba:text-sm gba:font-medium">{practice.practice}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">{practice.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.improvementRecommendations.strengths &&
                analysis.improvementRecommendations.strengths.length > 0 && (
                  <div>
                    <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Strengths</h4>
                    <ul className="gba:list-disc gba:list-inside gba:text-sm gba:space-y-1">
                      {analysis.improvementRecommendations.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Areas for Improvement */}
              {analysis.improvementRecommendations.areasForImprovement &&
                analysis.improvementRecommendations.areasForImprovement.length > 0 && (
                  <div>
                    <h4 className="gba:text-sm gba:font-semibold gba:mb-2">Areas for Improvement</h4>
                    <ul className="gba:list-disc gba:list-inside gba:text-sm gba:space-y-1">
                      {analysis.improvementRecommendations.areasForImprovement.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverAnchor asChild>
        <div>
          <AiButton
            variant="default"
            size="icon"
            showIcon={true}
            icon={<SparkleIcon size={16} />}
            onClick={() => setIsPopoverOpen(true)}
            data-testid="content-article-analyzer-button"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        className="gba:w-[700px] gba:max-h-[80vh] gba:overflow-hidden gba:p-0"
        sideOffset={8}
      >
        {renderAnalysis()}
      </PopoverContent>
    </Popover>
  )
}
