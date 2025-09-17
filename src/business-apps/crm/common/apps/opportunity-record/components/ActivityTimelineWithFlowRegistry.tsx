/**
 * EXAMPLE IMPLEMENTATION: CRM Opportunity ActivityTimeline with Flow Registry Delete
 * 
 * This demonstrates how to migrate the existing ActivityTimeline component
 * to use the new universal DeleteConfirmPopup with Flow Registry.
 */

import React, { useState, useEffect } from 'react';
import { Button, message, Timeline, Typography } from 'antd';
import { EditOutlined, CloseOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DeleteConfirmPopup, useDeleteConfirm } from '@/common/components/common-relations/popups/delete-confirm-popup';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { AppAction } from '@/components/app-action/AppAction';

const { Title } = Typography;

// Example interfaces (these would come from your actual types)
interface SalesActivityData {
  id: string;
  version: number;
  title: string;
  description?: string;
  date?: string;
  activityType?: any;
  opportunity?: string;
}

interface ActivityTimelineProps {
  opportunityId: string;
  context: BusinessAppContextProps;
}

export const ActivityTimelineWithFlowRegistry: React.FC<ActivityTimelineProps> = ({ 
  opportunityId, 
  context 
}) => {
  const [activities, setActivities] = useState<SalesActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: Use the universal delete confirmation hook
  const {
    isOpen,
    isLoading,
    config,
    showDeleteConfirm,
    closeDeleteConfirm,
    handleDeleteConfirm,
  } = useDeleteConfirm();

  // Load activities (placeholder - replace with actual data loading)
  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        // Your actual activity loading logic here
        // const activities = await fetchActivities(opportunityId);
        // setActivities(activities);
        setActivities([]); // Placeholder
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [opportunityId]);

  // ✅ NEW: Flow Registry-based delete handler
  const handleDeleteActivity = (activity: SalesActivityData) => {
    showDeleteConfirm({
      itemTitle: activity.title,
      itemType: 'activity',
      accessToken: context.accessToken,
      flowContextName: FlowContextName.customerActivityEntity,
      externalContextData: {
        activityId: activity.id,
        opportunityId,
      },
      onFlowSuccess: () => {
        // Remove from local state
        setActivities(prevActivities =>
          prevActivities.filter(a => a.id !== activity.id)
        );
        message.success('Activity deleted successfully');
      },
      onFlowError: (error) => {
        console.error('Error deleting activity:', error);
        message.error('Failed to delete activity');
      },
      'data-testid': 'delete-activity'
    });
  };

  return (
    <div data-testid="opportunity-activity-timeline">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          Activities
        </Title>
        
        {/* Add Activity using AppAction */}
        <AppAction
          contextsArray={[FlowContextName.customerActivityCreate]}
          externalContextData={{ 
            opportunityId,
            opportunity: opportunityId,
            salesActivity: { opportunity: opportunityId }
          }}
          prefixDataTestId="add-activity"
          accessToken={context.accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
        >
          <Button type="primary" data-testid="add-activity-button">
            Add Activity
          </Button>
        </AppAction>
      </div>

      {/* Activities List */}
      {loading ? (
        <div>Loading activities...</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
          <p>No activities found</p>
          <AppAction
            contextsArray={[FlowContextName.customerActivityCreate]}
            externalContextData={{ 
              opportunityId,
              opportunity: opportunityId,
              salesActivity: { opportunity: opportunityId }
            }}
            prefixDataTestId="add-first-activity"
            accessToken={context.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          >
            <Button type="primary" data-testid="add-first-activity-button">
              Add First Activity
            </Button>
          </AppAction>
        </div>
      ) : (
        <Timeline>
          {activities.map((activity) => (
            <Timeline.Item key={activity.id} color="blue">
              <div style={{ position: 'relative', paddingRight: '80px' }}>
                <div>
                  <strong>{activity.title}</strong>
                  {activity.description && (
                    <p style={{ margin: '4px 0', color: '#666' }}>
                      {activity.description}
                    </p>
                  )}
                  {activity.date && (
                    <small style={{ color: '#999' }}>
                      {new Date(activity.date).toLocaleDateString()}
                    </small>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ position: 'absolute', top: '0', right: '0' }}>
                  {/* Edit Activity using AppAction */}
                  <AppAction
                    contextsArray={[FlowContextName.customerActivityEntity]}
                    externalContextData={{ activityId: activity.id, opportunityId }}
                    prefixDataTestId={`edit-activity-${activity.id}`}
                    accessToken={context.accessToken}
                    emptyStateBehavior="enable"
                    deferMainContextRequestsUntilClick
                  >
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      style={{ marginRight: '4px' }}
                      data-testid={`edit-activity-button-${activity.id}`}
                    />
                  </AppAction>

                  {/* Delete Activity - Uses Flow Registry Delete Popup */}
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleDeleteActivity(activity)}
                    data-testid={`delete-activity-button-${activity.id}`}
                  />
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      {/* ✅ NEW: Universal Delete Confirmation Popup with Flow Registry */}
      {config && (
        <DeleteConfirmPopup
          isOpen={isOpen}
          onClose={closeDeleteConfirm}
          // Flow Registry mode will automatically use these props from config:
          // accessToken, flowContextName, externalContextData, onFlowSuccess, onFlowError
          // Legacy mode fallback:
          isLoading={isLoading}
          onConfirm={handleDeleteConfirm}
          {...config}
        />
      )}
    </div>
  );
};

export default ActivityTimelineWithFlowRegistry;

/**
 * KEY CHANGES FROM ORIGINAL:
 * 
 * 1. ✅ **Removed Modal.confirm**: Replaced with showDeleteConfirm()
 * 2. ✅ **Removed REST Client**: No more direct API calls  
 * 3. ✅ **Added Flow Registry**: Uses FlowContextName.customerActivityEntity
 * 4. ✅ **Added Access Token**: Passed from BusinessAppContextProps
 * 5. ✅ **Added External Context**: Includes activityId and opportunityId
 * 6. ✅ **Improved Error Handling**: Centralized through Flow Registry
 * 7. ✅ **Consistent UI**: Same popup design across all components
 * 8. ✅ **Better Testing**: Standardized data-testid attributes
 * 
 * MIGRATION BENEFITS:
 * 
 * - 🔐 **Security**: Authentication handled by Flow Registry
 * - 📋 **Permissions**: User permissions checked automatically
 * - 🔄 **Event System**: Integrates with platform event system
 * - 📊 **Audit Trail**: All deletions tracked and logged
 * - ✅ **Validation**: Business rules enforced by Flow Registry
 * - 🎨 **Consistency**: Same UI/UX across all delete operations
 * - 🧪 **Testing**: Easier to test with standardized patterns
 */
