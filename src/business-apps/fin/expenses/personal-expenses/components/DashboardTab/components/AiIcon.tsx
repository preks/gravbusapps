import React from 'react';

interface AiIconProps {
  size?: number;
  style?: React.CSSProperties;
}

const AiIcon: React.FC<AiIconProps> = ({ size = 20, style = {} }) => {
  // Base64 encoded version of the colorful gradient sphere
  const base64Image = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxkZWZzPgogICAgICAgIDxyYWRpYWxHcmFkaWVudCBpZD0iZ3JhZCIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIj4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIgc3RvcC1vcGFjaXR5PSIwLjEiLz4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIzMCUiIHN0b3AtY29sb3I9IiM4M2E0ZDQiIHN0b3Atb3BhY2l0eT0iMC43Ii8+CiAgICAgICAgICAgIDxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjYzczNmZmIiBzdG9wLW9wYWNpdHk9IjAuOSIvPgogICAgICAgICAgICA8c3RvcCBvZmZzZXQ9IjgwJSIgc3RvcC1jb2xvcj0iI2ZmMzM3YyIgc3RvcC1vcGFjaXR5PSIwLjciLz4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIiBzdG9wLW9wYWNpdHk9IjAuMSIvPgogICAgICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0idXJsKCNncmFkKSIgLz4KPC9zdmc+`;

  return (
    <img 
      src={base64Image} 
      alt="AI Icon" 
      style={{ 
        width: size, 
        height: size,
        borderRadius: '50%',
        ...style 
      }} 
    />
  );
};

export default AiIcon;
