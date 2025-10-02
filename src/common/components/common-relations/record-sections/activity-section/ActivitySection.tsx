import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Spinner, TimelineLayout, Button, Alert } from '@newwork/nw-design-system';
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon, PlusIcon, DotsThreeVertical } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { AppAction } from '@/components/app-action';
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface ActivitySectionProps extends BusinessAppContextProps {
  activities?: any[];
  activitiesLoading?: boolean;
  activitiesError?: string | null;
  onReloadActivities?: () => void;
  activitySectionActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
  activityEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
  className?: string;
  alignment?: 'left' | 'right';
}

// Standard React component that can be used with SectionWrapper
const ActivitySection: React.FC<ActivitySectionProps> = (props) => {
  const { 
    accessToken,
    activities: rawActivities = [],
    activitiesLoading = false,
    activitiesError = null,
    onReloadActivities,
    activityEntityActionProps,
    className,
    alignment = 'left'
  } = props;

  // Process activities
  const processedActivities = useMemo(() => {
    if (!rawActivities || rawActivities.length === 0) return [];
    
    return rawActivities.map((activity: any) => ({
      id: activity.id,
      title: activity.title || 'Untitled Activity',
      description: activity.description || '',
      occurredAt: activity.occurredAt || activity.createdAt,
      createdAt: activity.createdAt,
      ownerEmployee: activity.ownerEmployee,
      createdBy: activity.createdBy,
      activityType: activity.activityType
    }));
  }, [rawActivities]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType?.toLowerCase()) {
      case 'call':
        return (props: any) => <PhoneIcon weight="bold" {...props} />;
      case 'email':
        return (props: any) => <EnvelopeIcon weight="bold" {...props} />;
      case 'meeting':
        return (props: any) => <CalendarBlankIcon weight="bold" {...props} />;
      default:
        return (props: any) => <UserIcon weight="bold" {...props} />;
    }
  };

  const getActivityTypeLabel = (activityType: any) => activityType?.value || 'Activity';
  const getOwnerName = (ownerEmployee: any) => {
    if (!ownerEmployee) return 'Unknown';
    
    // Use firstName + lastName first
    const fullName = `${ownerEmployee.firstName || ''} ${ownerEmployee.lastName || ''}`.trim();
    if (fullName) return fullName;
    
    // Fallback to displayName
    return ownerEmployee.displayName || 'Unknown';
  };

  const handleEmployeeClick = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId }));
  };


  return (
    <div data-testid="activity-section-new-content" className={className}>
      {activitiesLoading ? (
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      ) : activitiesError ? (
        <Alert variant="destructive" data-testid="activity-error-alert">
          <div>
            <strong>{getTranslationFromI18nKeyAndLabel('crm.activities.errorTitle', 'Error loading activities')}</strong>
            <div>{activitiesError}</div>
            {onReloadActivities && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onReloadActivities}
                data-testid="activity-retry-button"
              >
                {getTranslationFromI18nKeyAndLabel('crm.common.retry', 'Retry')}
              </Button>
            )}
          </div>
        </Alert>
      ) : processedActivities.length === 0 ? (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
          No activities yet. Create your first activity.
        </div>
      ) : (
        <TimelineLayout 
          items={processedActivities.map((activity: any) => {
            const activityTypeLabel = getActivityTypeLabel(activity.activityType);
            const ownerName = getOwnerName(activity.ownerEmployee);
            const description = activity.description;
            
            const activityActions = activityEntityActionProps ? (
              <AppActionMenu
                accessToken={accessToken}
                contextsArray={activityEntityActionProps.contextsArray}
                externalContextData={{ 
                  ...activityEntityActionProps.externalContextData, 
                  activityId: activity.id,
                  activityType: activity.activityType?.value
                }}
                prefixDataTestId={`${activityEntityActionProps.prefixDataTestId}-${activity.id}`}
                emptyStateBehavior={activityEntityActionProps.emptyStateBehavior}
              >
                <div 
                  className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-muted gba:transition-colors"
                  data-testid={`activity-menu-${activity.id}`}
                >
                  <DotsThreeVertical size={16} />
                </div>
              </AppActionMenu>
            ) : null;

            return {
              id: activity.id,
              date: dayjs(activity.occurredAt).format('MMM D, YYYY h:mm A'),
              actor: activity.ownerEmployee ? (
                <a
                  href={buildPlatformUrl('/platform/hr/core/employees/employee-record', { employeeId: activity.ownerEmployee.id })}
                  onClick={(e) => {
                    e.preventDefault();
                    handleEmployeeClick(activity.ownerEmployee.id);
                  }}
                  className="gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
                >
                  {ownerName}
                </a>
              ) : undefined,
              title: (
                <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                  <span className="gba:flex-1 gba:truncate">{activity.title}</span>
                  {activityActions}
                </div>
              ),
              description: description,
              icon: getActivityIcon(activityTypeLabel),
            } as any;
          })}
          variant="default"
          orientation="vertical"
          alignment={alignment}
          className="gba:w-full" 
        />
      )}
    </div>
  );
};

// Static properties for SectionWrapper
(ActivitySection as any).sectionTitle = 'Activities';
(ActivitySection as any).sectionActions = (props: ActivitySectionProps) => {
  const { accessToken, activitySectionActionProps } = props;
  
  if (!activitySectionActionProps) {
    return null;
  }

  return (
    <AppAction
      accessToken={accessToken}
      contextsArray={activitySectionActionProps.contextsArray}
      externalContextData={activitySectionActionProps.externalContextData}
      prefixDataTestId={activitySectionActionProps.prefixDataTestId}
      emptyStateBehavior={activitySectionActionProps.emptyStateBehavior}
    >
      <Button data-testid="add-activity-button" variant="secondary" size="icon">
        <PlusIcon />
      </Button>
    </AppAction>
  );
};

export default ActivitySection;