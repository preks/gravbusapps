import React, { useState, useEffect } from 'react';
import { PlusCircleOutlined, UserOutlined, FileTextOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, List, Avatar, Spin, Alert, Empty, Tag, message, Timeline, Typography, Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NotesSection } from './NotesSection';
import { useGetSalesActivities, SalesActivityData } from '../queries/SalesActivityQueries';
import { useGetCrmDocuments, CrmDocumentData } from '../queries/CrmDocumentQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ActivityTimelineProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ leadId, context }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'documents'>('activities');
  const [activities, setActivities] = useState<SalesActivityData[]>([]);
  const [documents, setDocuments] = useState<CrmDocumentData[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0); // Key to force NotesSection re-render
  const { fetchSalesActivities } = useGetSalesActivities(context);
  const { fetchCrmDocuments } = useGetCrmDocuments(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const loadActivities = async () => {
    if (!leadId) return;
    
    setActivitiesLoading(true);
    setActivitiesError(null);
    
    try {
      const result = await fetchSalesActivities({ leadId });
      // Sort activities by createdAt in descending order (newest first)
      const sortedActivities = (result.SalesActivity || []).sort((a, b) => 
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
    if (!leadId) return;
    
    setDocumentsLoading(true);
    setDocumentsError(null);
    
    try {
      const result = await fetchCrmDocuments({ leadId });
      setDocuments(result.CrmDocument || []);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const refreshNotes = () => {
    // Force NotesSection to re-render by updating the key
    setNotesKey(prev => prev + 1);
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [leadId, activeTab]);

  // Listen for process completion events and postMessage events
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        const response = event.detail?.response;
        if (response?.salesActivity) {
          loadActivities();
        }
        if (response?.crmNote) {
          refreshNotes();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    // Listen for postMessage events from document upload form
    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.leadId === leadId) {
          // Refresh documents when a document is uploaded
          loadDocuments();
        }
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };

    window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener);
    window.addEventListener('message', handlePostMessage);

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener);
      window.removeEventListener('message', handlePostMessage);
    };
  }, [leadId]);

  const handleAddActivity = () => {
    if (leadId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleAddDocument = () => {
    if (leadId) {
      // Open document upload form in a new window/modal
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmDocument',
        payload: {
          leadId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleRefreshActivities = () => {
    loadActivities();
  };

  const handleRefreshDocuments = () => {
    loadDocuments();
  };

  const handleDeleteActivity = async (activity: SalesActivityData) => {
    try {
      await restClient.post('/customer-relations/saveSalesActivity', {
        changeMode: "DELETE",
        salesActivity: {
          id: activity.id,
          version: activity.version,
          lead: leadId
        }
      }, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      });
      
      // Remove the activity from the local state
      setActivities(prevActivities => 
        prevActivities.filter(a => a.id !== activity.id)
      );
      
      message.success('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      message.error('Failed to delete activity');
    }
  };

  const handleMarkActivityComplete = async (activity: SalesActivityData, completed: boolean) => {
    try {
      const now = new Date().toISOString();
      
      await restClient.post('/customer-relations/saveSalesActivity', {
        changeMode: "UPDATE",
        salesActivity: {
          id: activity.id,
          version: activity.version,
          lead: leadId,
          completedAt: completed ? now : ""
        }
      }, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      });
      
      // Refresh activities to get updated data
      await loadActivities();
      
      message.success(completed ? 'Activity marked as complete' : 'Activity marked as incomplete');
    } catch (error) {
      console.error('Error updating activity:', error);
      message.error('Failed to update activity');
    }
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
      {/* Tabs */}
      <div 
        className="gba:activity-tabs" 
        data-testid="activity-tabs"
        style={{
          display: 'flex',
          backgroundColor: '#f0f7ff',
          borderRadius: '8px 8px 0 0'
        }}
      >
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

      {/* Activities content */}
      {activeTab === 'activities' && (
        <div className="gba:activity-content" data-testid="activity-content">
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px'
            }}
          >
            <div 
              className="gba:activity-timeline-title" 
              style={{ fontSize: '18px', fontWeight: '500' }}
            >
              Activity Timeline
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
                  <Button size="small" onClick={handleRefreshActivities}>
                    Retry
                  </Button>
                }
              />
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color={activity.completedAt ? "green" : "blue"}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={activity.completedAt ? { opacity: 0.6 } : {}}>{activity.title}</Text>
                      </div>
                      <div><Text type="secondary">{dayjs(activity.createdAt).format('MMM D, YYYY [at] h:mm A')}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <div style={{ flex: 1 }}>{activity.description}</div>
                        <Checkbox 
                          checked={!!activity.completedAt}
                          disabled={!!activity.completedAt}
                          onChange={(e: CheckboxChangeEvent) => handleMarkActivityComplete(activity, e.target.checked)}
                          data-testid={`complete-activity-${activity.id}`}
                          style={{ marginLeft: '16px' }}
                        >
                          Done
                        </Checkbox>
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

            {!activitiesLoading && !activitiesError && activities.length === 0 && (
              <Empty
                description="No activities yet"
                style={{ padding: '40px 0' }}
                data-testid="empty-activities"
              >
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Start by adding your first activity
                </div>
              </Empty>
            )}
          </div>
        </div>
      )}

      {/* Notes content */}
      {activeTab === 'notes' && (
        <NotesSection leadId={leadId} context={context} key={notesKey} />
      )}

      {/* Documents content */}
      {activeTab === 'documents' && (
        <div className="gba:documents-content" data-testid="documents-content">
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
              icon={<PlusCircleOutlined />}
              onClick={handleAddDocument}
              data-testid="add-document-button"
            >
              Add Document
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
                  <Button size="small" onClick={handleRefreshDocuments}>
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
                  Upload documents related to this lead
                </div>
              </Empty>
            )}

            {!documentsLoading && !documentsError && documents.length > 0 && (
              <List
                dataSource={documents}
                renderItem={(document) => (
                  <List.Item
                    key={document.id}
                    style={{
                      backgroundColor: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      padding: '16px'
                    }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<FileTextOutlined />} />}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600', fontSize: '16px' }}>
                            {document.name}
                          </span>
                          <Tag color="blue">
                            {document.documentType?.value || 'Unknown Type'}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginTop: '8px', fontSize: '14px', color: '#595959' }}>
                            Version: {document.version}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                            Created: {dayjs(document.createdAt).format('MMM D, YYYY [at] h:mm A')}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 