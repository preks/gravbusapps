/**
 * Services+ Feature Flag Utilities
 */

/**
 * Checks if Services+ is enabled
 * Hardcoded to true - Services+ is always enabled
 */
export const isServicesPlusEnabled = (): boolean => {
  // Services+ is always enabled
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
