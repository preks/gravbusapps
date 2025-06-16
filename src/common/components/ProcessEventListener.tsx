import React from 'react';
import { useProcessListener } from '../hooks/useProcessListener';

/**
 * Component that sets up global event listeners for process-related events.
 * This component doesn't render anything visible but provides event handling functionality.
 * It should be placed high in the component tree to ensure it's always active.
 */
export const ProcessEventListener: React.FC<{ accessToken: string }> = ({ accessToken }) => {
  // Use the process listener hook to set up event handling
  useProcessListener(accessToken);
  
  // This component doesn't render anything
  return null;
};

export default ProcessEventListener;
