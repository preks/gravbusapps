import React from 'react';

export const AvatarEditor = ({
  image,
  onImageChange,
  className,
  ...props
}: {
  image?: string;
  onImageChange?: (image: string) => void;
  className?: string;
}) => {
  return (
    <div className={`avatar-editor ${className}`} {...props}>
      <div className="avatar-preview">
        {image ? (
          <img src={image} alt="Avatar preview" />
        ) : (
          <div className="default-avatar">+</div>
        )}
      </div>
      <div className="controls">
        <button onClick={() => onImageChange?.('mock-image-url')}>Upload</button>
        <button onClick={() => onImageChange?.('mock-image-url')}>Crop</button>
      </div>
    </div>
  );
};
