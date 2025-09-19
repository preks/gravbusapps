import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Button, Alert, Spinner, TimelineLayout, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardHeader, CardContent, CardTitle } from '@newwork/nw-design-system';
import { PhoneIcon, EnvelopeIcon, CalendarBlankIcon, UserIcon, PlusCircleIcon } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { AppAction } from '@/components/app-action';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { LANGUAGES, Language, translateMultipleTexts } from './translationService';
interface TranslatedActivity {
  id: string;
  title: string;
  description: string;
  translatedTitle?: string;
  translatedDescription?: string;
  isTranslating?: boolean;
  occurredAt: string;
  createdAt: string;
  ownerEmployee?: any;
  createdBy?: string;
  activityType?: any;
}

interface ActivitySectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  investmentId?: string;
  defaultTab?: 'activities' | 'notes' | 'approvals' | 'documents' | 'ai-summary';
  'data-testid'?: string;
  className?: string;
  activities?: any[];
  activitiesLoading?: boolean;
  activitiesError?: string | null;
  onReloadActivities?: () => void;
  // Make AppAction configurable
  contextsArray: FlowContextName[];
  externalContextData?: Record<string, any>;
  prefixDataTestId?: string;
  // Translation features
  showTranslation?: boolean;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ defaultTab = 'activities', showTranslation = false, className, ...context }) => {
  const rawActivities = (context as any).activities || [];
  const activitiesLoading = (context as any).activitiesLoading || false;
  const activitiesError = (context as any).activitiesError || null;
  
  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const [translatedActivities, setTranslatedActivities] = useState<TranslatedActivity[]>([]);
  const originalActivitiesRef = useRef<any[]>([]);

  // Update original activities ref when raw activities change
  useEffect(() => {
    originalActivitiesRef.current = rawActivities;
    setTranslatedActivities(rawActivities);
  }, [rawActivities]);

  const entity = useMemo(() => ({
    accountId: (context as any).accountId,
    contactId: (context as any).contactId,
    opportunityId: (context as any).opportunityId,
    leadId: (context as any).leadId,
    investmentId: (context as any).investmentId,
  }), [context]);

  const loadActivities = () => (context as any).onReloadActivities?.();
  
  // Translation logic
  useEffect(() => {
    const translateActivities = async () => {
      const originalActivities = originalActivitiesRef.current;

      if (selectedLanguage === 'Original' || originalActivities.length === 0) {
        setTranslatedActivities(originalActivities);
        return;
      }

      setTranslating(true);

      try {
        const textsToTranslate: string[] = [];
        const activityMapping: Array<{ activityIndex: number, titleIndex: number, descriptionIndex: number }> = [];

        originalActivities.forEach((activity, activityIndex) => {
          const titleIndex = textsToTranslate.length;
          textsToTranslate.push(activity.title || '');

          const descriptionIndex = textsToTranslate.length;
          textsToTranslate.push(activity.description || '');

          activityMapping.push({ activityIndex, titleIndex, descriptionIndex });
        });

        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken);

        const translated: TranslatedActivity[] = originalActivities.map((originalActivity, activityIndex) => {
          const mapping = activityMapping[activityIndex];
          return {
            ...originalActivity,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedDescription: translatedTexts[mapping.descriptionIndex],
            isTranslating: false
          };
        });

        setTranslatedActivities(translated);
      } catch (err) {
        console.error('Translation error:', err);
        setTranslatedActivities(originalActivities);
      } finally {
        setTranslating(false);
      }
    };

    if (showTranslation) {
      translateActivities();
    }
  }, [selectedLanguage, context.accessToken, showTranslation]);

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };
  
  // no approvals/notes here – they live in their own sections
  const getEmployeeDisplayNameFromObject = (emp: any) => emp?.displayName || (emp?.firstName && emp?.lastName ? `${emp.firstName} ${emp.lastName}` : 'Unknown User');

  return (
    <Card data-testid={context['data-testid'] || 'activity-section'} className={className}>
      <CardHeader className="gba:flex gba:flex-row gba:items-start gba:justify-between gba:gap-4 gba:px-4">
        <div className="gba:flex gba:flex-col gba:gap-2 gba:min-w-0">
          <CardTitle>Activities</CardTitle>
          {showTranslation && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              <Select 
                value={selectedLanguage} 
                onValueChange={handleLanguageChange}
                data-testid="language-dropdown"
              >
                <SelectTrigger size="sm" >
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((language: Language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.flag} {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {translating && (
                <Spinner size="sm" />
              )}
            </div>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {showTranslation && (
            null
          )}
          <AppAction
            accessToken={context.accessToken}
            contextsArray={context.contextsArray}
            externalContextData={context.externalContextData || { ...entity }}
            prefixDataTestId={context.prefixDataTestId || "activities"}
          >
          <Button data-testid="add-activity-button" size="icon"><PlusCircleIcon /></Button>
          </AppAction>
        </div>
      </CardHeader>

      <CardContent>
        {activitiesLoading && (
          <div className="gba:text-center gba:py-8"><Spinner /></div>
        )}
        {activitiesError && (
          <Alert variant="destructive" className="gba:mb-4 gba:flex gba:items-center gba:justify-between">
            <span>Error Loading Activities: {activitiesError}</span>
            <Button onClick={loadActivities} variant="outline" size="sm">Retry</Button>
          </Alert>
        )}
        {!activitiesLoading && !activitiesError && translatedActivities.length === 0 && (
          <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid="empty-activities">
            No activities yet. Start by adding your first activity.
          </div>
        )}
        {!activitiesLoading && !activitiesError && translatedActivities.length > 0 && (() => {
          const items = translatedActivities.map((activity: TranslatedActivity, index: number) => {
            const title = (showTranslation && activity.translatedTitle) ? activity.translatedTitle : (activity.title || 'New Activity');
            const dateSource = activity.occurredAt || activity.createdAt;
            const occurred = dayjs(dateSource).isValid() ? dayjs(dateSource).format('MMM D, YYYY [at] h:mm A') : '';
            const ownerName = activity.ownerEmployee ? getEmployeeDisplayNameFromObject(activity.ownerEmployee) : (activity.createdBy || 'Unknown User');
            const ownerId = activity.ownerEmployee?.id;
            const activityTypeLabel = activity.activityType?.value || activity.activityType;
            const description = [
              activityTypeLabel, 
              (showTranslation && activity.translatedDescription) ? activity.translatedDescription : activity.description
            ].filter(Boolean).join('\n');
            
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
              alignment="right"
              className="gba:w-full" 
            />
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default ActivitySection;


