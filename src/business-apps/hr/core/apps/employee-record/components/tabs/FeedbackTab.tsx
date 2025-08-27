'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData';
import { Card, Avatar } from '@newwork/gravity-ui-catalog';
import { Empty, Spin } from 'antd';
import { Button } from '@newwork/nw-design-system';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { employeeFeedbackQuery } from '../../queries/feedbackQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext';
import { RequestFeedbackModal } from '@/business-apps/crm/common/forms/feedback-form/components';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface FeedbackTabProps {
  employee: Employee;
  accessToken: string;
  employeeId?: string; // Optional employeeId override for permissions check
  userInfo?: UserInfoProps; // Current user info for self-view check
  employeeFeedback?: EmployeeFeedback[];
  isSelfView: boolean; // Whether user is viewing their own profile
  businessAppContext: BusinessAppContextProps; // Add business app context
}

// Extended interfaces to include properties used in the drawer
interface FormattedFeedback {
  sender: string;
  date: string;
  content: string;
  avatar?: string | null;
  senderId?: string;
  firstName: string;
  lastName: string;
}

/**
 * Feedback Tab Component
 * Displays feedback for the employee
 */
const FeedbackTab: React.FC<FeedbackTabProps> = ({ 
  employee,
  accessToken,
  // employeeId and userInfo are kept in interface for future use
  employeeFeedback = [],
  isSelfView,
  businessAppContext
}) => {
  // employeeId and userInfo props are available in the interface
  // isSelfView can be used for conditional rendering
  const [localFeedback, setLocalFeedback] = useState<EmployeeFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  
  // No longer need drawer state
  
  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Fetch feedback data
  const fetchFeedbackData = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await graphQLClient.request(
        employeeFeedbackQuery,
        { employeeId: employee.id }
      );
      
      if (response) {
        setLocalFeedback(response.EmployeeFeedback || []);
      }
    } catch (err) {
      console.error('Error fetching feedback data:', err);
      setError('Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Initialize with props if available, otherwise fetch from API
    if (employeeFeedback?.length) {
      setLocalFeedback(employeeFeedback);
    } else {
      fetchFeedbackData();
    }
  }, [employee?.id, accessToken]);

  // Format feedback for display
  const formatFeedback = (): FormattedFeedback[] => {
    if (!localFeedback?.length) return [];
    
    return localFeedback.map(feedback => {
      const sender = `${feedback.senderEmployee?.firstName || ''} ${feedback.senderEmployee?.lastName || ''}`.trim();
      const date = feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMMM D, YYYY') : 'Unknown date';
      const content = feedback.feedback || 'No feedback content';
      
      // Access pictureThumbnail through the correct path based on the GraphQL query structure
      const avatar = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail || null;
      const firstName = feedback.senderEmployee?.firstName || '';
      const lastName = feedback.senderEmployee?.lastName || '';
      
      return {
        sender,
        date,
        content,
        avatar,
        senderId: feedback.senderEmployeeId,
        firstName,
        lastName
      };
    });
  };
  
  const formattedFeedback = formatFeedback();

  // Handle loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="feedback-loading">
        <Spin size="large" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:text-center gba:text-red-600 gba:py-8" data-testid="feedback-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="gba:feedback-tab gba:space-y-8" data-testid="feedback-tab-container">
      {/* Feedback Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="feedback-header">
        <div className="gba:feedback-header">
          <div
            className="gba:font-bold gba:text-2xl"
            data-testid="feedback-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_performance.feedback",
              "Feedback"
            )}
          </div>
          <div
            className="gba:text-gray-500 gba:text-lg"
            data-testid="feedback-description"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_performance.feedback_description",
              "View and manage employee feedback"
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="gba:flex gba:gap-2">
          {/* Give Feedback Button */}
          <div>
            <AppActionButton 
              data-testid="employee-feedback-give-button"
              contextsArray={[FlowContextName.employeeGiveFeedback]}
              externalContextData={{
                employeeId: employee?.id
              }}
              prefixDataTestId="employee-feedback-give"
              accessToken={accessToken}
              autoExecuteSingleAction={true}
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_performance.give_feedback",
                "Give Feedback"
              )}
            </AppActionButton>
          </div>
          
          {/* Request Feedback Button - only visible when viewing own profile */}
          {isSelfView && (
            <div>
              <Button
                variant="outline"
                onClick={() => setIsRequestModalOpen(true)}
                data-testid="employee-feedback-request-button"
              >
                {getTranslationFromI18nKeyAndLabel(
                  "lowcoder:hr_performance.request_feedback",
                  "Request Feedback"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Request Feedback Modal */}
      <RequestFeedbackModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        businessAppContext={businessAppContext}
      />
      
      {/* Feedback Content */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
        <section className="gba:flex gba:flex-col gba:gap-4">
          {!formattedFeedback.length ? (
            <Empty 
              description="No feedback available" 
              className="gba:py-10" 
              data-testid="empty-feedback-state"
            />
          ) : (
            <div className="gba:grid gba:grid-cols-1 gba:gap-3">
              {formattedFeedback.map((feedback) => {
                // TypeScript safety - this should never happen due to our filter(Boolean) above
                if (!feedback) return null;
                
                return (
                  <Card 
                    key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} 
                    className="gba:p-4 gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
                    data-testid={`feedback-card-${feedback.senderId}`}
                  >
                    <div className="gba:flex gba:items-start">
                      <div className="gba:shrink-0 gba:mr-4">
                        <div className="gba:w-10 gba:h-10" data-testid="feedback-avatar-container">
                          <Avatar
                            src={feedback.avatar ? `data:image/gif;base64,${feedback.avatar}` : undefined}
                            initials={`${feedback.firstName?.[0] || ''}${feedback.lastName?.[0] || ''}`}
                            alt={`${feedback.firstName} ${feedback.lastName}`}
                            // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                            contentType={feedback.avatar ? 'image' : 'initials'}
                            // @ts-ignore - Type issue in gravity-ui-catalog for size
                            size="lg"
                            // @ts-ignore - Type issue in gravity-ui-catalog for shape
                            shape="circle"
                            // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                            appearance="gradient"
                          />
                        </div>
                      </div>
                      <div className="gba:grow">
                        <div className="gba:flex gba:justify-between gba:items-start">
                          <h4 className="gba:font-medium">{feedback.sender}</h4>
                          <span className="gba:text-sm gba:text-gray-500">{feedback.date}</span>
                        </div>
                        <p className="gba:mt-1 gba:text-gray-700">{feedback.content}</p>
                      </div>
                    </div>

                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
      
      {/* Removed drawer */}
    </div>
  );
};

export default FeedbackTab;
