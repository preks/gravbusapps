import React, { useState } from 'react';
import { PlusCircleOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';

interface ActivityTimelineProps {
  leadId?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ leadId }) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes' | 'documents'>('activities');

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
            <button 
              style={{
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              onClick={() => {
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
              }}
              data-testid="add-activity-button"
            >
              <PlusCircleOutlined style={{ marginRight: '4px' }} />
              Add Activity
            </button>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>No activities yet</div>
              <div style={{ fontSize: '14px' }}>Start by adding your first activity</div>
            </div>
          </div>
        </div>
      )}

      {/* Notes content */}
      {activeTab === 'notes' && (
        <div className="gba:notes-content" data-testid="notes-content">
          <div style={{ padding: '24px', textAlign: 'center', color: '#8c8c8c' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No notes yet</div>
            <div style={{ fontSize: '14px' }}>Add notes to keep track of important information</div>
          </div>
        </div>
      )}

      {/* Documents content */}
      {activeTab === 'documents' && (
        <div className="gba:documents-content" data-testid="documents-content">
          <div style={{ padding: '24px', textAlign: 'center', color: '#8c8c8c' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No documents yet</div>
            <div style={{ fontSize: '14px' }}>Upload documents related to this lead</div>
          </div>
        </div>
      )}
    </div>
  );
}; 