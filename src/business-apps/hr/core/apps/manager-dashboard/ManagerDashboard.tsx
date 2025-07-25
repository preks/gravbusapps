'use client';

import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useUserAvatar } from './hooks/useUserAvatar';
import { useTeammates } from '@/common/hooks/useTeammates';
import { useTeamAbsences } from './hooks/useTeamAbsences';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Avatar
} from '@newwork/nw-design-system';
import {
  PiUser,
  PiUsers,
  PiCaretRight,
  PiCheckSquare,
  PiCheckCircle,
  PiFile as PiFileText
} from 'react-icons/pi';
import { ManagerAssistant } from './components/ManagerAssistant';

/**
 * Manager Dashboard
 * Displays a dashboard for managers with key metrics and insights
 */
export const ManagerDashboard: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const employeeId = userInfo?.employeeDetails?.employeeId;
//   const { teamMembers, loading: loadingTeam, error: teamError } = useTeamMembers({ 
//     accessToken: accessToken || '', 
//     employeeId: employeeId || '' 
//   });
  
  // Fetch user avatar from GraphQL
  const { avatar } = useUserAvatar({
    accessToken: accessToken || '',
    userId: userInfo?.id
  });
  
  // Fetch teammates (colleagues in the same team)
  const { teammates, loading: loadingTeammates, error: teammatesError } = useTeammates(
    employeeId || '',
    accessToken || ''
  );
  
  // Fetch absences for teammates that need approval
  const { absences: teamAbsences, loading: absencesLoading, error: absencesError, refetch: refetchAbsences } = useTeamAbsences({
    teammates,
    accessToken: accessToken || ''
  });
  
  const [processingAbsences, setProcessingAbsences] = useState<Record<string, boolean>>({});
  
  // Handle approve and decline actions for absences
  const handleApproveAbsence = async (absenceId: string) => {
    if (!accessToken || processingAbsences[absenceId]) return;
    
    setProcessingAbsences(prev => ({ ...prev, [absenceId]: true }));
    
    try {
      // Here you would call the API to approve the absence
      // For now, we'll just simulate success with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // On success, refetch absences to update the list
      refetchAbsences();
      
      // Show success notification (could be implemented with a toast library)
      console.log(`Absence ${absenceId} approved successfully`);
    } catch (error) {
      console.error(`Failed to approve absence ${absenceId}:`, error);
      // Show error notification
    } finally {
      setProcessingAbsences(prev => ({ ...prev, [absenceId]: false }));
    }
  };
  
  const handleDeclineAbsence = async (absenceId: string) => {
    if (!accessToken || processingAbsences[absenceId]) return;
    
    setProcessingAbsences(prev => ({ ...prev, [absenceId]: true }));
    
    try {
      // Here you would call the API to decline the absence
      // For now, we'll just simulate success with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // On success, refetch absences to update the list
      refetchAbsences();
      
      // Show success notification
      console.log(`Absence ${absenceId} declined successfully`);
    } catch (error) {
      console.error(`Failed to decline absence ${absenceId}:`, error);
      // Show error notification
    } finally {
      setProcessingAbsences(prev => ({ ...prev, [absenceId]: false }));
    }
  };

  // Define main content as a variable for PageLayout
  // Create the main content for the dashboard
  const mainContent = (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid="manager-dashboard-content">
      <div className="gba:mb-8" data-testid="manager-dashboard-welcome-section">
        <div className="gba:flex gba:items-center gba:mb-2">
          <div className="gba:mr-3" data-testid="manager-dashboard-user-avatar">
            <Avatar 
              className="gba:h-12 gba:w-12"
              data-testid="manager-dashboard-user-avatar-image"
            >
                <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full gba:bg-primary-100 gba:text-primary-700 gba:font-medium">
                  {`${userInfo?.employeeDetails?.firstName?.[0] || ''}${userInfo?.employeeDetails?.lastName?.[0] || ''}`.toUpperCase()}
                </div>
            </Avatar>
          </div>
          <div>
            <h1 className="gba:text-2xl gba:font-semibold" data-testid="manager-dashboard-welcome-title">Welcome, {userInfo?.employeeDetails?.firstName || 'Manager'}!</h1>
            <div className="gba:flex gba:items-center">
              <p className="gba:text-neutral-500 gba:mr-2">
                {userInfo?.employeeDetails?.organizationalUnit?.name || 'Department'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Card */}
      <ManagerAssistant />

      {/* Main Content Grid */}
      <div 
        className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6 gba:flex-1 gba:min-h-0" 
        style={{ maxHeight: '550px' }} 
        data-testid="manager-dashboard-cards-grid">
        {/* Teammates Card */}
        <Card data-testid="manager-dashboard-teammates-card" className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
            <CardTitle className="gba:text-lg gba:flex gba:items-center">
              <PiUsers className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              My Teammates
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gba:text-neutral-500 gba:hover:text-neutral-700"
              data-testid="manager-dashboard-teammates-view-all-button"
            >
              View All
              <PiCaretRight size={16} className="gba:ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            <div className="gba:space-y-4 gba:h-full gba:overflow-y-auto gba:pr-2">
              {loadingTeammates && (
                <div className="gba:flex gba:justify-center gba:py-4" data-testid="manager-dashboard-teammates-loading">
                  <div className="gba:flex gba:items-center gba:text-neutral-500">
                    <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading teammates...
                  </div>
                </div>
              )}
              
              {teammatesError && (
                <div className="gba:p-4 gba:text-center gba:text-destructive-600" data-testid="manager-dashboard-teammates-error">
                  Failed to load teammates
                </div>
              )}
              
              {!loadingTeammates && !teammatesError && teammates.length === 0 && (
                <div className="gba:p-4 gba:text-center gba:text-neutral-500" data-testid="manager-dashboard-no-teammates">
                  No teammates found
                </div>
              )}
              
              {!loadingTeammates && !teammatesError && teammates.length > 0 && (
                <div className="gba:h-full gba:overflow-y-auto gba:pr-1" data-testid="manager-dashboard-teammates-container">
                  {teammates.map((teammate: any) => (
                    <div key={teammate.id} className="gba:flex gba:items-center gba:justify-between gba:py-2" data-testid={`manager-dashboard-teammate-${teammate.id}`}>
                      <div className="gba:flex gba:items-center">
                        <div className="gba:mr-3">
                          <Avatar className="gba:h-10 gba:w-10" data-testid={`manager-dashboard-teammate-avatar-${teammate.id}`}>
                            <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full gba:bg-primary-100 gba:text-primary-700 gba:font-medium">
                              {`${teammate.firstName[0]}${teammate.lastName[0]}`.toUpperCase()}
                            </div>
                          </Avatar>
                        </div>
                        <div>
                          <div className="gba:font-medium" data-testid={`manager-dashboard-teammate-name-${teammate.id}`}>{teammate.fullName}</div>
                          <div className="gba:text-sm gba:text-neutral-500" data-testid={`manager-dashboard-teammate-title-${teammate.id}`}>
                            {teammate.jobTitle || teammate.jobPositionName || 'Teammate'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

           {/* Requests to Approve Card */}
           <Card data-testid="manager-dashboard-requests-card" className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
            <CardTitle className="gba:text-lg gba:flex gba:items-center">
              <PiFileText className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              Planned Team Absences
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gba:text-neutral-500 gba:hover:text-neutral-700"
              data-testid="manager-dashboard-requests-view-all-button"
            >
              View All
              <PiCaretRight size={16} className="gba:ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:px-2">
            {!absencesLoading && teamAbsences?.length > 0 ? (
              <div className="gba:space-y-3 gba:h-full gba:overflow-y-auto gba:pr-2">
                {teamAbsences.map(absence => (
                  <div 
                    key={absence.id}
                    className="gba:p-3 gba:border gba:border-neutral-200 gba:rounded-lg gba:hover:border-primary-300 gba:transition-colors"
                    data-testid={`manager-dashboard-approval-${absence.id}`}
                  >
                    <div className="gba:flex gba:items-start gba:justify-between">
                      <div className="gba:flex gba:items-start gba:space-x-3">
                        <Avatar size="sm">
                          <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:w-full gba:bg-primary-100 gba:text-primary-700 gba:font-medium">
                            {`${absence.employee?.firstName?.[0] || ''}${absence.employee?.lastName?.[0] || ''}`.toUpperCase()}
                          </div>
                        </Avatar>
                        <div>
                          <div className="gba:font-medium gba:text-neutral-900">{absence.type?.value || 'Absence Request'}</div>
                          <div className="gba:text-xs gba:text-neutral-500">
                            From: {`${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`}
                          </div>
                          <div className="gba:text-xs gba:text-neutral-600 gba:mt-1">
                            {dayjs(absence.startDate).format('MMM D')} - {dayjs(absence.endDate).format('MMM D, YYYY')}
                          </div>
                          <div className="gba:text-xs gba:text-neutral-500 gba:mt-1">
                            Status: <span className="gba:font-medium">{absence.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gba:text-center gba:py-6" data-testid="manager-dashboard-no-approvals">
                <PiCheckCircle className="gba:h-12 gba:w-12 gba:text-success-300 gba:mx-auto gba:mb-3" />
                <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-1">All caught up!</h3>
                <p className="gba:text-neutral-500">
                  There are no pending team absence approvals at the moment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Team Overview Card */}
        {/* <Card data-testid="manager-dashboard-team-card" className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden">
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
            <CardTitle className="gba:text-lg gba:flex gba:items-center">
              <PiUsers className="gba:mr-2 gba:h-5 gba:w-5 gba:text-primary-500" />
              Team Overview
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gba:text-neutral-500 gba:hover:text-neutral-700"
              data-testid="manager-dashboard-team-view-all-button"
            >
              View All
              <PiCaretRight size={16} className="gba:ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
            <div className="gba:space-y-4 gba:overflow-y-auto gba:pr-1 gba:h-full">
              {loadingTeam && (
                <div className="gba:flex gba:justify-center gba:py-4" data-testid="manager-dashboard-team-loading">
                  <div className="gba:flex gba:items-center gba:text-neutral-500">
                    <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading team...
                  </div>
                </div>
              )}
              
              {teamError && (
                <div className="gba:p-4 gba:text-center gba:text-destructive-600" data-testid="manager-dashboard-team-error">
                  Failed to load team members
                </div>
              )}
              
              {!loadingTeam && !teamError && teamMembers.length === 0 && (
                <div className="gba:p-4 gba:text-center gba:text-neutral-500" data-testid="manager-dashboard-no-team">
                  No team members found
                </div>
              )}
              
              {!loadingTeam && !teamError && teamMembers.map(member => (
                <div key={member.id} className="gba:flex gba:items-center gba:justify-between gba:py-2" data-testid={`manager-dashboard-team-member-${member.id}`}>
                  <div className="gba:flex gba:items-center">
                    <div className="gba:mr-3">
                      <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:bg-primary-100 gba:rounded-full gba:text-primary-700 gba:font-medium">
                        {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="gba:font-medium">{member.fullName}</div>
                      <div className="gba:text-sm gba:text-neutral-500">{member.jobTitle}</div>
                    </div>
                  </div>
                  <Badge 
                    variant={member.status === 'Online' ? 'success' : member.status === 'Away' ? 'warning' : 'default'}
                    className="gba:ml-auto"
                  >
                    {member.status}
                  </Badge>
                </div>
              ))}
              
              {!loadingTeam && !teamError && teamMembers.length > 0 && (
                <Button
                  variant="outline" 
                  className="gba:w-full"
                  data-testid="manager-dashboard-view-team-button"
                >
                  View Full Team
                </Button>
              )}
            </div>
          </CardContent>
        </Card> */}
                
        {/* Approvals */}
        <Card className="gba:col-span-1 gba:flex gba:flex-col gba:h-full gba:overflow-hidden" data-testid="manager-dashboard-approvals-card">
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2">
            <CardTitle className="gba:text-lg gba:font-medium gba:flex gba:items-center">
              <PiCheckSquare className="gba:mr-2" size={18} />
              Pending Approvals
              <Badge variant="info" className="gba:ml-2" data-testid="manager-dashboard-approvals-badge">
                {teamAbsences?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
            {absencesLoading && (
              <div className="gba:text-center gba:text-neutral-500 gba:py-6" data-testid="manager-dashboard-approvals-loading">
                <span className="gba:mr-2 gba:animate-spin">⏳</span> Loading absence requests...
              </div>
            )}
            
            {absencesError && (
              <div className="gba:text-center gba:text-destructive-600 gba:py-6" data-testid="manager-dashboard-approvals-error">
                Failed to load absence requests
              </div>
            )}
            
            {!absencesLoading && !absencesError && teamAbsences?.length === 0 && (
              <div className="gba:text-center gba:text-neutral-500 gba:py-6" data-testid="manager-dashboard-no-approvals">
                No pending absence approvals
              </div>
            )}
            
            {!absencesLoading && !absencesError && teamAbsences?.length > 0 && (
              <div className="gba:space-y-4 gba:overflow-y-auto gba:pr-1 gba:h-full">
                {teamAbsences.map((absence) => (
                  <div 
                    key={absence.id} 
                    className="gba:border-b gba:border-neutral-200 gba:pb-3 gba:last:border-0"
                    data-testid={`manager-dashboard-approval-${absence.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                      <div className="gba:font-medium">
                        {absence.type?.value || 'Absence Request'}
                      </div>
                      <Badge variant={absence.status === 'REQUESTED' ? 'info' : 'warning'}>
                        {absence.status || 'Pending'}
                      </Badge>
                    </div>
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div className="gba:text-sm gba:text-neutral-500 gba:flex gba:items-center">
                        <PiUser className="gba:mr-1" size={14} />
                        {`${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`}
                      </div>
                      <div className="gba:text-sm gba:text-neutral-500">
                        {dayjs(absence.startDate).format('MMM D')} - {dayjs(absence.endDate).format('MMM D, YYYY')}
                      </div>
                    </div>
                    <div className="gba:mt-2 gba:flex gba:space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gba:flex-1"
                        data-testid={`manager-dashboard-decline-${absence.id}-button`}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm"  
                        className="gba:flex-1 gba:bg-primary-600 gba:text-white gba:hover:bg-primary-700"
                        data-testid={`manager-dashboard-approve-${absence.id}-button`}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline" 
                  className="gba:w-full"
                  data-testid="manager-dashboard-view-all-approvals-button"
                >
                  View All Approvals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
  );

  return (
    <div  className="gba:flex gba:flex-col gba:h-full">
        {mainContent}
    </div>
     
  );
};

export default ManagerDashboard;
