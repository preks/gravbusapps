'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Card, CardContent } from '@newwork/nw-design-system'
import { Calendar, Globe, Lock, MessageCircle } from 'lucide-react'
import { FormattedFeedback } from './types'
import { toAvatarSrc } from './avatar'

interface FeedbackCardsProps {
  feedbackList: FormattedFeedback[]
  privateBadgeLabel: string
  publicBadgeLabel: string
  showMoreLabel: string
  showLessLabel: string
}

const FeedbackCards: React.FC<FeedbackCardsProps> = ({
  feedbackList,
  privateBadgeLabel,
  publicBadgeLabel,
  showMoreLabel,
  showLessLabel
}) => {
  const [expandedByKey, setExpandedByKey] = React.useState<Record<string, boolean>>({})

  return (
    <div className="gba:space-y-4" data-testid="feedback-list">
      {feedbackList.map((feedback, index) => {
        const feedbackKey = `${feedback.id ?? feedback.senderId ?? feedback.sender}-${feedback.rawDate ?? feedback.date}-${index}`
        return (
          <Card key={feedbackKey} className="gba:h-full" data-testid={`feedback-card-${index}`}>
            <CardContent className="gba:p-4 gba:flex gba:flex-col gba:h-full">
              <div className="gba:flex gba:items-start gba:gap-4">
                <div className="gba:shrink-0 gba:mr-2" data-testid="feedback-avatar-container">
                  <Avatar className="gba:h-10 gba:w-10">
                    {toAvatarSrc(feedback.avatar) && (
                      <AvatarImage
                        src={toAvatarSrc(feedback.avatar)}
                        alt={`${feedback.firstName} ${feedback.lastName}`}
                      />
                    )}
                    <AvatarFallback>{`${feedback.firstName?.[0] ?? ''}${feedback.lastName?.[0] ?? ''}`}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="gba:flex-grow">
                  <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-2">
                    <span className="gba:font-semibold gba:text-foreground" data-testid={`feedback-sender-${index}`}>
                      {feedback.sender}
                    </span>
                    {feedback.type && (
                      <Badge variant="decorative" data-testid={`feedback-type-${index}`}>
                        <span className="gba:inline-flex gba:items-center gba:gap-1">
                          <MessageCircle className="gba:h-3 gba:w-3" />
                          {feedback.type}
                        </span>
                      </Badge>
                    )}
                    {feedback.private && (
                      <Badge variant="destructive" data-testid={`feedback-privacy-${index}`}>
                        <span className="gba:inline-flex gba:items-center gba:gap-1">
                          <Lock className="gba:h-3 gba:w-3" />
                          {privateBadgeLabel}
                        </span>
                      </Badge>
                    )}
                    {!feedback.private && (
                      <Badge variant="secondary" data-testid={`feedback-privacy-${index}`}>
                        <span className="gba:inline-flex gba:items-center gba:gap-1">
                          <Globe className="gba:h-3 gba:w-3" />
                          {publicBadgeLabel}
                        </span>
                      </Badge>
                    )}
                  </div>
                  <div
                    className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:text-sm gba:mt-1"
                    data-testid={`feedback-date-${index}`}
                  >
                    <Calendar className="gba:h-4 gba:w-4" /> {feedback.date}
                  </div>
                  {feedback.rating !== undefined && feedback.rating > 0 && (
                    <div className="gba:my-2 gba:flex gba:gap-0.5">
                      {[1, 2, 3, 4, 5].map(starValue => (
                        <span
                          key={`${feedbackKey}-star-${starValue}`}
                          className={`gba:text-lg ${starValue <= (feedback.rating ?? 0) ? 'gba:text-warning' : 'gba:text-muted-foreground'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`gba:mt-3 gba:text-muted-foreground gba:border-t gba:border-border gba:pt-3 ${
                      expandedByKey[feedbackKey] ? '' : 'gba:line-clamp-4'
                    }`}
                    data-testid={`feedback-content-${index}`}
                  >
                    {feedback.content}
                  </div>
                  {feedback.content && feedback.content.length > 180 && (
                    <button
                      type="button"
                      className="gba:mt-2 gba:text-xs gba:font-medium gba:text-primary hover:gba:underline"
                      onClick={() =>
                        setExpandedByKey(prev => ({
                          ...prev,
                          [feedbackKey]: !prev[feedbackKey]
                        }))
                      }
                    >
                      {expandedByKey[feedbackKey] ? showLessLabel : showMoreLabel}
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default FeedbackCards
