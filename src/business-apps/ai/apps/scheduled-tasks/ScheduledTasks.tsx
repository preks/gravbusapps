import React from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Calendar } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ScheduledTasksTable } from './components/ScheduledTasksTable'

const ScheduledTasks: React.FC<BusinessAppContextProps> = context => {
  return (
    <div data-testid="scheduled-tasks-app" className="gba:w-full">
      <PageLayout
        headerIcon={Calendar}
        headerTitle="Scheduled Tasks"
        headerDescription="Manage your recurring AI-powered tasks. Ask Every to schedule reports, summaries, or any data you need delivered automatically."
        variant="default"
        className="gba:min-h-screen"
      >
        <Card>
          <CardHeader>
            <CardTitle>Your Scheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduledTasksTable {...context} />
          </CardContent>
        </Card>

        <Card className="gba:mt-6">
          <CardHeader>
            <CardTitle>How to Create Scheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4 gba:text-sm gba:text-muted-foreground">
              <p>
                You can create scheduled tasks by talking to Every in the chat. Simply describe what you want and when
                you want it. Here are some examples:
              </p>
              <ul className="gba:list-disc gba:list-inside gba:space-y-2">
                <li>
                  <span className="gba:font-medium gba:text-foreground">
                    "Send me a list of all activities from my team every day at 10 AM"
                  </span>
                </li>
                <li>
                  <span className="gba:font-medium gba:text-foreground">
                    "Check for new leads and summarize them every hour"
                  </span>
                </li>
                <li>
                  <span className="gba:font-medium gba:text-foreground">
                    "Give me a weekly sales report every Monday at 9 AM"
                  </span>
                </li>
                <li>
                  <span className="gba:font-medium gba:text-foreground">
                    "Remind me about pending approvals every 30 minutes"
                  </span>
                </li>
                <li>
                  <span className="gba:font-medium gba:text-foreground">
                    "Show me my team's workload summary on weekdays at 8:00"
                  </span>
                </li>
              </ul>
              <p className="gba:mt-4">
                Once created, your scheduled tasks will run automatically and deliver results via EveryAI notifications.
                You can pause, resume, or delete tasks from this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    </div>
  )
}

export default ScheduledTasks
