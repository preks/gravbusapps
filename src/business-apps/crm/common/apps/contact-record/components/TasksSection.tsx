import React from 'react';
import { Card, Empty } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface TasksSectionProps {
  contactId: string;
  context: BusinessAppContextProps;
}

export const TasksSection: React.FC<TasksSectionProps> = ({ contactId: _contactId, context: _context }) => {
  return (
    <Card
      title="Tasks"
      style={{ width: '100%', height: '100%' }}
    >
      <Empty 
        description="No tasks yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    </Card>
  );
}; 