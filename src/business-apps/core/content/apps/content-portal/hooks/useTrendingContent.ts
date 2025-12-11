import { useMemo } from 'react'
import { ContentEntry } from '@/common/data/content/types/contentTypes'

interface TrendingContentParams {
  entries: ContentEntry[]
  limit?: number
}

interface TrendingScore {
  entry: ContentEntry
  score: number
}

/**
 * Smart Trending Algorithm
 * Combines multiple signals to determine trending content:
 * 1. Recency - newer content gets higher score
 * 2. Engagement - reactions and comments boost score
 * 3. Time decay - older content loses score over time
 */
const calculateTrendingScore = (entry: ContentEntry): number => {
  const now = Date.now()
  const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : now
  const ageInHours = (now - createdAt) / (1000 * 60 * 60)

  // Recency Score: Decays over time (max 100 points for very new content)
  // Content older than 7 days gets minimal recency score
  const recencyScore = Math.max(0, 100 - (ageInHours / 24) * 10)

  // Engagement Score: Reactions and comments
  const reactions = entry.contentEntryReactionCounts?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
  const comments = entry.commentCount || 0

  // Comments are weighted higher than reactions (more meaningful engagement)
  const engagementScore = reactions * 2 + comments * 5

  // Time Decay Factor: Recent engagement matters more
  // Older content needs MORE engagement to stay trending
  const decayFactor = Math.max(0.1, 1 - ageInHours / (7 * 24)) // Decays over 7 days

  // Combined Score
  // New content: High recency + some engagement = trending
  // Old content: Needs high engagement to compensate for low recency
  const totalScore = recencyScore + engagementScore * decayFactor

  return totalScore
}

/**
 * Hook to calculate and return trending content
 * Uses smart algorithm that balances recency with engagement
 */
export const useTrendingContent = ({ entries, limit = 5 }: TrendingContentParams) => {
  const trendingEntries = useMemo(() => {
    if (!entries || entries.length === 0) return []

    // Calculate scores for all entries
    const scored: TrendingScore[] = entries.map(entry => ({
      entry,
      score: calculateTrendingScore(entry)
    }))

    // Sort by score (highest first) and take top N
    const sorted = [...scored].sort((a, b) => b.score - a.score)
    return sorted.slice(0, limit).map(item => item.entry)
  }, [entries, limit])

  return trendingEntries
}

/**
 * Helper: Get trending score for debugging/display
 */
export const getTrendingScore = (entry: ContentEntry): number => {
  return calculateTrendingScore(entry)
}
