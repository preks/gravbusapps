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

  // Find the indices for key statuses
  const openIndex = statuses.findIndex(s => s.value.toLowerCase() === 'open');
  const convertedIndex = statuses.findIndex(s => s.value.toLowerCase() === 'converted');
  const lostIndex = statuses.findIndex(s => s.value.toLowerCase() === 'lost');

  // Determine current status
  const isOpen = currentIndex === openIndex;
  const isConverted = currentIndex === convertedIndex;
  const isLost = currentIndex === lostIndex;

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
        
        {/* OPEN Status - Always shown on the left */}
        {openIndex !== -1 && (
          <div
            style={{
              position: 'relative',
              height: '40px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: isOpen ? '#4CAF50' : 'transparent',
              color: isOpen ? 'white' : '#666666',
              borderRadius: '20px 0 0 20px',
              marginRight: '8px',
              transition: 'all 0.3s ease',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
              WebkitClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
              cursor: 'default'
            }}
            data-testid="status-open"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              paddingRight: '24px'
            }}>
              {isOpen && (
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
              <span style={{ whiteSpace: 'nowrap' }}>{statuses[openIndex].value}</span>
            </div>
          </div>
        )}

        {/* RIGHT SIDE - Conditional based on current status */}
        {isOpen ? (
          /* If Open: Show both Converted and Lost (not colored) */
          <div
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
              border: '1px solid #e0e0e0',
              overflow: 'hidden'
            }}
            data-testid="status-converted-lost-combined"
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
                backgroundColor: 'transparent',
                color: '#666666',
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
                backgroundColor: 'transparent',
                color: '#666666',
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
                <span style={{ fontSize: '13px' }}>Lost</span>
              </div>
            </div>
          </div>
        ) : (
          /* If Converted or Lost: Show only the active one (colored) */
          <div
            style={{
              position: 'relative',
              height: '40px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: isConverted ? '#4CAF50' : isLost ? '#f44336' : 'transparent',
              color: (isConverted || isLost) ? 'white' : '#666666',
              borderRadius: '0 20px 20px 0',
              marginRight: '0',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            data-testid={isConverted ? "status-converted" : "status-lost"}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px'
            }}>
              {(isConverted || isLost) && (
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
              <span style={{ whiteSpace: 'nowrap' }}>
                {isConverted ? statuses[convertedIndex].value : statuses[lostIndex].value}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 