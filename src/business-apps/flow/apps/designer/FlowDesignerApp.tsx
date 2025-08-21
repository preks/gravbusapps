import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FlowDesigner } from '../creator/components/designer/FlowDesigner';

interface FlowDesignerAppProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const FlowDesignerApp: React.FC<FlowDesignerAppProps> = ({ accessToken, userInfo, 'data-testid': testId = 'flow-designer-app' }) => {
  return (
    <FlowDesigner accessToken={accessToken} userInfo={userInfo} data-testid={testId} />
  );
};

export default FlowDesignerApp;



