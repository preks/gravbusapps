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
  const buttonLabel = destinationName.length > 36 ? 'Open Destination' : `Go to ${destinationName}`

  return (
    <div className="gba:w-full gba:max-w-full gba:overflow-hidden">
      <Card className="gba:border-2 gba:border-ai/50 gba:shadow-xl gba:my-3 gba:bg-gradient-to-br gba:from-card gba:to-ai/5 gba:w-full gba:max-w-full">
        <CardContent className="gba:p-6 gba:max-w-full gba:overflow-hidden">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:flex-shrink-0 gba:h-16 gba:w-16 gba:rounded-2xl gba:bg-gradient-to-br gba:from-ai-secondary/20 gba:to-ai/20 gba:flex gba:items-center gba:justify-center gba:border-2 gba:border-ai/30">
              <svg className="gba:h-8 gba:w-8 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
              <p className="gba:text-sm gba:font-semibold gba:text-ai gba:mb-1">Navigate to Page</p>
              <h4 className="gba:text-lg gba:font-bold gba:text-foreground gba:mb-2 gba:break-words">
                {data.description}
              </h4>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-4 gba:break-words">{data.reason}</p>

              <Button
                onClick={handleNavigate}
                aria-label={`Open ${destinationName}`}
                className="gba:flex gba:items-center gba:gap-2 gba:px-6 gba:py-3 gba:rounded-xl gba:bg-gradient-to-r gba:from-ai-secondary gba:to-ai gba:text-ai-foreground gba:font-bold gba:shadow-lg hover:gba:shadow-xl gba:transition-all gba:w-full gba:max-w-full"
              >
                <svg
                  className="gba:h-5 gba:w-5 gba:flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className="gba:truncate">{buttonLabel}</span>
              </Button>

              <p className="gba:text-xs gba:text-muted-foreground gba:mt-3 gba:italic gba:break-all">{data.url}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NavigationDisplay
