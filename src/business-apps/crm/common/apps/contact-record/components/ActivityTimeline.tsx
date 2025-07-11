import React from 'react';
import { Card, Empty } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ActivityTimelineProps {
  contactId: string;
  context: BusinessAppContextProps;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ contactId: _contactId, context: _context }) => {
  return (
    <Card
      title="Activity Timeline"
      style={{ width: '100%', height: '100%' }}
    >
      <Empty 
        description="No activities yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </Card>
  );
}; 