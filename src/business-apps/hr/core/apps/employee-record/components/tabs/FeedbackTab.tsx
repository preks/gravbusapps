'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData';
import { Card, Button } from '@newwork/gravity-ui-catalog';
import { Empty, Spin, Drawer } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { employeeFeedbackQuery } from '../../queries/feedbackQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { CloseOutlined } from '@ant-design/icons';

interface FeedbackTabProps {
  employee: Employee;
  accessToken: string;
  employeeFeedback?: EmployeeFeedback[];
}

// Extended interfaces to include properties used in the drawer
interface FormattedFeedback {
  sender: string;
  date: string;
  content: string;
  avatar?: string | null;
  senderId?: string;
}

/**
 * Feedback Tab Component
 * Displays feedback for the employee
 */
const FeedbackTab: React.FC<FeedbackTabProps> = ({ 
  employee,
  accessToken,
  employeeFeedback = []
}) => {
  const [localFeedback, setLocalFeedback] = useState<EmployeeFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FormattedFeedback | null>(null);
  const [drawerWidth] = useState<number>(600);
  
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
      const avatar = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail || null;
      
      return {
        sender,
        date,
        content,
        avatar,
        senderId: feedback.senderEmployeeId
      };
    });
  };

  const startProcessGiveFeedback = () => {
    startProcess({
      domain: 'employee',
      processName: 'giveFeedback',
      payload: {
        employeeId: employee?.id
      }
    });
  };
  
  // Function to open the drawer for feedback
  const openFeedbackDetails = (feedback: FormattedFeedback) => {
    setSelectedFeedback(feedback);
    setIsDrawerOpen(true);
  };

  // Function to close the drawer
  const closeDrawer = () => {
    setIsDrawerOpen(false);
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
        
        {/* Give Feedback Button */}
        <div>
          <AppActionButton 
            onClick={startProcessGiveFeedback}
            data-testid="add-feedback-button"
            variant="primary"
            contextsArray={[FlowContextName.employeeEntity]}
            externalContextData={{
              employeeId: employee?.id
            }}
            prefixDataTestId="add-feedback"
            accessToken={accessToken}
          >
            Give Feedback
          </AppActionButton>
        </div>
      </div>
      
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
            <div className="gba:space-y-4">
              {formattedFeedback.map((feedback) => {
                // TypeScript safety - this should never happen due to our filter(Boolean) above
                if (!feedback) return null;
                
                return (
                  <Card 
                    key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} 
                    className="gba:p-4 gba:cursor-pointer gba:hover:shadow-md gba:transition-all"
                    onClick={() => openFeedbackDetails(feedback)}
                    data-testid={`feedback-card-${feedback.senderId}`}
                  >
                    <div className="gba:flex gba:items-start">
                      <div className="gba:shrink-0 gba:mr-4">
                        <div className="gba:w-10 gba:h-10 gba:rounded-full gba:overflow-hidden gba:bg-gray-200">
                          {feedback.avatar && (
                            <img 
                              src={feedback.avatar} 
                              alt={feedback.sender}
                              className="gba:w-full gba:h-full gba:object-cover"
                            />
                          )}
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
      
      {/* Details Drawer */}
      <Drawer
        title={
          <div className="gba:flex gba:justify-between gba:items-center">
            <span>Feedback Details</span>
            <Button
              onClick={closeDrawer}
              variant="text"
              icon={<CloseOutlined />}
              data-testid="close-drawer-button"
            />
          </div>
        }
        placement="right"
        closable={false}
        onClose={closeDrawer}
        open={isDrawerOpen}
        width={drawerWidth}
        className="gba:feedback-details-drawer"
        data-testid="feedback-details-drawer"
      >
        {selectedFeedback && (
          <div className="gba:feedback-details gba:space-y-6" data-testid="feedback-details">
            <div className="gba:bg-white gba:p-6 gba:rounded-md gba:shadow-sm">
              <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
                <div className="gba:w-12 gba:h-12 gba:rounded-full gba:overflow-hidden gba:bg-gray-200">
                  {selectedFeedback.avatar && (
                    <img 
                      src={selectedFeedback.avatar} 
                      alt={selectedFeedback.sender}
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="gba:text-lg gba:font-medium">{selectedFeedback.sender}</h3>
                  <p className="gba:text-sm gba:text-gray-500">{selectedFeedback.date}</p>
                </div>
              </div>
              
              <div className="gba:feedback-content gba:bg-gray-50 gba:p-4 gba:rounded-md gba:border gba:border-gray-100">
                <p className="gba:text-gray-700">{selectedFeedback.content}</p>
              </div>
            </div>
            
            <div className="gba:feedback-actions gba:flex gba:justify-end gba:gap-4">
              <AppActionButton
                variant="secondary"
                data-testid="reply-feedback-button"
                contextsArray={[FlowContextName.employeeEntity]}
                externalContextData={{
                  employeeId: employee?.id,
                  senderId: selectedFeedback.senderId
                }}
                prefixDataTestId="reply-feedback"
                accessToken={accessToken}
              >
                Reply
              </AppActionButton>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default FeedbackTab;
