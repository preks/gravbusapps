/**
 * Services+ Feature Flag Utilities
 */

import { env } from '@/common/env/EnvUtils';

/**
 * Checks if Services+ is enabled
 * Based on SERVICES_PLUS_ENABLED environment variable
 * Defaults to enabled in development mode
 */
export const isServicesPlusEnabled = (): boolean => {
  const enabled = env('SERVICES_PLUS_ENABLED');
  
  // If explicitly set, use that value
  if (enabled !== undefined && enabled !== null && enabled !== '') {
    return enabled === 'true' || enabled === '1';
  }
  
  // Default to enabled in development mode (when env var is not set)
  return true;
};

/**
 * Redirect path when Services+ is disabled
 * Can be configured based on platform requirements
 */
export const getDisabledRedirectPath = (): string => {
  return '/dashboard'; // or wherever users should be redirected
};

/**
 * Hook for services feature flag check with redirect
 */
export const useServicesFeatureFlag = () => {
  const isEnabled = isServicesPlusEnabled();
  
  return {
    isEnabled,
    redirectPath: isEnabled ? null : getDisabledRedirectPath(),
    checkAndRedirect: () => {
      if (!isEnabled) {
        window.location.href = getDisabledRedirectPath();
        return false;
      }
      return true;
    }
  };
};
