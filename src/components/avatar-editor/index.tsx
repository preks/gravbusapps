import React from 'react'

export const AvatarEditor = ({
  image,
  onImageChange,
  className,
  ...props
}: {
  image?: string
  onImageChange?: (image: string) => void
  className?: string
}) => {
  return (
    <div className={`avatar-editor ${className}`} {...props} data-testid="avatar-editor-container">
      <div className="avatar-preview" data-testid="avatar-editor-preview">
        {image ? (
          <img src={image} alt="Avatar preview" data-testid="avatar-editor-image" />
        ) : (
          <div className="default-avatar" data-testid="avatar-editor-default">
            +
          </div>
        )}
      </div>
      <div className="controls" data-testid="avatar-editor-controls">
        <button onClick={() => onImageChange?.('mock-image-url')} data-testid="avatar-editor-upload-button">
          Upload
        </button>
        <button onClick={() => onImageChange?.('mock-image-url')} data-testid="avatar-editor-crop-button">
          Crop
        </button>
      </div>
    </div>
  )
}
