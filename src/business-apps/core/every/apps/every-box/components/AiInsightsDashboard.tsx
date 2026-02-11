/**
 * AI Insights Dashboard
 * Comprehensive visualization of AI learning data and user patterns
 */

import React, { useState, useEffect } from 'react'
import {
  useTranslation,
  Button,
  toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Brain, TrendingUp, MessageSquare, CheckCircle, Clock, Users, Activity } from 'lucide-react'
import { AiInsightsService, ComprehensiveInsights } from '../../every-api/services/AiInsightsService'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import { base64ToDataURL } from '../utils/avatarUtils'
import translations from '../_i18n'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
]
const PRIMARY_COLOR = 'hsl(var(--primary))'
const SECONDARY_COLOR = 'hsl(var(--muted-foreground))'
const SUCCESS_COLOR = 'hsl(var(--chart-1))'

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`

interface EmployeeData {
  userId: string
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
}

interface UserDetails {
  id: string
  name: string
  givenName: string
  familyName: string
  avatarUrl?: string
}

export const AiInsightsDashboard: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  useTranslation(translations)
  const [insights, setInsights] = useState<ComprehensiveInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ userId: string; messageCount: number; lastActivity: string }>
  >([])
  const [viewingUserId, setViewingUserId] = useState(userInfo?.id || '')
  const [userDetailsMap, setUserDetailsMap] = useState<Record<string, UserDetails>>({})
  const [, setLoadingUsers] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const userClient = useUserManagementClient(accessToken)

  // Sync viewingUserId when userInfo becomes available
  useEffect(() => {
    if (userInfo?.id && !viewingUserId) {
      setViewingUserId(userInfo.id)
    }
  }, [userInfo?.id])

  // Load available users on mount
  useEffect(() => {
    loadAvailableUsers()
  }, [accessToken])

  // Load insights when viewing user changes (only if we have available users)
  useEffect(() => {
    if (viewingUserId && availableUsers.length > 0) {
      loadInsights(viewingUserId)
    } else if (availableUsers.length === 0) {
      // No users available, stop loading
      setLoading(false)
      setInsights(null)
    }
  }, [viewingUserId, accessToken, availableUsers.length])

  // Fetch user details when available users or insights change
  useEffect(() => {
    const userIdsToFetch = new Set<string>()

    // Add available users
    availableUsers.forEach(u => userIdsToFetch.add(u.userId))

    // Add current user if present
    if (userInfo?.id) userIdsToFetch.add(userInfo.id)

    // Add frequent contacts from insights
    if (insights?.communicationPatterns?.frequentContacts) {
      insights.communicationPatterns.frequentContacts.forEach(contact => {
        if (contact.recipientId) userIdsToFetch.add(contact.recipientId)
      })
    }

    // Filter out already loaded users
    const unloadedUserIds = Array.from(userIdsToFetch).filter(id => !userDetailsMap[id])

    if (unloadedUserIds.length > 0) {
      fetchUserDetails(unloadedUserIds)
    }
  }, [availableUsers, insights, userInfo?.id])

  const fetchUserDetails = async (userIds: string[]) => {
    if (userIds.length === 0 || !accessToken) return

    setLoadingUsers(true)
    console.log('[AiInsights] Fetching user details for:', userIds)

    try {
      // Fetch both user names and employee avatars in parallel
      const [userDataPromises, employeeResponse] = await Promise.all([
        Promise.all(
          userIds.map(async userId => {
            try {
              const user = await userClient.getUserById(userId)
              return { userId, user }
            } catch (error) {
              console.warn(`[AiInsights] Failed to fetch user ${userId}:`, error)
              return { userId, user: null }
            }
          })
        ),
        graphqlClient.request<{ Employee: EmployeeData[] }>(GET_EMPLOYEES_BY_USER_IDS, { userIds })
      ])

      // Create a map of userId -> employee data (with avatars)
      const employeeMap = new Map<string, EmployeeData>()
      if (employeeResponse?.Employee) {
        employeeResponse.Employee.forEach(emp => {
          employeeMap.set(emp.userId, emp)
        })
      }

      // Combine user and employee data
      const newUserDetails: Record<string, UserDetails> = {}
      userDataPromises.forEach(({ userId, user }) => {
        const employee = employeeMap.get(userId)

        if (user || employee) {
          const name =
            user?.name || employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim()
          newUserDetails[userId] = {
            id: userId,
            name: name || userId.substring(0, 8) + '...',
            givenName: user?.givenName || employee?.firstName || '',
            familyName: user?.familyName || employee?.lastName || '',
            avatarUrl: employee?.pictureThumbnail ? base64ToDataURL(employee.pictureThumbnail) : undefined
          }
        }
      })

      setUserDetailsMap(prev => ({ ...prev, ...newUserDetails }))
      console.log('[AiInsights] Loaded user details:', newUserDetails)
    } catch (error) {
      console.error('[AiInsights] Failed to fetch user details:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadAvailableUsers = async () => {
    console.log('[AiInsights] Loading available users...')
    try {
      const response = await AiInsightsService.getAvailableUsers(accessToken)
      console.log('[AiInsights] Loaded users response:', response)
      const users = response.users || []
      console.log('[AiInsights] Loaded users count:', users.length)
      setAvailableUsers(users)
    } catch (error) {
      console.error('[AiInsights] Failed to load users:', error)
      toast.error(`Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const loadInsights = async (userId?: string) => {
    console.log('[AiInsights] Loading insights for user:', userId)
    if (!userId) {
      console.log('[AiInsights] No userId provided, skipping')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // When viewing own insights, don't pass targetUserId -- let the backend
      // use the JWT user.id (same ID used when storing communications).
      // userInfo.id (platform ID) may differ from the JWT Keycloak ID.
      const isOwnUser = userId === userInfo?.id
      const data = await AiInsightsService.getUserInsights(accessToken, isOwnUser ? undefined : userId)
      console.log('[AiInsights] Loaded insights:', data)
      setInsights(data)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('[AiInsights] Failed to load insights:', error)
      toast.error(`Failed to load AI insights: ${errorMsg}`)

      // Set empty insights to show "no data" state
      setInsights(null)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for user display
  const getUserDisplayName = (userId: string): string => {
    const userDetails = userDetailsMap[userId]
    if (userDetails?.name) return userDetails.name
    if (userDetails?.givenName || userDetails?.familyName) {
      return `${userDetails.givenName} ${userDetails.familyName}`.trim()
    }
    return userId.substring(0, 8) + '...'
  }

  const getUserInitials = (userId: string): string => {
    const userDetails = userDetailsMap[userId]
    if (userDetails?.givenName && userDetails?.familyName) {
      return `${userDetails.givenName.charAt(0)}${userDetails.familyName.charAt(0)}`.toUpperCase()
    }
    if (userDetails?.name) {
      const parts = userDetails.name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      }
      return userDetails.name.substring(0, 2).toUpperCase()
    }
    return userId.substring(0, 2).toUpperCase()
  }

  const getUserAvatarUrl = (userId: string): string | undefined => {
    return userDetailsMap[userId]?.avatarUrl
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:p-8">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:h-8 gba:w-8 gba:border-4 gba:border-primary gba:border-t-transparent gba:rounded-full gba:mx-auto gba:mb-4"></div>
          <p className="gba:text-muted-foreground">Loading AI insights...</p>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:p-8">
        <div className="gba:text-center gba:max-w-md">
          <Brain className="gba:h-16 gba:w-16 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2">No AI Insights Available Yet</h2>
          <p className="gba:text-muted-foreground gba:mb-4">
            Start using the AI Writing Assistant to generate insights. The system will learn from your:
          </p>
          <ul className="gba:text-sm gba:text-muted-foreground gba:text-left gba:space-y-2 gba:mb-4">
            <li className="gba:flex gba:items-start gba:gap-2">
              <MessageSquare className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
              <span>Communication patterns and writing style</span>
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <CheckCircle className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
              <span>Decision-making preferences</span>
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <Clock className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
              <span>Activity patterns and peak hours</span>
            </li>
            <li className="gba:flex gba:items-start gba:gap-2">
              <Users className="gba:h-4 gba:w-4 gba:mt-0.5 gba:flex-shrink-0" />
              <span>Relationship and collaboration insights</span>
            </li>
          </ul>
          <Button onClick={() => loadInsights(userInfo?.id || viewingUserId)} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Prepare data for spider/radar chart
  const radarData = [
    {
      subject: 'Activity',
      value:
        insights.summary.overallActivity === 'very_active'
          ? 100
          : insights.summary.overallActivity === 'active'
            ? 75
            : insights.summary.overallActivity === 'moderate'
              ? 50
              : 25,
      fullMark: 100
    },
    {
      subject: 'AI Adoption',
      value: insights.writingStyle.aiUsageStats.aiUsagePercentage,
      fullMark: 100
    },
    {
      subject: 'Formality',
      value: insights.writingStyle.profile.formalityScore,
      fullMark: 100
    },
    {
      subject: 'Approval Rate',
      value: insights.decisionPatterns.approvalRate,
      fullMark: 100
    },
    {
      subject: 'Network Size',
      value: Math.min((insights.communicationPatterns.uniqueRecipients / 20) * 100, 100),
      fullMark: 100
    }
  ]

  // Activity by hour data
  const activityByHourData = insights.temporalPatterns.activityByHour.map(item => ({
    hour: `${item.hour}:00`,
    activity: item.count
  }))

  // Message type distribution
  const messageTypeData = insights.communicationPatterns.messageTypeDistribution.map(item => ({
    name: item.type,
    value: item.count
  }))

  // Decision time distribution
  const decisionTimeData = insights.decisionPatterns.decisionsByTime.map(item => ({
    hour: `${item.hour}:00`,
    decisions: item.count,
    approvalRate: item.approvalRate
  }))

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background">
      {/* Header */}
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Brain className="gba:h-6 gba:w-6 gba:text-primary" />
            <div>
              <h1 className="gba:text-xl gba:font-semibold">AI Insights Dashboard</h1>
              <p className="gba:text-sm gba:text-muted-foreground">Comprehensive AI learning data and user patterns</p>
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:text-muted-foreground">Select User</span>
              <Select value={viewingUserId} onValueChange={setViewingUserId}>
                <SelectTrigger className="gba:w-80">
                  <SelectValue placeholder="Select a user to view insights" />
                </SelectTrigger>
                <SelectContent>
                  {/* Current user at the top */}
                  {userInfo?.id && (
                    <>
                      <SelectItem value={userInfo.id}>
                        <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
                          <Avatar className="gba:h-6 gba:w-6">
                            <AvatarImage src={getUserAvatarUrl(userInfo.id)} alt={getUserDisplayName(userInfo.id)} />
                            <AvatarFallback className="gba:text-xs">{getUserInitials(userInfo.id)}</AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium">You ({getUserDisplayName(userInfo.id)})</span>
                        </div>
                      </SelectItem>
                      {availableUsers.length > 0 && <div className="gba:h-px gba:bg-border gba:my-1" />}
                    </>
                  )}

                  {/* Other users */}
                  {availableUsers
                    .filter(u => u.userId !== userInfo?.id)
                    .map(availableUser => (
                      <SelectItem key={availableUser.userId} value={availableUser.userId}>
                        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:gap-4">
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <Avatar className="gba:h-6 gba:w-6">
                              <AvatarImage
                                src={getUserAvatarUrl(availableUser.userId)}
                                alt={getUserDisplayName(availableUser.userId)}
                              />
                              <AvatarFallback className="gba:text-xs">
                                {getUserInitials(availableUser.userId)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">{getUserDisplayName(availableUser.userId)}</span>
                          </div>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {availableUser.messageCount} msgs
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <span>Viewing:</span>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Avatar className="gba:h-5 gba:w-5">
              <AvatarImage src={getUserAvatarUrl(viewingUserId)} alt={getUserDisplayName(viewingUserId)} />
              <AvatarFallback className="gba:text-xs">{getUserInitials(viewingUserId)}</AvatarFallback>
            </Avatar>
            <span className="gba:text-foreground gba:font-medium">{getUserDisplayName(viewingUserId)}</span>
          </div>
          <span>|</span>
          <span>Last updated: {insights ? new Date(insights.lastUpdated).toLocaleString() : 'Loading...'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {/* Summary Cards */}
        <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Activity className="gba:h-4 gba:w-4 gba:text-blue-500" />
              <span className="gba:text-sm gba:font-medium">Overall Activity</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:capitalize">{insights.summary.overallActivity}</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {insights.communicationPatterns.totalCommunications} total communications
            </div>
          </div>

          <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Brain className="gba:h-4 gba:w-4 gba:text-purple-500" />
              <span className="gba:text-sm gba:font-medium">AI Adoption</span>
            </div>
            <div className="gba:text-2xl gba:font-bold">
              {insights.writingStyle.aiUsageStats.aiUsagePercentage.toFixed(0)}%
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{insights.summary.aiAdoption}</div>
          </div>

          <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-500" />
              <span className="gba:text-sm gba:font-medium">Approval Rate</span>
            </div>
            <div className="gba:text-2xl gba:font-bold">{insights.decisionPatterns.approvalRate.toFixed(0)}%</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {insights.decisionPatterns.totalDecisions} decisions
            </div>
          </div>

          <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Users className="gba:h-4 gba:w-4 gba:text-orange-500" />
              <span className="gba:text-sm gba:font-medium">Network Size</span>
            </div>
            <div className="gba:text-2xl gba:font-bold">{insights.communicationPatterns.uniqueRecipients}</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">unique contacts</div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="gba:space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="writing">Writing Style</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="temporal">Activity Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="gba:space-y-6">
            {/* Spider Chart */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Overall Profile (Spider Chart)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Score" dataKey="value" stroke={PRIMARY_COLOR} fill={PRIMARY_COLOR} fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Strengths and Recommendations */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Strengths</h3>
                <ul className="gba:space-y-2">
                  {insights.summary.strengths.map((strength, index) => (
                    <li key={index} className="gba:flex gba:items-start gba:gap-2">
                      <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-500 gba:mt-0.5 gba:flex-shrink-0" />
                      <span className="gba:text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Recommendations</h3>
                <ul className="gba:space-y-2">
                  {insights.summary.recommendations.map((recommendation, index) => (
                    <li key={index} className="gba:flex gba:items-start gba:gap-2">
                      <TrendingUp className="gba:h-4 gba:w-4 gba:text-blue-500 gba:mt-0.5 gba:flex-shrink-0" />
                      <span className="gba:text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="writing" className="gba:space-y-6">
            {/* Writing Style Metrics */}
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Formality Score</div>
                <div className="gba:text-3xl gba:font-bold">{insights.writingStyle.profile.formalityScore}/100</div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                  {insights.writingStyle.profile.formalityScore > 70
                    ? 'Very formal'
                    : insights.writingStyle.profile.formalityScore > 50
                      ? 'Professional'
                      : 'Casual'}
                </div>
              </div>

              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Avg Message Length</div>
                <div className="gba:text-3xl gba:font-bold">
                  {insights.writingStyle.profile.avgMessageLength.toFixed(0)}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">characters</div>
              </div>

              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Vocabulary Level</div>
                <div className="gba:text-2xl gba:font-bold gba:capitalize">
                  {insights.writingStyle.profile.vocabularyLevel}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-2 gba:capitalize">
                  {insights.writingStyle.profile.punctuationStyle} punctuation
                </div>
              </div>
            </div>

            {/* AI Usage */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">AI Writing Assistant Usage</h3>
              <div className="gba:grid gba:grid-cols-2 gba:gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'AI Assisted',
                            value: insights.writingStyle.aiUsageStats.aiAssistedCount
                          },
                          {
                            name: 'Manual',
                            value:
                              insights.writingStyle.aiUsageStats.totalMessages -
                              insights.writingStyle.aiUsageStats.aiAssistedCount
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label
                        outerRadius={80}
                        fill={PRIMARY_COLOR}
                        dataKey="value"
                      >
                        <Cell fill={PRIMARY_COLOR} />
                        <Cell fill={SECONDARY_COLOR} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="gba:text-sm gba:font-medium gba:mb-3">Most Used AI Actions</h4>
                  <div className="gba:space-y-2">
                    {insights.writingStyle.aiUsageStats.mostUsedActions.map((action, index) => (
                      <div key={index} className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-sm gba:capitalize">{action.action}</span>
                        <span className="gba:text-sm gba:font-medium">{action.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Common Phrases */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Common Phrases</h3>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {insights.writingStyle.commonPhrases.map((phrase, index) => (
                  <span key={index} className="gba:px-3 gba:py-1 gba:bg-muted gba:text-sm gba:rounded-full gba:border">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="communication" className="gba:space-y-6">
            {/* Message Type Distribution */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Message Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={messageTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => `${entry.name} (${entry.value})`}
                    outerRadius={100}
                    fill={PRIMARY_COLOR}
                    dataKey="value"
                  >
                    {messageTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Frequent Contacts */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Top Contacts</h3>
              <div className="gba:space-y-3">
                {insights.communicationPatterns.frequentContacts.slice(0, 10).map((contact, index) => (
                  <div
                    key={index}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/50 gba:rounded"
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:h-8 gba:w-8 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                        {index + 1}
                      </div>
                      <Avatar className="gba:h-10 gba:w-10">
                        <AvatarImage
                          src={getUserAvatarUrl(contact.recipientId)}
                          alt={contact.recipientName || getUserDisplayName(contact.recipientId)}
                        />
                        <AvatarFallback>{getUserInitials(contact.recipientId)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="gba:text-sm gba:font-medium">
                          {contact.recipientName || getUserDisplayName(contact.recipientId)}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:capitalize">
                          {contact.relationshipType} contact
                        </div>
                      </div>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:text-sm gba:font-medium">{contact.messageCount} messages</div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        Last: {new Date(contact.lastContact).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="decisions" className="gba:space-y-6">
            {/* Decision Stats */}
            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Total Decisions</div>
                <div className="gba:text-3xl gba:font-bold">{insights.decisionPatterns.totalDecisions}</div>
              </div>

              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Approval Rate</div>
                <div className="gba:text-3xl gba:font-bold gba:text-green-600">
                  {insights.decisionPatterns.approvalRate.toFixed(0)}%
                </div>
              </div>

              <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">Rejection Rate</div>
                <div className="gba:text-3xl gba:font-bold gba:text-red-600">
                  {insights.decisionPatterns.rejectionRate.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Decisions by Time */}
            {decisionTimeData.length > 0 && (
              <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Decision Activity by Hour</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={decisionTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="decisions" fill={PRIMARY_COLOR} name="Decisions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Decisions */}
            <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Recent Decisions</h3>
              <div className="gba:space-y-2">
                {insights.decisionPatterns.recentDecisions.slice(0, 10).map((decision, index) => (
                  <div
                    key={index}
                    className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:bg-muted/50 gba:rounded gba:text-sm"
                  >
                    <span className="gba:font-mono gba:text-xs">{decision.taskId.substring(0, 8)}...</span>
                    <span
                      className={`gba:font-medium gba:capitalize ${decision.decision === 'approved' ? 'gba:text-green-600' : 'gba:text-red-600'}`}
                    >
                      {decision.decision}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {new Date(decision.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="temporal" className="gba:space-y-6">
            {/* Peak Hours */}
            <div className="gba:bg-card gba:p-4 gba:rounded-lg gba:border">
              <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Peak Activity Hours</h3>
              <div className="gba:flex gba:gap-4 gba:text-3xl gba:font-bold gba:text-primary">
                {insights.temporalPatterns.peakActivityHours.map((hour, index) => (
                  <span key={index}>
                    {hour}:00
                    {index < insights.temporalPatterns.peakActivityHours.length - 1 && ', '}
                  </span>
                ))}
              </div>
            </div>

            {/* Activity by Hour */}
            {activityByHourData.length > 0 && (
              <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Activity by Hour</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityByHourData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activity" stroke={PRIMARY_COLOR} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Activity by Day of Week */}
            {insights.temporalPatterns.activityByDayOfWeek.length > 0 && (
              <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-4">Activity by Day of Week</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insights.temporalPatterns.activityByDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={SUCCESS_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
