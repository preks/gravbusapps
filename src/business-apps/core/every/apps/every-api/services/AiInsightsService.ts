import { getEveryboxServiceApiUrl } from '../utils/everyboxServiceUrl'

export interface ComprehensiveInsights {
  userId: string
  lastUpdated: string
  writingStyle: WritingStyleInsights
  communicationPatterns: CommunicationPatternsInsights
  decisionPatterns: DecisionPatternsInsights
  temporalPatterns: TemporalPatternsInsights
  teamInsights: TeamInsights
  summary: InsightsSummary
}

export interface WritingStyleInsights {
  profile: {
    avgMessageLength: number
    avgSentenceLength: number
    formalityScore: number
    usesGreetings: boolean
    usesClosings: boolean
    vocabularyLevel: string
    punctuationStyle: string
  }
  commonPhrases: string[]
  sampleCount: number
  aiUsageStats: {
    totalMessages: number
    aiAssistedCount: number
    aiUsagePercentage: number
    mostUsedActions: Array<{ action: string; count: number }>
  }
}

export interface CommunicationPatternsInsights {
  totalCommunications: number
  uniqueRecipients: number
  avgResponseTime: number | null
  frequentContacts: Array<{
    recipientId: string
    recipientName: string | null
    messageCount: number
    lastContact: string
    relationshipType: 'frequent' | 'occasional' | 'rare'
  }>
  messageTypeDistribution: Array<{ type: string; count: number; percentage: number }>
  recentActivity: Array<{
    date: string
    messageCount: number
  }>
}

export interface DecisionPatternsInsights {
  totalDecisions: number
  approvalRate: number
  rejectionRate: number
  avgDecisionTime: number | null
  decisionsByCategory: Array<{
    category: string
    approved: number
    rejected: number
    approvalRate: number
  }>
  decisionsByTime: Array<{
    hour: number
    count: number
    approvalRate: number
  }>
  recentDecisions: Array<{
    taskId: string
    decision: string
    timestamp: string
    category?: string
  }>
}

export interface TemporalPatternsInsights {
  peakActivityHours: number[]
  activeDays: string[]
  avgTasksPerDay: number
  taskCompletionRate: number
  avgCompletionTime: number | null
  workloadTrend: 'increasing' | 'stable' | 'decreasing'
  activityByDayOfWeek: Array<{
    day: string
    count: number
  }>
  activityByHour: Array<{
    hour: number
    count: number
  }>
}

export interface TeamInsights {
  teamsCount: number
  mostActiveTeam: string | null
  collaborationScore: number
  teamPreferences: Array<{
    teamId: string
    teamName: string
    interactionCount: number
    preferredCommunicationStyle: string
  }>
}

export interface InsightsSummary {
  overallActivity: 'very_active' | 'active' | 'moderate' | 'low'
  communicationStyle: string
  decisionMaking: string
  aiAdoption: string
  strengths: string[]
  recommendations: string[]
}

export const AiInsightsService = {
  async getAvailableUsers(
    accessToken?: string
  ): Promise<{ users: Array<{ userId: string; messageCount: number; lastActivity: string }> }> {
    const baseUrl = getEveryboxServiceApiUrl()
    const url = `${baseUrl}/ai/insights/users`

    console.log('[AiInsightsService] getAvailableUsers - URL:', url)
    console.log('[AiInsightsService] getAvailableUsers - hasToken:', !!accessToken)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })

    console.log('[AiInsightsService] getAvailableUsers - response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AiInsightsService] getAvailableUsers - error response:', errorText)
      throw new Error(`Failed to fetch available users: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[AiInsightsService] getAvailableUsers - data:', data)
    return data
  },

  async getUserInsights(accessToken?: string, targetUserId?: string): Promise<ComprehensiveInsights> {
    const baseUrl = getEveryboxServiceApiUrl()
    console.log('[AiInsightsService] getUserInsights - baseUrl:', baseUrl)
    console.log('[AiInsightsService] getUserInsights - targetUserId:', targetUserId)
    console.log('[AiInsightsService] getUserInsights - hasToken:', !!accessToken)

    const params = new URLSearchParams()
    if (targetUserId) {
      params.append('targetUserId', targetUserId)
    }

    const url = `${baseUrl}/ai/insights/user${params.toString() ? `?${params.toString()}` : ''}`
    console.log('[AiInsightsService] getUserInsights - URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })

    console.log('[AiInsightsService] getUserInsights - response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AiInsightsService] getUserInsights - error response:', errorText)
      throw new Error(`Failed to fetch user insights: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[AiInsightsService] getUserInsights - success, data:', data)
    return data
  },

  async getWritingStyle(accessToken?: string, targetUserId?: string): Promise<WritingStyleInsights> {
    const baseUrl = getEveryboxServiceApiUrl()
    const params = new URLSearchParams()
    if (targetUserId) {
      params.append('targetUserId', targetUserId)
    }

    const url = `${baseUrl}/ai/insights/writing-style${params.toString() ? `?${params.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch writing style: ${response.statusText}`)
    }

    return await response.json()
  },

  async getCommunicationPatterns(accessToken?: string, targetUserId?: string): Promise<CommunicationPatternsInsights> {
    const baseUrl = getEveryboxServiceApiUrl()
    const params = new URLSearchParams()
    if (targetUserId) {
      params.append('targetUserId', targetUserId)
    }

    const url = `${baseUrl}/ai/insights/communication-patterns${params.toString() ? `?${params.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch communication patterns: ${response.statusText}`)
    }

    return await response.json()
  },

  async getDecisionPatterns(accessToken?: string, targetUserId?: string): Promise<DecisionPatternsInsights> {
    const baseUrl = getEveryboxServiceApiUrl()
    const params = new URLSearchParams()
    if (targetUserId) {
      params.append('targetUserId', targetUserId)
    }

    const url = `${baseUrl}/ai/insights/decision-patterns${params.toString() ? `?${params.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch decision patterns: ${response.statusText}`)
    }

    return await response.json()
  }
}
