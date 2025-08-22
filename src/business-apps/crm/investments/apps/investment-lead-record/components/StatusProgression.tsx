import React, { useState } from 'react';
import { Modal } from 'antd';
import { ReferenceData } from '../types';
import { useUpdateLeadStatus } from '../hooks/useUpdateLeadStatus';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReferenceData | null>(null);
  
  const { updateStatus, isLoading } = useUpdateLeadStatus({ accessToken });

  const handleStatusClick = (status: ReferenceData) => {
    // Don't show modal if clicking on current status
    if (status.value.toLowerCase() === currentStatus.toLowerCase()) {
      return;
    }
    
    setSelectedStatus(status);
    setModalVisible(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedStatus) return;
    
    const statusRef = `InvestmentLeadStatus:v1:${selectedStatus.code}`;
    
    await updateStatus(
      leadId,
      leadVersion,
      statusRef,
      selectedStatus.value,
      () => {
        setModalVisible(false);
        setSelectedStatus(null);
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      }
    );
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setSelectedStatus(null);
  };
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
              cursor: isOpen ? 'default' : 'pointer'
            }}
            data-testid="status-open"
            onClick={() => !isOpen && handleStatusClick(statuses[openIndex])}
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
              overflow: 'hidden',
              clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
              WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
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
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              data-testid="status-converted"
              onClick={() => convertedIndex !== -1 && handleStatusClick(statuses[convertedIndex])}
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
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              data-testid="status-lost"
              onClick={() => lostIndex !== -1 && handleStatusClick(statuses[lostIndex])}
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
              cursor: 'pointer',
              clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
              WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
            }}
            data-testid={isConverted ? "status-converted" : "status-lost"}
            onClick={() => {
              // When clicking on an active status, show options to change to other statuses
              if (isConverted && openIndex !== -1) {
                handleStatusClick(statuses[openIndex]);
              } else if (isLost && openIndex !== -1) {
                handleStatusClick(statuses[openIndex]);
              }
            }}
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
      
      {/* Status Change Confirmation Modal */}
      <Modal
        title="Confirm Status Change"
        open={modalVisible}
        onOk={handleConfirmStatusChange}
        onCancel={handleCancelModal}
        confirmLoading={isLoading}
        okText="Confirm"
        cancelText="Cancel"
        okType="primary"
        data-testid="status-change-modal"
      >
        <p>
          Are you sure you want to change the lead status to{' '}
          <strong>{selectedStatus?.value}</strong>?
        </p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
          This action will update the lead's current status and may trigger additional workflows.
        </p>
      </Modal>
    </div>
  );
}; 