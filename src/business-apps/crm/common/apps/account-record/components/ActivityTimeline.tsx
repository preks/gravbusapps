import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined, UserOutlined, FileTextOutlined, CloseOutlined, CalendarOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Button, Spin, Alert, Empty, Timeline, Typography, Modal, message } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
// Import the GraphQL queries we created
import { useGetSalesActivities } from '../queries/SalesActivityQueries';
import { useGetCrmDocuments } from '../queries/CrmDocumentQueries';
import { NotesSection } from './NotesSection';

const { Text } = Typography;

interface SalesActivityData {
  id: string;
  version: number;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  activityType?: {
    value: string;
  };
}

interface CrmDocumentData {
  id: string;
  name: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  createdBy: string;
  version: number;
}

interface ActivityTimelineProps {
  accountId?: string;
  context: BusinessAppContextProps;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ accountId, context }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'documents'>('activities');
  const [activities, setActivities] = useState<SalesActivityData[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CrmDocumentData[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0);

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);
  
  // Use the GraphQL query hooks
  const { fetchSalesActivities } = useGetSalesActivities(context);
  const { fetchCrmDocuments } = useGetCrmDocuments(context);

  const loadActivities = async () => {
    if (!accountId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      const result = await fetchSalesActivities({ accountId });
      const activities = result.SalesActivity || [];
      
      // Sort activities by createdAt in descending order (newest first)
      const sortedActivities = activities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setActivities(sortedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!accountId) return;
    
    setDocumentsLoading(true);
    setDocumentsError(null);
    
    try {
      const result = await fetchCrmDocuments({ accountId });
      const documents = result.CrmDocument || [];
      
      setDocuments(documents);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab, accountId]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('ActivityTimeline: Window gained focus, refreshing data...');
      if (activeTab === 'activities') {
        loadActivities();
      } else if (activeTab === 'documents') {
        loadDocuments();
      }
      // Also refresh notes by updating key
      setNotesKey(prev => prev + 1);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [activeTab, accountId]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('ActivityTimeline: Process completion event received:', event.type);
        
        // Check for successful completion with different response structures
        let activityCreated = false;
        let documentUploaded = false;
        let noteCreated = false;
        
        // Check for successful completion first
        if (event.detail?.resolution === 'success') {
          console.log('ActivityTimeline: Process completed successfully, refreshing current tab');
          if (activeTab === 'activities') {
            loadActivities();
          } else if (activeTab === 'documents') {
            loadDocuments();
          }
          // Force refresh of notes tab by updating key
          setNotesKey(prev => prev + 1);
          return;
        }
        
        const response = event.detail?.response;
        
        // Check if activity was created
        if (response?.salesActivity || event.detail?.salesActivity) {
          activityCreated = true;
          console.log('ActivityTimeline: Sales activity detected, refreshing activities');
        }
        
        // Check if document was uploaded
        if (response?.crmDocument || event.detail?.crmDocument || event.detail?.resolution === 'success') {
          documentUploaded = true;
          console.log('ActivityTimeline: Document upload detected, refreshing documents');
        }
        
        // Check if note was created
        if (response?.crmNote || event.detail?.crmNote) {
          noteCreated = true;
          console.log('ActivityTimeline: Note creation detected, refreshing notes');
        }
        
        // Refresh the appropriate tab data
        if (activityCreated && activeTab === 'activities') {
          loadActivities();
        }
        if (documentUploaded && activeTab === 'documents') {
          loadDocuments();
        }
        if (noteCreated) {
          // Force refresh of notes tab by updating key
          setNotesKey(prev => prev + 1);
        }
        
        // If no specific data detected but process was successful, refresh current tab
        if (!activityCreated && !documentUploaded && !noteCreated && (event.detail?.resolution === 'success' || response)) {
          if (activeTab === 'activities') {
            loadActivities();
          } else if (activeTab === 'documents') {
            loadDocuments();
          } else if (activeTab === 'notes') {
            setNotesKey(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };
    
    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('ActivityTimeline: Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };
    
    // Listen to multiple possible event names (comprehensive list)
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });
    
    // Add universal dispatcher override to catch all events
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('ActivityTimeline: Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.accountId === accountId) {
          loadDocuments();
        }
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };
    
    window.addEventListener('message', handlePostMessage);
    
    console.log('ActivityTimeline: Added comprehensive event listeners for process completion');
    
    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      
      window.removeEventListener('message', handlePostMessage);
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [activeTab, accountId]);

  const handleAddActivity = () => {
    if (accountId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          accountId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleUploadDocument = () => {
    if (accountId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmDocument',
        payload: {
          accountId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleDeleteDocument = (document: CrmDocumentData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the document "${document.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/customer-relations/saveCrmDocument', {
            changeMode: "DELETE",
            crmDocument: {
              id: document.id,
              version: document.version,
              account: accountId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the document from local state
          setDocuments(prevDocuments => 
            prevDocuments.filter(d => d.id !== document.id)
          );
          
          message.success('Document deleted successfully');
        } catch (error) {
          console.error('Error deleting document:', error);
          message.error('Failed to delete document');
        }
      },
    });
  };

  const handleDeleteActivity = (activity: SalesActivityData) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the activity "${activity.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/customer-relations/saveSalesActivity', {
            changeMode: 'DELETE',
            salesActivity: {
              id: activity.id,
              version: activity.version,
              account: accountId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the activity from the local state
          setActivities(prevActivities => 
            prevActivities.filter(act => act.id !== activity.id)
          );
          
          message.success('Activity deleted successfully');
        } catch (error) {
          console.error('Error deleting activity:', error);
          message.error('Failed to delete activity');
        }
      },
    });
  };

  const getActivityTypeValue = (activityType: any): string => {
    if (!activityType) return '';
    if (typeof activityType === 'string') return activityType;
    if (activityType.value) return activityType.value;
    return '';
  };

  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
    >
      {/* Tab Navigation */}
      <div 
        style={{
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: '#fafafa'
        }}
      >
        <div style={{ display: 'flex' }}>
        <div 
          className={`gba:activity-tab${activeTab === 'activities' ? '-active' : ''}`}
          data-testid="activities-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'activities' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'activities' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('activities')}
        >
          Activities
        </div>
        <div 
          className={`gba:activity-tab${activeTab === 'notes' ? '-active' : ''}`}
          data-testid="notes-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'notes' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'notes' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </div>
        <div 
          className={`gba:activity-tab${activeTab === 'documents' ? '-active' : ''}`}
          data-testid="documents-tab"
          style={{
            padding: '12px 24px',
            fontWeight: '500',
            color: activeTab === 'documents' ? '#1890ff' : '#8c8c8c',
            backgroundColor: activeTab === 'documents' ? 'white' : 'transparent',
            flex: 1,
            textAlign: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </div>
        </div>
      </div>

      {/* Activities Tab Content */}
      {activeTab === 'activities' && (
        <div>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div 
              className="gba:activities-title" 
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Activities
            </div>
            <Button 
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={handleAddActivity}
              data-testid="add-activity-button"
            >
              Add Activity
            </Button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {activitiesLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            )}

            {activitiesError && (
              <Alert
                message="Error Loading Activities"
                description={activitiesError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadActivities}>
                    Retry
                  </Button>
                }
              />
            )}

            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <Empty
                description="No activities yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-activities"
              >
                <Button 
                  type="primary" 
                  icon={<PlusCircleOutlined />} 
                  onClick={handleAddActivity}
                >
                  Add First Activity
                </Button>
              </Empty>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '16px', color: '#1f2937' }}>
                          {activity.title}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(activity.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayName(activity.createdBy)}
                        </Text>
                      </div>
                      {getActivityTypeValue(activity.activityType) && (
                        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                          <span style={{ 
                            backgroundColor: '#f0f0f0', 
                            color: '#333', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {getActivityTypeValue(activity.activityType)}
                          </span>
                        </div>
                      )}
                      {activity.description && (
                        <div style={{ marginTop: '4px', color: '#374151' }}>
                          {activity.description}
                        </div>
                      )}
                      <Button 
                        type="text" 
                        icon={<CloseOutlined />} 
                        size="small"
                        style={{ 
                          position: 'absolute', 
                          right: 0, 
                          top: 0,
                          padding: '4px',
                          lineHeight: 1
                        }}
                        onClick={() => handleDeleteActivity(activity)}
                        data-testid={`delete-activity-${activity.id}`}
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <NotesSection accountId={accountId} context={context} key={notesKey} />
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div 
              className="gba:documents-title" 
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Documents
            </div>
            <Button 
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={handleUploadDocument}
              data-testid="upload-document-button"
            >
              Upload Document
            </Button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {documentsLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            )}

            {documentsError && (
              <Alert
                message="Error Loading Documents"
                description={documentsError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
                action={
                  <Button size="small" onClick={loadDocuments}>
                    Retry
                  </Button>
                }
              />
            )}

            {!documentsLoading && !documentsError && documents.length === 0 && (
              <Empty
                description="No documents yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-documents"
              >
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Start by uploading your first document
                </div>
              </Empty>
            )}

            {!documentsLoading && !documentsError && documents.length > 0 && (
              <Timeline>
                {documents.map((document, index) => (
                  <Timeline.Item key={document.id || index} color="green">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileTextOutlined />
                        <Text strong>{document.name}</Text>
                      </div>
                      <div>
                        <Text type="secondary">
                          {dayjs(document.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayName(document.createdBy)}
                        </Text>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <Text type="secondary">Type: {document.mimeType || 'Unknown'}</Text>
                        {document.fileSize && (
                          <Text type="secondary" style={{ marginLeft: '16px' }}>
                            Size: {Math.floor(document.fileSize / 1024)} KB
                          </Text>
                        )}
                      </div>
                      <Button 
                        type="text" 
                        icon={<CloseOutlined />} 
                        size="small"
                        style={{ 
                          position: 'absolute', 
                          right: 0, 
                          top: 0,
                          padding: '4px',
                          lineHeight: 1
                        }}
                        onClick={() => handleDeleteDocument(document)}
                        data-testid={`delete-document-${document.id}`}
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 