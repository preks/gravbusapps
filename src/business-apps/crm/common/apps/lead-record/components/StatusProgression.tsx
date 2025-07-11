import React from 'react';
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
  statuses
}) => {
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

  // Find the indices for converted and lost
  const convertedIndex = statuses.findIndex(s => s.value.toLowerCase() === 'converted');
  const lostIndex = statuses.findIndex(s => s.value.toLowerCase() === 'lost');

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
          // Skip rendering converted and lost individually, we'll handle them together
          if ((index === convertedIndex || index === lostIndex) && convertedIndex !== -1 && lostIndex !== -1) {
            // Only render the combined pill for the first of the two (converted)
            if (index === convertedIndex) {
              const isConvertedActive = currentIndex === convertedIndex;
              const isLostActive = currentIndex === lostIndex;
              const isEitherActive = isConvertedActive || isLostActive;
              
              return (
                <div
                  key="converted-lost-combined"
                  style={{
                    position: 'relative',
                    height: '40px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '0 20px 20px 0',
                    marginRight: '0',
                    transition: 'all 0.3s ease',
                    zIndex: 1,
                    cursor: 'default',
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                  }}
                  data-testid="status-converted-lost"
                >
                  {/* CONVERTED Section */}
                  <div
                    style={{
                      height: '38px',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: isConvertedActive ? '#4CAF50' : 'transparent',
                      color: isConvertedActive ? 'white' : '#666666',
                      transition: 'all 0.3s ease'
                    }}
                    data-testid="status-converted"
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 12px'
                    }}>
                      {isConvertedActive && (
                        <span style={{ 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ✓
                        </span>
                      )}
                      <span style={{ fontSize: '13px' }}>Converted</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: '1px',
                    height: '24px',
                    backgroundColor: '#e0e0e0'
                  }} />

                  {/* LOST Section */}
                  <div
                    style={{
                      height: '38px',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      backgroundColor: isLostActive ? '#f44336' : 'transparent',
                      color: isLostActive ? 'white' : '#666666',
                      transition: 'all 0.3s ease'
                    }}
                    data-testid="status-lost"
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 12px'
                    }}>
                      {isLostActive && (
                        <span style={{ 
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ✓
                        </span>
                      )}
                      <span style={{ fontSize: '13px' }}>Lost</span>
                    </div>
                  </div>
                </div>
              );
            }
            // Skip rendering the second one (lost)
            return null;
          }

          // Regular status rendering for non-converted/lost statuses
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
                WebkitClipPath: clipPath,
                cursor: 'default'
              }}
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