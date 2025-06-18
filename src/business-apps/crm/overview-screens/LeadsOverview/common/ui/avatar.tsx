import React from 'react';
import { Avatar as AntAvatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '../../../../types';

interface AvatarProps extends React.ComponentProps<typeof AntAvatar> {
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ className, children, ...props }) => (
  <AntAvatar className={`gba:avatar ${className || ''}`} data-testid="avatar-component" {...props}>
    {children}
  </AntAvatar>
);

interface AvatarImageProps {
  src?: string;
  alt?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({ src, alt, ...props }) => (
  <img src={src} alt={alt || ''} data-testid="avatar-image" {...props} />
);

interface AvatarFallbackProps {
  children?: React.ReactNode;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, ...props }) => (
  <div className="gba:avatar-fallback" data-testid="avatar-fallback" {...props}>
    {children || <UserOutlined />}
  </div>
);
