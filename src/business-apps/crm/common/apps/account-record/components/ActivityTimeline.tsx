import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined, UserOutlined, FileTextOutlined, CloseOutlined, CalendarOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Button, Spin, Alert, Empty, Timeline, Typography, Modal, message } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';

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

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  const loadActivities = async () => {
    if (!accountId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      // TODO: Replace with actual GraphQL query for account activities
      // For now, using empty array
      const activities: SalesActivityData[] = [];
      
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
      // TODO: Replace with actual GraphQL query for account documents
      // For now, using empty array
      const documents: CrmDocumentData[] = [];
      
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
  }, [accountId, activeTab]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadActivities();
          loadDocuments();
          return;
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

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

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, [accountId]);

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

  const handleAddDocument = () => {
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
            changeMode: "DELETE",
            salesActivity: {
              id: activity.id,
              version: activity.version,
              account: accountId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          setActivities(prevActivities => 
            prevActivities.filter(a => a.id !== activity.id)
          );
          
          message.success('Activity deleted successfully');
        } catch (error) {
          console.error('Error deleting activity:', error);
          message.error('Failed to delete activity');
        }
      },
    });
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

  return (
    <div style={{
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      padding: '20px',
      height: '100%',
      border: '1px solid #e8e8e8'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}>
          Activity Timeline
        </div>
      </div>

      {/* Tab buttons */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '16px',
        borderBottom: '1px solid #e8e8e8'
      }}>
        {['activities', 'notes', 'documents'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === tab ? '#1890ff' : '#8c8c8c',
              borderBottom: activeTab === tab ? '2px solid #1890ff' : '2px solid transparent',
              textTransform: 'capitalize',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '500' : '400'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Activities Tab Content */}
      {activeTab === 'activities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<PlusCircleOutlined />} 
              onClick={handleAddActivity}
              size="small"
            >
              Add Activity
            </Button>
          </div>

          {activitiesLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
            </div>
          )}

          {activitiesError && (
            <Alert
              message="Error loading activities"
              description={activitiesError}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {!activitiesLoading && !activitiesError && activities.length === 0 && (
            <Empty 
              description="No activities yet"
              style={{ padding: '20px' }}
            />
          )}

          {!activitiesLoading && !activitiesError && activities.length > 0 && (
            <Timeline>
              {activities.map((activity, index) => (
                <Timeline.Item key={activity.id || index} color="blue">
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>
                        {activity.title}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary">
                        {dayjs(activity.createdAt).format('MMM D, YYYY [at] h:mm A')} - {getEmployeeDisplayName(activity.createdBy)}
                      </Text>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <div>{activity.description}</div>
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
                      onClick={() => handleDeleteActivity(activity)}
                      data-testid={`delete-activity-${activity.id}`}
                    />
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </div>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<CloudUploadOutlined />} 
              onClick={handleAddDocument}
              size="small"
            >
              Upload Document
            </Button>
          </div>

          {documentsLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
            </div>
          )}

          {documentsError && (
            <Alert
              message="Error loading documents"
              description={documentsError}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {!documentsLoading && !documentsError && documents.length === 0 && (
            <Empty 
              description="No documents yet"
              style={{ padding: '20px' }}
            />
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
      )}

      {/* Notes Tab Content - Placeholder */}
      {activeTab === 'notes' && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#8c8c8c'
        }}>
          Notes functionality coming soon
        </div>
      )}
    </div>
  );
}; 