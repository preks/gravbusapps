import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ReminderConfig } from '../general-config/ReminderConfig'
import { EscalationConfig } from '../general-config/EscalationConfig'

/**
 * Notifications and escalation section for the flow template
 */
export const NotificationsSection: React.FC = () => {
  return (
    <div className="gba:space-y-6" data-testid="notifications-section">
      {/* Reminders Card */}
      <Card className="gba:shadow-sm" data-testid="reminders-card">
        <CardHeader>
          <CardTitle className="gba:text-lg">
            {getTranslationFromI18nKeyAndLabel('flow.creator.reminderSettings', 'Reminder Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <ReminderConfig />
        </CardContent>
      </Card>

      {/* Escalation Card */}
      <Card className="gba:shadow-sm" data-testid="escalation-card">
        <CardHeader>
          <CardTitle className="gba:text-lg">
            {getTranslationFromI18nKeyAndLabel('flow.creator.escalationSettings', 'Escalation Settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <EscalationConfig />
        </CardContent>
      </Card>
    </div>
  )
}
