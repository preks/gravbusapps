'use client';

import { AvatarEditor } from '@/components/avatar-editor';

interface EmployeeAvatarPictureProps {
  readonly profilePicture: any;
  readonly size: number;
  readonly employeeId: string;
}

/**
 * Employee Avatar Picture Component
 * Displays a profile picture for an employee using the AvatarEditor component
 * 
 * @param profilePicture - Base64 encoded profile picture
 * @param size - Size of the avatar in pixels
 * @param employeeId - Employee's ID
 */
export function EmployeeAvatarPicture({ profilePicture, size, employeeId }: EmployeeAvatarPictureProps) {
  return (
    <AvatarEditor
      name={`${profilePicture?.fileMetadata?.mimetype}`}
      value={profilePicture ? `data:image/gif;base64,${profilePicture}` : ''}
      size={size}
      disabled={true}
      key={`${employeeId}-Avatar`}
    />
  );
}
