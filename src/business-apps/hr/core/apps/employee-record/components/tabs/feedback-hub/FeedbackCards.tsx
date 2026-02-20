'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Card, CardContent } from '@newwork/nw-design-system'
import { Calendar } from 'lucide-react'
import { FormattedFeedback } from './types'
import { toAvatarSrc } from './avatar'

interface FeedbackCardsProps {
  feedbackList: FormattedFeedback[]
  privateBadgeLabel: string
  publicBadgeLabel: string
}

const FeedbackCards: React.FC<FeedbackCardsProps> = ({ feedbackList, privateBadgeLabel, publicBadgeLabel }) => {
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
                        {feedback.type}
                      </Badge>
                    )}
                    {feedback.private && (
                      <Badge variant="destructive" data-testid={`feedback-privacy-${index}`}>
                        {privateBadgeLabel}
                      </Badge>
                    )}
                    {!feedback.private && (
                      <Badge variant="secondary" data-testid={`feedback-privacy-${index}`}>
                        {publicBadgeLabel}
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
                    className="gba:mt-3 gba:text-muted-foreground gba:border-t gba:border-border gba:pt-3"
                    data-testid={`feedback-content-${index}`}
                  >
                    {feedback.content}
                  </div>
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
