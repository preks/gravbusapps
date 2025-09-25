import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { TaskSection, ActivitySection, NoteSection, ApprovalSection } from '@/common/components/common-relations/record-sections';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system';
import { useGetInvestmentTasksByInvestmentId } from '../../hooks/useInvestmentTasksByInvestmentId';
import { useGetInvestmentActivitiesByInvestmentId } from '../../hooks/useInvestmentActivitiesByInvestmentId';
import { useGetInvestmentNotesByInvestmentId } from '../../hooks/useInvestmentNotesByInvestmentId';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { ChartLine, PencilSimple, CheckCircle } from '@phosphor-icons/react';

interface InvestmentHomeTabProps extends BusinessAppContextProps {
  investmentId: string;
}

export const InvestmentHomeTab: React.FC<InvestmentHomeTabProps> = ({ 
  investmentId, 
  ...context 
}) => {
  // Real data state
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  
  const { fetchInvestmentTasksByInvestmentId } = useGetInvestmentTasksByInvestmentId(context);
  const { fetchInvestmentActivitiesByInvestmentId } = useGetInvestmentActivitiesByInvestmentId(context);
  const { fetchInvestmentNotesByInvestmentId } = useGetInvestmentNotesByInvestmentId(context);

  const loadTasks = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId]);

  const loadActivities = useCallback(async () => {
    if (!investmentId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      const activitiesData = await fetchInvestmentActivitiesByInvestmentId(investmentId);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivitiesError(error instanceof Error ? error.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  }, [investmentId, fetchInvestmentActivitiesByInvestmentId]);

  const loadNotes = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const notesData = await fetchInvestmentNotesByInvestmentId(investmentId);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }, [investmentId, fetchInvestmentNotesByInvestmentId]);

  // Handle process events
  const handleProcessEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    // Safe logging - only event type and investmentId (no PII)
    console.log('Process event received:', { 
      type: customEvent.type, 
      investmentId: customEvent.detail?.investmentId 
    });
    
    // Detailed logging only in development (may contain PII)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Process event detail (dev only):', customEvent.detail);
    }
    
    // Handle process completion events here
    if (customEvent.detail?.investmentId === investmentId) {
      // Refresh data when process completes
      loadTasks();
      loadActivities();
      loadNotes();
    }
  }, [investmentId, loadTasks, loadActivities, loadNotes]);

  const loadApprovals = useCallback(async () => {
    if (!investmentId) return;
    
    try {
      const tasksData = await fetchInvestmentTasksByInvestmentId(investmentId);
      // Filter only approval tasks
      const approvalTasks = (tasksData || []).filter((task: any) => {
        const typeVal = task?.taskType?.value || task?.taskType?.code || task?.taskTypeRef || '';
        return String(typeVal).toLowerCase() === 'approval' || String(typeVal).toUpperCase().endsWith(':APPROVAL');
      });
      setApprovals(approvalTasks);
    } catch (err) {
      // Failed to load approvals
    }
  }, [investmentId, fetchInvestmentTasksByInvestmentId]);

  useEffect(() => {
    loadTasks();
    loadActivities();
    loadNotes();
    loadApprovals();
  }, [loadTasks, loadActivities, loadNotes, loadApprovals]);

  // Listen for process events to refresh data
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadTasks();
          loadActivities();
          loadNotes();
          loadApprovals();
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || response?.investment) {
          loadTasks();
          loadActivities();
          loadNotes();
          loadApprovals();
          return;
        }
        
        // Check for continue events with payload (task/activity/note creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadTasks();
          loadActivities();
          loadNotes();
          loadApprovals();
        }
      } catch (err) {
        console.error('Error handling process event in InvestmentHomeTab:', err);
      }
    };

    const eventTypes = [
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted'
    ];
    
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleProcessEvent);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleProcessEvent);
      });
    };
  }, [loadTasks, loadActivities, loadNotes, loadApprovals]);

  return (
    <div data-testid="investment-home-tab">
      {/* Two-column layout: Activity Timeline on left, Tasks on right */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        
        {/* Left Column: Activity Timeline with tabs */}
        <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm">
          <div className="gba:p-4 gba:border-b">
            <h3 className="gba:text-lg gba:font-semibold">Activity Timeline</h3>
          </div>
          
          <Tabs defaultValue="activities" className="gba:w-full">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:bg-transparent gba:p-0 gba:h-auto">
              <TabsTrigger 
                value="activities" 
                className="gba:border-b-2 gba:border-transparent gba:rounded-none data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <ChartLine className="gba:w-4 gba:h-4" />
                  Activities
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="notes"
                className="gba:border-b-2 gba:border-transparent gba:rounded-none data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PencilSimple className="gba:w-4 gba:h-4" />
                  Notes
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="approvals"
                className="gba:border-b-2 gba:border-transparent gba:rounded-none data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CheckCircle className="gba:w-4 gba:h-4" />
                  Approvals
                </div>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="activities" className="gba:p-4">
              <ActivitySection
                investmentId={investmentId}
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                activities={activities}
                activitiesLoading={activitiesLoading}
                activitiesError={activitiesError}
                onReloadActivities={loadActivities}
                contextsArray={[FlowContextName.createInvestmentActivity]}
                externalContextData={{ investmentId }}
                prefixDataTestId="investment-activity"
                data-testid="investment-activities-section"
              />
            </TabsContent>
            
            <TabsContent value="notes" className="gba:p-4">
              <NoteSection
                investmentId={investmentId}
                notes={notes}
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                noteActionProps={{
                  contextsArray: [FlowContextName.createInvestmentNote],
                  externalContextData: { investmentId },
                  prefixDataTestId: 'investment-note',
                  emptyStateBehavior: 'enable'
                }}
                data-testid="investment-notes-section"
              />
            </TabsContent>
            
            <TabsContent value="approvals" className="gba:p-4">
              <ApprovalSection
                accessToken={context.accessToken}
                userInfo={context.userInfo}
                approvals={approvals.map(approval => ({
                  id: approval.id,
                  title: approval.title || approval.name || 'Approval Task',
                  status: approval.status || approval.taskStatus?.value || approval.taskStatus?.code || 'pending',
                  date: approval.createdAt || approval.date || approval.dueDate,
                  actor: approval.assigneeName,
                  actorEmployee: approval.assigneeEmployee || approval.reviewer || approval.approver
                }))}
                approvalActionProps={{
                  contextsArray: [FlowContextName.investmentTaskCreate],
                  externalContextData: { 
                    investmentId,
                    investment: investmentId,
                    investmentTask: { investment: investmentId, investmentId, taskType: 'approval' }
                  },
                  prefixDataTestId: 'request-approval',
                  emptyStateBehavior: 'enable'
                }}
                data-testid="investment-approvals-section"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Tasks */}
        <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm">
          <div className="gba:p-4 gba:border-b">
            <h3 className="gba:text-lg gba:font-semibold">Tasks ({tasks.length})</h3>
          </div>
          
          <div className="gba:p-4">
            <TaskSection
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              tasks={tasks.map(task => ({
                id: task.id || task.title,
                title: task.title || task.name || 'Untitled Task',
                due: task.dueDate || task.due,
                assignee: task.assigneeName,
                statusCode: (task.statusCode || task.status || task.taskStatus?.code || task.taskStatus?.value || 'PENDING') as any,
                assigneeEmployee: task.assigneeEmployee || task.assignee
              }))}
              taskActionProps={{
                contextsArray: [FlowContextName.investmentTaskCreate],
                externalContextData: { 
                  investmentId,
                  investment: investmentId,
                  investmentTask: { investment: investmentId, investmentId }
                },
                prefixDataTestId: 'add-task',
                emptyStateBehavior: 'enable'
              }}
              data-testid="investment-tasks-section"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentHomeTab;
