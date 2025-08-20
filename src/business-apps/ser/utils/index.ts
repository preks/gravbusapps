/**
 * Service Portal Utilities
 */

export * from './featureFlags';
export * from './iconMapping';

// Additional utility functions can be added here
export const formatRequestId = (id: string): string => {
  return `REQ-${id.slice(-8).toUpperCase()}`;
};

export const formatDuration = (hours: number): string => {
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
    case 'queued':
      return 'orange';
    case 'ready':
    case 'claimed':
      return 'blue';
    case 'in_progress':
      return 'cyan';
    case 'waiting':
    case 'blocked':
      return 'yellow';
    case 'done':
    case 'completed':
      return 'green';
    case 'canceled':
      return 'red';
    default:
      return 'default';
  }
};

// HTML entity decoder utility
export const decodeHtmlEntities = (str: string): string => {
  if (typeof str !== 'string') return str;
  
  // Create a temporary div element to use browser's HTML decoding
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

// Safe text renderer that decodes HTML entities
export const renderSafeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return decodeHtmlEntities(text);
};
