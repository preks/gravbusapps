import React from 'react';
import { Badge, Button } from '@newwork/nw-design-system';
import { FileIcon, DownloadIcon } from '@phosphor-icons/react';
import { formatDate, formatDateTime, formatTime } from '../../config/dateTimeConfig';

export interface Step0DataRendererProps {
  /** The step_0 data object containing formData */
  stepData: any;
  /** Optional theme configuration for styling */
  theme?: {
    /** Container background color class */
    containerBg?: string;
    /** Container border color class */
    containerBorder?: string;
    /** Field label color class */
    labelColor?: string;
    /** Field value color class */
    valueColor?: string;
    /** File badge colors */
    fileBadge?: {
      bg?: string;
      text?: string;
      border?: string;
    };
    /** Array badge colors */
    arrayBadge?: {
      bg?: string;
      text?: string;
      border?: string;
    };
    /** File container colors */
    fileContainer?: {
      bg?: string;
      border?: string;
    };
  };
  /** Optional data test ID prefix */
  testIdPrefix?: string;
}

/**
 * Reusable component for rendering step_0 form data fields
 * Provides consistent field rendering logic while allowing flexible wrapper styling
 */
export const Step0DataRenderer: React.FC<Step0DataRendererProps> = ({
  stepData,
  theme = {},
  testIdPrefix = 'step0-field'
}) => {
  // Default theme values
  const defaultTheme = {
    containerBg: 'gba:bg-blue-50',
    containerBorder: 'gba:border-blue-200',
    labelColor: 'gba:text-blue-800',
    valueColor: 'gba:text-blue-700',
    fileBadge: {
      bg: 'gba:bg-indigo-100',
      text: 'gba:text-indigo-700',
      border: 'gba:border-indigo-300'
    },
    arrayBadge: {
      bg: 'gba:bg-blue-100',
      text: 'gba:text-blue-700',
      border: 'gba:border-blue-300'
    },
    fileContainer: {
      bg: 'gba:bg-blue-100',
      border: 'gba:border-blue-300'
    }
  };

  // Merge theme with defaults
  const finalTheme = {
    ...defaultTheme,
    ...theme,
    fileBadge: { ...defaultTheme.fileBadge, ...theme.fileBadge },
    arrayBadge: { ...defaultTheme.arrayBadge, ...theme.arrayBadge },
    fileContainer: { ...defaultTheme.fileContainer, ...theme.fileContainer }
  };

  // Enhanced field value formatter with proper data type handling
  const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'Not provided';
    
    const keyLower = key.toLowerCase();
    
    // Boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Array values
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      if (value.length === 1) return value[0].toString();
      return value.join(', ');
    }
    
    // Object values
    if (typeof value === 'object') {
      // Handle common object structures
      if (value.name) return value.name;
      if (value.label) return value.label;
      if (value.title) return value.title;
      if (value.value) return value.value;
      
      // For complex objects, show key-value pairs
      const entries = Object.entries(value);
      if (entries.length <= 3) {
        return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
      }
      return JSON.stringify(value, null, 2);
    }
    
    const valueStr = value.toString();
    
    // Date formatting
    if (keyLower.includes('date') || keyLower.includes('time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (keyLower.includes('time') && !keyLower.includes('date')) {
            return formatTime(value);
          }
          return keyLower.includes('date') && keyLower.includes('time') 
            ? formatDateTime(value) 
            : formatDate(value);
        }
      } catch {
        // Fall through to return original value
      }
    }
    
    // Number formatting
    if (typeof value === 'number') {
      if (keyLower.includes('amount') || keyLower.includes('cost') || keyLower.includes('price')) {
        return new Intl.NumberFormat('de-DE', { 
          style: 'currency', 
          currency: 'EUR' 
        }).format(value);
      }
      if (keyLower.includes('percent')) {
        return `${value}%`;
      }
      return value.toLocaleString('de-DE');
    }
    
    // Email formatting
    if (keyLower.includes('email') && valueStr.includes('@')) {
      return valueStr.toLowerCase();
    }
    
    // Phone number formatting
    if (keyLower.includes('phone') || keyLower.includes('tel')) {
      return valueStr.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    // URL formatting
    if (keyLower.includes('url') || keyLower.includes('link')) {
      return valueStr.startsWith('http') ? valueStr : `https://${valueStr}`;
    }
    
    return valueStr;
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Get form data from step data
  const formData = stepData?.formData || {};
  
  // Filter out internal/system fields and empty values
  const filteredData = Object.entries(formData).filter(([key, value]) => {
    // Skip internal system fields
    if (key.includes('stepAssignment') || 
        key.includes('_assignmentMode') || 
        key.includes('_allowReassignment') ||
        key.startsWith('__') ||
        key.includes('internal_') ||
        key.includes('assignment') ||
        key.includes('assignee') ||
        key.includes('assign_')) {
      return false;
    }
    
    // Skip empty values
    if (value === null || value === undefined || value === '') {
      return false;
    }
    
    // Skip empty arrays and objects
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false;
    }
    
    return true;
  });

  // Helper function to render form data values properly
  const renderValue = (key: string, value: any) => {
    // Handle file upload results specially
    if (key.endsWith('_uploadResults')) {
      // Normalize to array - handle both single file objects and arrays
      const fileResults = Array.isArray(value) ? value : [value];
      
      return (
        <div className="gba:space-y-2">
          {fileResults.map((fileResult: any, index: number) => (
            <div 
              key={index} 
              className={`gba:p-3 gba:rounded gba:border ${finalTheme.fileContainer.bg} ${finalTheme.fileContainer.border}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <Badge 
                  variant="outline" 
                  className={`gba:text-xs gba:flex gba:items-center gba:gap-1 ${finalTheme.fileBadge.bg} ${finalTheme.fileBadge.text} ${finalTheme.fileBadge.border}`}
                >
                  <FileIcon size={12} />
                  File
                </Badge>
                <span className={`gba:font-medium ${finalTheme.labelColor}`}>
                  {fileResult.fileName || fileResult.summary || 'Uploaded File'}
                </span>
              </div>
              <div className={`gba:text-xs gba:space-y-1 ${finalTheme.valueColor}`}>
                {fileResult.fileId && (
                  <div><strong>ID:</strong> {fileResult.fileId}</div>
                )}
                {fileResult.mimeType && (
                  <div><strong>Type:</strong> {fileResult.mimeType}</div>
                )}
                {fileResult.uploadTimestamp && (
                  <div><strong>Uploaded:</strong> {formatDateTime(fileResult.uploadTimestamp)}</div>
                )}
                {fileResult.downloadPath && (
                  <div className="gba:mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`https://newwork-dev.newwork.com/files${fileResult.downloadPath}`, '_blank')}
                      className="gba:text-xs gba:h-6 gba:flex gba:items-center gba:gap-1"
                    >
                      <DownloadIcon size={12} />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Handle regular arrays
    if (Array.isArray(value)) {
      return (
        <div className="gba:flex gba:flex-wrap gba:gap-1">
          {value.map((item, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className={`gba:text-xs ${finalTheme.arrayBadge.bg} ${finalTheme.arrayBadge.text} ${finalTheme.arrayBadge.border}`}
            >
              {typeof item === 'object' && item !== null ? 
                (item.name || item.label || item.value || JSON.stringify(item)) : 
                String(item)
              }
            </Badge>
          ))}
        </div>
      );
    }
    
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className={`gba:text-xs gba:p-2 gba:rounded gba:overflow-x-auto ${finalTheme.arrayBadge.bg}`}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    // Handle primitive values
    return <span className="gba:break-words">{formatFieldValue(key, value)}</span>;
  };

  if (filteredData.length === 0) {
    return (
      <div className="gba:text-center gba:py-4 gba:text-gray-500">
        <p>No form data available</p>
      </div>
    );
  }

  return (
    <div className={`gba:rounded-lg gba:p-4 gba:border ${finalTheme.containerBg} ${finalTheme.containerBorder}`}>
      <div className="gba:space-y-3">
        {filteredData.map(([key, value]) => (
          <div 
            key={key} 
            className="gba:flex gba:flex-col gba:gap-1"
            data-testid={`${testIdPrefix}-${key}`}
          >
            <div className={`gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide ${finalTheme.labelColor}`}>
              {formatFieldLabel(key)}
            </div>
            <div className={`gba:text-sm ${finalTheme.valueColor}`}>
              {renderValue(key, value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Step0DataRenderer;
