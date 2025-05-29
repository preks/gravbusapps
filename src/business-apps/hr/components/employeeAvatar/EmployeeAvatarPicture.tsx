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
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full overflow-hidden [&_.controls]:hidden flex items-center justify-center">
        {profilePicture ? (
          <img 
            src={`data:image/gif;base64,${profilePicture}`} 
            alt="Profile"
            className="w-full h-full object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              objectFit: 'cover',
              objectPosition: 'center center'
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
