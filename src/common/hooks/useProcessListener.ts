import { useEffect } from 'react';
import { useFlowClient } from '../network/flows/useFlowClient';

interface ProcessStartEventDetail {
  domain: string;
  processName: string;
  startProcessBody: any;
  processInstanceId?: string;
}

/**
 * A central hook to listen for process start events.
 * This hook sets up a listener for the "com.newwork.process.start" custom event
 * and provides handling logic only on localhost.
 *
 * @returns void
 */
export const useProcessListener = (accessToken: string): void => {
  // Create the flow client at the top level of the hook
  const flowClient = useFlowClient({
    accessToken
  });
  
  useEffect(() => {
    const handleProcessStartEvent = (event: CustomEvent<ProcessStartEventDetail>) => {
      const { domain, processName, startProcessBody, processInstanceId } = event.detail;
      
      // Check if running on localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        // Local development handling
        console.log('Process start event detected in local environment:', {
          domain,
          processName,
          startProcessBody,
          processInstanceId
        });
        
        // Extract and remove structureId and platformContext if they exist
        const { structureId, platformContext, ...cleanPayload } = startProcessBody;
        
        flowClient.executeFlow({
          accessScope: domain,
          context: processName
        }, cleanPayload).catch(error => {
          console.error('Error starting process:', error);
        });
      }
    };
    
    // Add event listener
    window.addEventListener(
      'com.newwork.process.start',
      handleProcessStartEvent as EventListener
    );
    
    // Cleanup function
    return () => {
      window.removeEventListener(
        'com.newwork.process.start',
        handleProcessStartEvent as EventListener
      );
    };
  }, [accessToken, flowClient]);
};
