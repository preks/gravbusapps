import React from 'react'
import { Card, Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { ChevronRight } from 'lucide-react'

interface MemberDimensions {
  goalsProgress: number
  totalGoals: number
  skillsCoverage: number
  feedbackAvgRating: number | null
  feedbackCount: number
  evaluationScore: number | null
}

interface EnhancedMemberCardProps {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  dimensions: MemberDimensions
  onViewDetails: (employeeId: string) => void
  onNavigateToEmployee: (employeeId: string) => void
}

const MiniProgressBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="gba:flex-1">
    <div className="gba:flex gba:items-center gba:justify-between gba:mb-0.5">
      <span className="gba:text-[10px] gba:text-muted-foreground">{label}</span>
      <span className="gba:text-[10px] gba:font-medium">{value}%</span>
    </div>
    <div className="gba:h-1 gba:bg-muted gba:rounded-full gba:overflow-hidden">
      <div
        className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  </div>
)

const getBarColor = (value: number): string => {
  if (value >= 80) return 'gba:bg-success'
  if (value >= 60) return 'gba:bg-info'
  if (value >= 40) return 'gba:bg-warning'
  return 'gba:bg-destructive'
}

export const EnhancedMemberCard: React.FC<EnhancedMemberCardProps> = ({
  employeeId,
  firstName,
  lastName,
  pictureThumbnail,
  jobPositionName,
  dimensions,
  onViewDetails,
  onNavigateToEmployee
}) => {
  const feedbackNormalized =
    dimensions.feedbackAvgRating != null ? Math.round((dimensions.feedbackAvgRating / 5) * 100) : 0
  const evalNormalized = dimensions.evaluationScore != null ? Math.round((dimensions.evaluationScore / 5) * 100) : 0

  return (
    <Card
      className="gba:p-4 hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer"
      style={{ borderRadius: '12px' }}
      data-testid={`enhanced-member-card-${employeeId}`}
      onClick={() => onViewDetails(employeeId)}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        {/* Avatar + Info */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onNavigateToEmployee(employeeId)
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:p-0 gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:opacity-80 gba:shrink-0"
        >
          <Avatar className="gba:h-10 gba:w-10">
            <AvatarImage
              src={
                pictureThumbnail && !pictureThumbnail.startsWith('{')
                  ? `data:image/jpeg;base64,${pictureThumbnail}`
                  : undefined
              }
              alt={`${firstName} ${lastName}`}
            />
            <AvatarFallback>
              {firstName?.[0]}
              {lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="gba:text-left">
            <div className="gba:text-sm gba:font-medium">
              {firstName} {lastName}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">{jobPositionName || '-'}</div>
          </div>
        </button>

        {/* Progress Bars */}
        <div className="gba:flex-1 gba:grid gba:grid-cols-4 gba:gap-2 gba:min-w-0">
          <MiniProgressBar
            label="Goals"
            value={dimensions.goalsProgress}
            color={getBarColor(dimensions.goalsProgress)}
          />
          <MiniProgressBar
            label="Skills"
            value={dimensions.skillsCoverage}
            color={getBarColor(dimensions.skillsCoverage)}
          />
          <MiniProgressBar label="Feedback" value={feedbackNormalized} color={getBarColor(feedbackNormalized)} />
          <MiniProgressBar label="Evals" value={evalNormalized} color={getBarColor(evalNormalized)} />
        </div>

        {/* Chevron */}
        <ChevronRight size={16} className="gba:text-muted-foreground gba:shrink-0 gba:mt-2" />
      </div>

      {/* Summary badges */}
      <div className="gba:flex gba:gap-2 gba:mt-2.5 gba:ml-[52px] gba:flex-wrap">
        {dimensions.totalGoals === 0 && (
          <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
            No goals
          </Badge>
        )}
        {dimensions.feedbackCount === 0 && (
          <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
            No feedback
          </Badge>
        )}
        {dimensions.evaluationScore != null && (
          <Badge variant="info" className="gba:text-[10px] gba:px-1.5 gba:py-0">
            Eval: {dimensions.evaluationScore.toFixed(1)}
          </Badge>
        )}
      </div>
    </Card>
  )
}
