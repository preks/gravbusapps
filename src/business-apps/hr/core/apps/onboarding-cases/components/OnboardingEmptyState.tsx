/**
 * Onboarding Empty State
 *
 * Custom empty state component for the onboarding dashboard.
 * Shows when there are no onboarding cases to display.
 */

import React from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { UserPlus, Users, FileText } from 'lucide-react'
import { OnboardingEmptyStateProps } from '../types'

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({ view, onCreateCase }) => {
  return (
    <Card className="gba:border-dashed">
      <CardContent className="gba:py-12">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:max-w-md gba:mx-auto">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:mb-6">
            <Users className="gba:h-8 gba:w-8 gba:text-primary" />
          </div>

          <h3 className="gba:text-xl gba:font-semibold gba:mb-2">No Onboarding Cases Yet</h3>
          <p className="gba:text-muted-foreground gba:mb-6">
            {view === 'dashboard'
              ? 'Start your first employee onboarding to manage the entire process from pre-arrival to completion.'
              : 'No onboarding cases found. Create a new case to begin the onboarding process for a new employee.'}
          </p>

          <div className="gba:flex gba:flex-col gba:gap-3 gba:w-full gba:max-w-xs">
            <Button onClick={onCreateCase} className="gba:w-full">
              <UserPlus className="gba:mr-2 gba:h-4 gba:w-4" />
              Start New Onboarding
            </Button>

            <Button variant="outline" className="gba:w-full" asChild>
              <a href="#" className="gba:flex gba:items-center gba:justify-center">
                <FileText className="gba:mr-2 gba:h-4 gba:w-4" />
                View Onboarding Guide
              </a>
            </Button>
          </div>

          <div className="gba:mt-8 gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">1</div>
              <div className="gba:text-xs gba:text-muted-foreground">Create Case</div>
            </div>
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">2</div>
              <div className="gba:text-xs gba:text-muted-foreground">Assign Flows</div>
            </div>
            <div>
              <div className="gba:text-2xl gba:font-bold gba:text-primary">3</div>
              <div className="gba:text-xs gba:text-muted-foreground">Track Progress</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OnboardingEmptyState
