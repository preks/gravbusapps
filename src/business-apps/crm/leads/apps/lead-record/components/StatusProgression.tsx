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
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#f1f3f4',
        borderRadius: '8px',
        border: '1px solid #e8eaed'
      }}>
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const isClickable = !isCurrent && !isUpdating;

          return (
            <div
              key={status.id}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isClickable ? 'pointer' : isCurrent ? 'default' : 'not-allowed',
                transition: 'all 0.2s ease',
                backgroundColor: isCurrent 
                  ? '#1a73e8' 
                  : isCompleted 
                  ? '#34a853' 
                  : 'transparent',
                color: isCurrent || isCompleted ? 'white' : '#5f6368',
                border: isPending ? '1px dashed #dadce0' : 'none',
                position: 'relative',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isUpdating ? 0.6 : 1
              }}
              onClick={() => isClickable && handleStatusClick(status)}
              data-testid={`status-${status.code}`}
            >
              {/* Status icon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isCompleted && <span style={{ fontSize: '10px' }}>✓</span>}
                {isCurrent && <span style={{ fontSize: '10px' }}>●</span>}
                {isPending && <span style={{ fontSize: '10px', color: '#9aa0a6' }}>○</span>}
                <span style={{ 
                  fontSize: '11px',
                  lineHeight: '1.2',
                  fontWeight: isCurrent ? '600' : '500'
                }}>
                  {status.value}
                </span>
              </div>

              {/* Progress indicator */}
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#1a73e8',
                  borderRadius: '2px'
                }} />
              )}

              {/* Loading indicator */}
              {isUpdating && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #1a73e8',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}; 