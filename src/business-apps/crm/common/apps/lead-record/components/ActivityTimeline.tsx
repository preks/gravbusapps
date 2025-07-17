import React, { useState, useEffect, useRef } from 'react';
import { PlusCircleOutlined, UserOutlined, FileTextOutlined, CloseOutlined, LoadingOutlined, CalendarOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Button, List, Avatar, Spin, Alert, Empty, Tag, message, Timeline, Typography, Modal } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { NotesSection } from './NotesSection';
import { useGetSalesActivities, SalesActivityData } from '../queries/SalesActivityQueries';
import { useGetCrmDocuments, CrmDocumentData } from '../queries/CrmDocumentQueries';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { useFileClient } from '@/common/network/files/useFileClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';
import { LanguageDropdown } from './LanguageDropdown';
import { translateMultipleTexts } from '../utils/translationService';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';

const { Text } = Typography;

interface ActivityTimelineProps {
  leadId?: string;
  context: BusinessAppContextProps;
}

interface TranslatedActivity extends SalesActivityData {
  translatedTitle?: string;
  translatedDescription?: string;
  isTranslating?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ leadId, context }) => {
  // Read initial tab from URL parameters
  const getInitialTab = (): 'activities' | 'notes' | 'documents' => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'activities' || tabParam === 'notes' || tabParam === 'documents') {
      return tabParam;
    }
    return 'activities';
  };

  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'documents'>(getInitialTab);
  const [activities, setActivities] = useState<TranslatedActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CrmDocumentData[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [notesKey, setNotesKey] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('Original');
  const [translating, setTranslating] = useState(false);
  const originalActivitiesRef = useRef<SalesActivityData[]>([]);

  const { fetchSalesActivities } = useGetSalesActivities(context);
  const { fetchCrmDocuments } = useGetCrmDocuments(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const fileClient = useFileClient(context);
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  // Function to update tab and URL
  const updateActiveTab = (newTab: 'activities' | 'notes' | 'documents') => {
    setActiveTab(newTab);
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

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
      
      // Store original activities for translation reference
      originalActivitiesRef.current = sortedActivities;
      setActivities(sortedActivities);
    } catch (err) {
      setActivitiesError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Handle language change and translate activities
  useEffect(() => {
    const translateActivities = async () => {
      const originalActivities = originalActivitiesRef.current;
      
      if (selectedLanguage === 'Original' || originalActivities.length === 0) {
        // Reset to original text for Original language or no activities
        setActivities(originalActivities);
        return;
      }

      setTranslating(true);
      
      try {
        // Collect all text to translate from original activities
        const textsToTranslate: string[] = [];
        const activityMapping: Array<{ activityIndex: number, titleIndex: number, descriptionIndex: number }> = [];
        
        originalActivities.forEach((activity, activityIndex) => {
          const titleIndex = textsToTranslate.length;
          textsToTranslate.push(activity.title);
          
          const descriptionIndex = textsToTranslate.length;
          textsToTranslate.push(activity.description);
          
          activityMapping.push({ activityIndex, titleIndex, descriptionIndex });
        });

        // Translate all texts at once
        const translatedTexts = await translateMultipleTexts(textsToTranslate, selectedLanguage, context.accessToken);
        
        // Create translated activities based on original activities
        const translatedActivities: TranslatedActivity[] = originalActivities.map((originalActivity, activityIndex) => {
          const mapping = activityMapping[activityIndex];
          return {
            ...originalActivity,
            translatedTitle: translatedTexts[mapping.titleIndex],
            translatedDescription: translatedTexts[mapping.descriptionIndex],
            isTranslating: false
          };
        });
        
        setActivities(translatedActivities);
      } catch (err) {
        console.error('Translation error:', err);
        message.error('Failed to translate activities');
        // Fallback to original activities
        setActivities(originalActivities);
      } finally {
        setTranslating(false);
      }
    };

    if (activeTab === 'activities') {
      translateActivities();
    }
  }, [selectedLanguage, activeTab, context.accessToken]);

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

  // Listen for URL parameter changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      if (newTab !== activeTab) {
        setActiveTab(newTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab]);

  // Add focus event listener to refresh data when user returns to the tab
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window gained focus, refreshing data...');
      if (activeTab === 'activities') {
        loadActivities();
      } else if (activeTab === 'documents') {
        loadDocuments();
      }
      refreshNotes();
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
  }, [activeTab, leadId]);

  // Listen for process completion events and postMessage events
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadActivities();
          loadDocuments();
          refreshNotes();
          
          return
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    // Listen for postMessage events from document upload form
    const handlePostMessage = (event: MessageEvent) => {
      try {
        console.log('PostMessage event received:', event.data);
        if (event.data?.type === 'CRM_DOCUMENT_UPLOADED' && event.data?.leadId === leadId) {
          // Refresh documents when a document is uploaded
          console.log('Refreshing documents from postMessage...');
          loadDocuments();
        }
      } catch (err) {
        console.error('Error handling postMessage:', err);
      }
    };

    // Universal event listener to capture all events
    const handleAllEvents = (event: any) => {
      if (event.type && event.type.includes('process') || event.type && event.type.includes('task')) {
        console.log('Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Listen to multiple possible event names
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
    
    window.addEventListener('message', handlePostMessage);

    // Add a universal listener for debugging
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      window.removeEventListener('message', handlePostMessage);
      
      // Restore original dispatchEvent
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [leadId]);

  const handleAddActivity = () => {
    if (leadId) {
      // Store current tab to preserve state
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'activities');
      
      startProcess({
        domain: 'customer-relations',
        processName: 'saveSalesActivity',
        payload: {
          leadId,
          returnUrl: currentUrl.toString()
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  const handleAddDocument = () => {
    if (leadId) {
      // Store current tab to preserve state
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'documents');
      
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmDocument',
        payload: {
          leadId,
          returnUrl: currentUrl.toString()
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
              lead: leadId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the activity from both states
          setActivities(prevActivities => 
            prevActivities.filter(a => a.id !== activity.id)
          );
          
          // Also remove from original activities ref
          originalActivitiesRef.current = originalActivitiesRef.current.filter(a => a.id !== activity.id);
          
          message.success('Activity deleted successfully');
        } catch (error) {
          console.error('Error deleting activity:', error);
          message.error('Failed to delete activity');
        }
      },
    });
  };

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const getActivityTypeValue = (activityType: any): string => {
    if (!activityType) return '';
    if (typeof activityType === 'string') return activityType;
    if (activityType.value) return activityType.value;
    return '';
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
              leadId: leadId
            }
          }, {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          });
          
          // Remove the document from the local state
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
          onClick={() => updateActiveTab('activities')}
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
          onClick={() => updateActiveTab('notes')}
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
          onClick={() => updateActiveTab('documents')}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                className="gba:activities-title" 
                style={{ fontSize: '18px', fontWeight: '500' }}
              >
                Activities
              </div>
              <LanguageDropdown
                selectedLanguage={selectedLanguage}
                onChange={handleLanguageChange}
              />
              {translating && (
                <Spin 
                  indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} 
                  size="small" 
                />
              )}
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
                <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  Start by adding your first activity
                </div>
              </Empty>
            )}

            {!activitiesLoading && !activitiesError && activities.length > 0 && (
              <Timeline>
                {activities.map((activity, index) => (
                  <Timeline.Item key={activity.id || index} color="blue">
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>
                          {activity.translatedTitle || activity.title}
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
                      <div style={{ marginTop: '4px' }}>
                        <div>{activity.translatedDescription || activity.description}</div>
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
        </div>
      )}

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <NotesSection key={notesKey} leadId={leadId} context={context} />
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
              onClick={handleAddDocument}
              data-testid="add-document-button"
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