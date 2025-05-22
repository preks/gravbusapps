import { useState, useEffect, useRef } from 'react';
import { axios } from '../requests/axiosClient';
import { useAuth } from '../providers/auth-provider';
import { env } from '../utils/env-vars.utils';

interface PermissionRequest {
  domain: string;
  resource: string;
  resourceId: string;
  permissions: string[];
}

interface PermissionResponse {
  domain: string;
  resource: string;
  resourceId: string;
  userId: string;
  permissions: Record<string, boolean>;
}

/**
 * Add Environment variable:
 * 
#PERMISSIONS
NEXT_PUBLIC_PERMISSIONS_API=https://newwork-dev.newwork.com/authorization/api/v1

 * 
 */

/**
 * Custom hook for checking permissions
 * @param permissionRequests Array of permission requests to check
 * @returns Object containing loading state, permission check result, and any error
 */
export const usePermissionCheck = (permissionRequests: PermissionRequest[]) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Get authentication token from the auth provider
  const { kc } = useAuth();
  
  // Use a ref to track if we've already attempted the permission check
  const checkAttempted = useRef<boolean>(false);

  useEffect(() => {
    const checkPermissions = async () => {
      // Skip if we've already attempted the check
      if (checkAttempted.current) {
        return;
      }
      
      if (!permissionRequests || permissionRequests.length === 0) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      // Mark that we've attempted the check
      checkAttempted.current = true;

      try {
        setLoading(true);
        
        // Get the permissions API URL from environment variables
        //const permissionsApiUrl = env('NEXT_PUBLIC_PERMISSIONS_API');
        
        const permissionsApiUrl = 'https://newwork-dev.newwork.com/authorization/api/v1';

        // Use the correct API endpoint
        const response = await axios.post(
          `${permissionsApiUrl}/permissions/bulk-check`,
          permissionRequests,
          {
            headers: {
              Authorization: `Bearer ${kc?.token}`
            }
          }
        );

        // Check if all permissions are granted
        const allPermissionsGranted = response.data.every((result: PermissionResponse) => {
          // Check each requested permission in the response
          const requestedPermissions = permissionRequests.find(
            req => req.domain === result.domain && req.resource === result.resource && req.resourceId === result.resourceId
          )?.permissions || [];
          
          // Check if all requested permissions are granted
          return requestedPermissions.every(permission => result.permissions[permission] === true);
        });
        
        setHasPermission(allPermissionsGranted);
        setError(null);
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        setHasPermission(false);
        // Don't retry on failure - we've already marked this check as attempted
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [permissionRequests]);

  return { loading, hasPermission, error };
};
