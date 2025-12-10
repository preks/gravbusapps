import React from 'react'
import {
  useTranslation,
  Card,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Progress,
  Badge
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUserEngagement } from '../../hooks/useUserEngagement'
import { Eye, Heart, MessageCircle, HelpCircle, Target, Trophy, TrendingUp, Upload } from 'lucide-react'
import translations from '../../_i18n'

type EngagementViewProps = BusinessAppContextProps

interface AchievementLevel {
  name: string
  points: number
  circleColor: string
  iconColor: string
}

const ACHIEVEMENT_LEVELS: AchievementLevel[] = [
  {
    name: 'Newcomer',
    points: 0,
    circleColor: 'gba:bg-slate-100',
    iconColor: 'gba:text-slate-600'
  },
  {
    name: 'Beginner',
    points: 50,
    circleColor: 'gba:bg-yellow-100',
    iconColor: 'gba:text-yellow-600'
  },
  {
    name: 'Intermediate',
    points: 200,
    circleColor: 'gba:bg-green-100',
    iconColor: 'gba:text-green-600'
  },
  {
    name: 'Advanced',
    points: 500,
    circleColor: 'gba:bg-blue-100',
    iconColor: 'gba:text-blue-600'
  },
  {
    name: 'Expert',
    points: 1000,
    circleColor: 'gba:bg-purple-100',
    iconColor: 'gba:text-purple-600'
  }
]

const EngagementView: React.FC<EngagementViewProps> = ({ accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const userId = userInfo?.id
  const { engagementData, isLoading, error, refetch } = useUserEngagement(userId, accessToken)

  const getCurrentLevel = () => {
    const sortedLevels = [...ACHIEVEMENT_LEVELS].sort((a, b) => b.points - a.points)
    for (const level of sortedLevels) {
      if (engagementData.totalScore >= level.points) {
        return level
      }
    }
    return ACHIEVEMENT_LEVELS[0]
  }

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel()
    const currentIndex = ACHIEVEMENT_LEVELS.findIndex(l => l.name === currentLevel.name)
    if (currentIndex < ACHIEVEMENT_LEVELS.length - 1) {
      return ACHIEVEMENT_LEVELS[currentIndex + 1]
    }
    return null
  }

  const calculateProgress = () => {
    const currentLevel = getCurrentLevel()
    const nextLevel = getNextLevel()

    if (!nextLevel) {
      return 100 // Max level reached
    }

    const currentPoints = engagementData.totalScore
    const levelStart = currentLevel.points
    const levelEnd = nextLevel.points
    const progress = ((currentPoints - levelStart) / (levelEnd - levelStart)) * 100

    return Math.min(Math.max(progress, 0), 100)
  }

  const currentLevel = getCurrentLevel()
  const progress = calculateProgress()

  if (!userId) {
    return (
      <div className="gba:p-6" data-testid="engagement-view-no-user">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>User ID not available. Cannot load engagement data.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="engagement-view-error">
        <Alert variant="destructive">
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error?.message || String(error)}
            <Button onClick={refetch} variant="outline" className="gba:mt-2 gba:ml-4">
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div
      className="gba:relative gba:min-h-screen gba:flex gba:flex-col gba:items-center gba:w-full"
      data-testid="engagement-view"
    >
      <div className="gba:w-full gba:max-w-[1300px] gba:mx-auto gba:mb-10 gba:px-4">
        {/* Engagement Dashboard Card */}
        <Card className="gba:mb-8 gba:p-8 gba:bg-primary gba:text-primary-foreground">
          <div className="gba:flex gba:items-start gba:justify-between gba:mb-6">
            <div>
              <h1 className="gba:text-4xl gba:font-bold gba:mb-2">{t('engagement-dashboard-title')}</h1>
              <p className="gba:text-lg gba:opacity-90">{t('engagement-dashboard-subtitle')}</p>
            </div>
            <TrendingUp className="gba:w-16 gba:h-16 gba:opacity-80" />
          </div>

          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-8">
            {/* Left Side - Current Level & Progress */}
            <div>
              <div className="gba:mb-6">
                <p className="gba:text-sm gba:opacity-80 gba:mb-2">{t('current-level')}</p>
                <Badge variant="secondary" className="gba:text-base gba:px-4 gba:py-2">
                  {currentLevel.name}
                </Badge>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <p className="gba:text-sm gba:opacity-80">{t('progress-to-next-level')}</p>
                <span className="gba:text-sm gba:font-semibold">{Math.round(progress)}%</span>
                <Progress value={progress} className="gba:h-3 gba:w-full" />
              </div>
            </div>

            {/* Right Side - Total Score */}
            <div className="gba:flex gba:flex-col gba:items-end gba:justify-center">
              <p className="gba:text-sm gba:opacity-80 gba:mb-2">{t('total-score')}</p>
              {isLoading ? (
                <Skeleton className="gba:h-12 gba:w-32" />
              ) : (
                <p className="gba:text-5xl gba:font-bold">{engagementData.totalScore}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Activity Metrics */}
        {isLoading ? (
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:gap-4 gba:mb-8">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={`activity-skeleton-${i}`} className="gba:p-6">
                <Skeleton className="gba:h-8 gba:w-8 gba:mb-4" />
                <Skeleton className="gba:h-6 gba:w-24 gba:mb-2" />
                <Skeleton className="gba:h-8 gba:w-16" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:gap-4 gba:mb-8">
            {/* Row 1: Articles Created, Questions Asked, Documents Uploaded */}
            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-primary/10 gba:rounded-lg">
                  <Eye className="gba:w-6 gba:h-6 gba:text-primary" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('articles-created')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.articlesCreated}</p>
            </Card>

            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-warning/10 gba:rounded-lg">
                  <HelpCircle className="gba:w-6 gba:h-6 gba:text-warning" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('questions-asked')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.questionsAsked}</p>
            </Card>

            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-info/10 gba:rounded-lg">
                  <Upload className="gba:w-6 gba:h-6 gba:text-info" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('documents-uploaded')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.documentsUploaded}</p>
            </Card>

            {/* Row 2: Comments Made, Answers Given, Reactions Given */}
            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-success/10 gba:rounded-lg">
                  <MessageCircle className="gba:w-6 gba:h-6 gba:text-success" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('comments-made')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.commentsMade}</p>
            </Card>

            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-info/10 gba:rounded-lg">
                  <Target className="gba:w-6 gba:h-6 gba:text-info" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('answers-given')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.answersGiven}</p>
            </Card>

            <Card className="gba:p-6">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
                <div className="gba:p-2 gba:bg-destructive/10 gba:rounded-lg">
                  <Heart className="gba:w-6 gba:h-6 gba:text-destructive" />
                </div>
                <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('reactions-given')}</h3>
              </div>
              <p className="gba:text-3xl gba:font-bold">{engagementData.reactionsGiven}</p>
            </Card>
          </div>
        )}

        {/* Achievement Levels */}
        <Card className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-6">
            <Trophy className="gba:w-5 gba:h-5 gba:text-warning" />
            <h2 className="gba:text-2xl gba:font-bold">{t('achievement-levels')}</h2>
          </div>

          <div className="gba:space-y-3">
            {ACHIEVEMENT_LEVELS.map(level => {
              const isAchieved = engagementData.totalScore >= level.points
              const isCurrent = level.name === currentLevel.name
              const isLocked = !isAchieved

              return (
                <div
                  key={level.name}
                  className={(() => {
                    const baseClasses =
                      'gba:flex gba:items-center gba:justify-between gba:p-4 gba:rounded-lg gba:border gba:transition-colors'
                    if (isCurrent) return `${baseClasses} gba:bg-success/10 gba:border-success`
                    if (isAchieved) return `${baseClasses} gba:bg-muted/50 gba:border-border`
                    return `${baseClasses} gba:bg-muted/20 gba:border-border gba:opacity-60`
                  })()}
                  data-testid={`achievement-level-${level.name.toLowerCase()}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div
                      className={`gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full ${
                        isLocked ? 'gba:bg-muted gba:text-muted-foreground' : level.circleColor
                      }`}
                    >
                      <Trophy
                        className={`gba:w-6 gba:h-6 ${isLocked ? 'gba:text-muted-foreground' : level.iconColor}`}
                      />
                    </div>
                    <div>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-semibold">{level.name}</span>
                        {isCurrent && (
                          <Badge variant="default" className="gba:text-xs">
                            {t('current')}
                          </Badge>
                        )}
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground">
                        {level.points}+ {t('points')}
                      </p>
                    </div>
                  </div>
                  {isAchieved && (
                    <div className="gba:text-success">
                      <svg className="gba:w-6 gba:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default EngagementView
