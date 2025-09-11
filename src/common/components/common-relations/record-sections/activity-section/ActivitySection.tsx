import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button, Alert, Spinner, TimelineLayout } from '@newwork/nw-design-system';
import { PlusCircleOutlined } from '@ant-design/icons';
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { AppAction } from '@/components/app-action';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
interface ActivitySectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  defaultTab?: 'activities' | 'notes' | 'approvals' | 'documents' | 'ai-summary';
  'data-testid'?: string;
  activities?: any[];
  activitiesLoading?: boolean;
  activitiesError?: string | null;
  onReloadActivities?: () => void;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ defaultTab = 'activities', ...context }) => {
  const activities = (context as any).activities || [];
  const activitiesLoading = (context as any).activitiesLoading || false;
  const activitiesError = (context as any).activitiesError || null;
  // approvals handled in dedicated approval-section; kept here for future integration if needed

  const entity = useMemo(() => ({
    accountId: (context as any).accountId,
    contactId: (context as any).contactId,
    opportunityId: (context as any).opportunityId,
    leadId: (context as any).leadId,
  }), [context]);

  const loadActivities = () => (context as any).onReloadActivities?.();
  // no approvals/notes here – they live in their own sections

  const getEmployeeDisplayNameFromObject = (emp: any) => emp?.displayName || (emp?.firstName && emp?.lastName ? `${emp.firstName} ${emp.lastName}` : 'Unknown User');

  return (
    <div data-testid={context['data-testid'] || 'activity-section'}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--nw-spacing-xl) var(--nw-spacing-xl) var(--nw-spacing-md) var(--nw-spacing-xl)'
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 500 }}>Activities</div>
        <AppAction
          accessToken={context.accessToken}
          contextsArray={[FlowContextName.investmentActivityEntity]}
          externalContextData={{ ...entity }}
          prefixDataTestId="activities"
          emptyStateBehavior="enable"
        >
          <Button data-testid="add-activity-button">
            <span className="gba:flex gba:items-center gba:gap-2"><PlusCircleOutlined /> Add Activity</span>
          </Button>
        </AppAction>
      </div>

      {/* Content */}
      <div style={{ padding: '0 var(--nw-spacing-xl) var(--nw-spacing-xl)' }}>
        {activitiesLoading && (
          <div style={{ textAlign: 'center', padding: 'var(--nw-spacing-2xl) 0' }}><Spinner /></div>
        )}
        {activitiesError && (
          <Alert variant="destructive" className="gba:mb-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>Error Loading Activities: {activitiesError}</span>
              <Button onClick={loadActivities} variant="outline" size="sm">Retry</Button>
            </div>
          </Alert>
        )}
        {!activitiesLoading && !activitiesError && activities.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--nw-spacing-2xl) 0', color: 'var(--nw-color-text-secondary)' }} data-testid="empty-activities">
            No activities yet. Start by adding your first activity.
          </div>
        )}
        {!activitiesLoading && !activitiesError && activities.length > 0 && (() => {
          const items = activities.map((activity: any, index: number) => {
            const title = activity.title || 'New Activity';
            const dateSource = activity.occurredAt || activity.createdAt;
            const occurred = dayjs(dateSource).isValid() ? dayjs(dateSource).format('MMM D, YYYY [at] h:mm A') : '';
            const ownerName = activity.ownerEmployee ? getEmployeeDisplayNameFromObject(activity.ownerEmployee) : (activity.createdBy || 'Unknown User');
            const ownerId = activity.ownerEmployee?.id;
            const activityTypeLabel = activity.activityType?.value || activity.activityType;
            const description = [activityTypeLabel, activity.description].filter(Boolean).join('\n');
            
            // Determine icon based on activity type
            const getActivityIcon = (type: string) => {
              const lowerType = type?.toLowerCase() || '';
              if (lowerType.includes('call') || lowerType.includes('phone')) return PhoneIcon;
              if (lowerType.includes('email') || lowerType.includes('mail')) return EnvelopeIcon;
              if (lowerType.includes('meeting') || lowerType.includes('appointment')) return CalendarBlankIcon;
              return UserIcon; // Default icon
            };
            
            return {
              id: index,
              date: occurred,
              title: title,
              actor: ownerName
                ? ownerId
                  ? (
                      <a
                        href={buildPlatformUrl('/platform/employee-record', { employeeId: ownerId })}
                        className="gba:underline gba:text-inherit hover:gba:text-primary"
                        data-testid={`activity-owner-link-${ownerId}`}
                      >
                        {ownerName}
                      </a>
                    )
                  : ownerName
                : undefined,
              description,
              icon: getActivityIcon(activityTypeLabel),
            } as any;
          });
          return (
            <TimelineLayout 
              items={items}
              variant="default"
              orientation="vertical"
              className="gba:w-full" 
            />
          );
        })()}
      </div>
    </div>
  );
};

export default ActivitySection;


