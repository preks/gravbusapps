import React from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'

interface NavigationDisplayProps {
  data: {
    url: string
    description: string
    reason: string
  }
}

export const NavigationDisplay: React.FC<NavigationDisplayProps> = ({ data }) => {
  const handleNavigate = () => {
    navigateTo(data.url)
  }

  const destinationName = data.description?.trim() || 'Destination'

  return (
    <div className="gba:w-full gba:max-w-md gba:overflow-hidden">
      <Card className="gba:border-2 gba:border-ai/50 gba:shadow-xl gba:my-1 gba:bg-gradient-to-br gba:from-card gba:to-ai/5 gba:w-full">
        <CardContent className="gba:py-1 gba:px-2 gba:overflow-hidden">
          <div className="gba:flex gba:items-start gba:gap-2">
            <div className="gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:bg-gradient-to-br gba:from-ai-secondary/20 gba:to-ai/20 gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-ai/30">
              <svg className="gba:h-4 gba:w-4 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
              <div className="gba:leading-tight">
                <span className="gba:text-xs gba:font-semibold gba:text-ai">Navigate:</span>
              </div>
              <div className="gba:leading-tight">
                <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{data.description}</span>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-tight">{data.reason}</p>
            </div>
            <Button
              onClick={handleNavigate}
              aria-label={`Open ${destinationName}`}
              size="sm"
              className="gba:flex-shrink-0 gba:px-3 gba:py-1 gba:rounded-lg gba:bg-gradient-to-r gba:from-ai-secondary gba:to-ai gba:text-ai-foreground gba:font-semibold gba:shadow-md hover:gba:shadow-lg gba:transition-all"
            >
              <svg className="gba:h-4 gba:w-4 gba:flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NavigationDisplay
