import React, { useState } from 'react';
import { message } from 'antd';
import { env } from '@/common/env/EnvUtils';
import { ReferenceData } from '../types';

interface StatusProgressionProps {
  currentStatus: string;
  statuses: ReferenceData[];
  leadId: string;
  leadVersion: number;
  accessToken: string;
  onStatusUpdate?: () => void;
}

export const StatusProgression: React.FC<StatusProgressionProps> = ({ 
  currentStatus, 
  statuses, 
  leadId, 
  leadVersion, 
  accessToken, 
  onStatusUpdate 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const getCurrentStatusIndex = () => {
    const currentIndex = statuses.findIndex(status => 
      status.value.toLowerCase() === currentStatus.toLowerCase() || 
      status.code.toLowerCase() === currentStatus.toLowerCase()
    );
    return currentIndex >= 0 ? currentIndex : 0;
  };

  const handleStatusClick = async (status: ReferenceData) => {
    // Don't allow clicking on the current status
    const currentIndex = getCurrentStatusIndex();
    const clickedIndex = statuses.findIndex(s => s.id === status.id);
    
    if (clickedIndex === currentIndex) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const payload = {
        "changeMode": "UPDATE",
        "lead": {
          "version": leadVersion,
          "id": leadId,
          "leadStatusRef": `SalesLeadStatus:v1:${status.code}`
        }
      };

      const response = await fetch(`${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveLead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        message.success(`Lead status updated to ${status.value}`);
        // Call the callback to refresh data
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        const errorData = await response.text();
        console.error('Failed to update lead status:', errorData);
        message.error('Failed to update lead status');
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      message.error('Error updating lead status');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentIndex = getCurrentStatusIndex();

  if (statuses.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        backgroundColor: '#f5f5f5',
        borderRadius: '24px',
        overflow: 'visible',
        border: '1px solid #e0e0e0',
        padding: '0 4px'
      }}>
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === statuses.length - 1;
          const isFirst = index === 0;

          // Calculate colors
          const backgroundColor = isCompleted ? '#4CAF50' : isCurrent ? '#2196F3' : 'transparent';
          const textColor = (isCompleted || isCurrent) ? 'white' : '#666666';

          // Create clip-path for arrow shape (except last item)
          const clipPath = isLast 
            ? 'none' 
            : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';

          // Border radius: first item gets left rounded, last item gets right rounded, middle items are square
          const borderRadius = isFirst && isLast 
            ? '20px' 
            : isFirst 
              ? '20px 0 0 20px' 
              : isLast 
                ? '0 20px 20px 0' 
                : '0';

          return (
            <div
              key={status.id}
              style={{
                position: 'relative',
                height: '40px',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: textColor,
                backgroundColor: backgroundColor,
                borderRadius: borderRadius,
                marginRight: isLast ? '0' : '8px',
                transition: 'all 0.3s ease',
                zIndex: isCompleted || isCurrent ? 2 : 1,
                clipPath: clipPath,
                WebkitClipPath: clipPath
              }}
              onClick={() => handleStatusClick(status)}
              data-testid={`status-${status.code}`}
            >
              {/* Content */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                paddingRight: isLast ? '16px' : '24px'
              }}>
                {isCompleted && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    ✓
                  </span>
                )}
                <span style={{ whiteSpace: 'nowrap' }}>{status.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 