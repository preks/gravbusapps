import React, { useState } from 'react';
import { Tabs } from 'antd';
import { BuildOutlined, RocketOutlined, InboxOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import FlowCreator from './creator/FlowCreator';
import FlowLauncher from './launcher/FlowLauncher';
import TaskInbox from './inbox/TaskInbox';

const { TabPane } = Tabs;

interface FlowAppsNavigatorProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const FlowAppsNavigator: React.FC<FlowAppsNavigatorProps> = (props) => {
  const { prefixDataTestId = 'FlowAppsNavigator' } = props;
  const [activeTab, setActiveTab] = useState('creator');

  // Ensure required props are provided for child components
  const childProps = {
    ...props,
    user: props.userInfo || { id: 'user-001', name: 'Test User' },
    employeeId: props.userInfo?.id || 'user-001'
  };

  return (
    <div 
      data-testid={prefixDataTestId}
      style={{ 
        height: '100vh',
        padding: '16px',
        background: '#f0f2f5'
      }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="large"
        style={{ height: '100%' }}
        tabBarStyle={{ marginBottom: '16px' }}
      >
        <TabPane 
          tab={
            <span>
              <BuildOutlined />
              Flow Creator
            </span>
          } 
          key="creator"
        >
          <FlowCreator {...childProps} />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <RocketOutlined />
              Flow Launcher
            </span>
          } 
          key="launcher"
        >
          <FlowLauncher {...childProps} />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <InboxOutlined />
              Task Inbox
            </span>
          } 
          key="inbox"
        >
          <TaskInbox {...childProps} prefixDataTestId={`${prefixDataTestId}-Inbox`} />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default FlowAppsNavigator; 