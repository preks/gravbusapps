import React from 'react';
import { ReferenceData } from '../types';

interface StatusProgressionProps {
  currentStatus: string;
  statuses: ReferenceData[];
}

export const StatusProgression: React.FC<StatusProgressionProps> = ({ currentStatus, statuses }) => {
  const getCurrentStatusIndex = () => {
    const currentIndex = statuses.findIndex(status => 
      status.value.toLowerCase() === currentStatus.toLowerCase() || 
      status.code.toLowerCase() === currentStatus.toLowerCase()
    );
    return currentIndex >= 0 ? currentIndex : 0;
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
                cursor: 'pointer',
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
                justifyContent: 'center'
              }}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}; 