import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { DashboardStats } from '../types';
import AiIcon from './AiIcon';

const { Text, Title } = Typography;

interface AiAssistantProps {
  stats?: DashboardStats;
  isLoading: boolean;
  navigateToExpenseItems: (filter: string) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ 
  stats, 
  isLoading, 
  navigateToExpenseItems 
}) => {
  // Count of expense items without receipts (assuming this data comes from stats)
  const itemsWithoutReceipts = stats?.expenseItemsWithoutReceipts || 0;
  
  // Always show the card with at least the travel policy
  // Only show loading state if completely loading
  if (isLoading) {
    return (
      <Card loading style={{ borderRadius: '8px' }} />
    );
  }
  
  const handleReceiptClick = () => {
    console.log('AiAssistant: handleReceiptClick called');
    
    // Only use React Router navigation via the provided callback
    console.log('AiAssistant: Calling navigateToExpenseItems with filter:', 'noreceiptfilter');
    
    // Make sure we call this function directly and don't wrap it in any try/catch
    // that might interfere with React Router's navigation
    navigateToExpenseItems('noreceiptfilter');
  };
  
  const handlePolicyClick = () => {
    window.open('/platform/intranet/4aeac8c7-2faa-4914-b3ba-80098afd82e2', '_blank');
  };
  
  return (
    <Card 
      style={{ borderRadius: '6px', marginBottom: '6px' }}
      title={
        <Space size={4}>
          <AiIcon size={20} />
          <Title level={5} style={{ margin: 0, fontSize: '13px', lineHeight: '16px' }}>Every AI Suggestions</Title>
        </Space>
      }
      styles={{ 
        body: { padding: '4px 8px' }, 
        header: { paddingTop: '6px', paddingBottom: '6px', paddingLeft: '12px', paddingRight: '12px' } 
      }}
    >
      <Space direction="vertical" size={2} style={{ width: '100%' }}>
        {/* Always show the missing receipts card, even with 0 items */}
        <Card 
          type="inner" 
          size="small" 
          hoverable 
          style={{ borderLeft: '3px solid #faad14', marginBottom: '2px' }}
          styles={{ body: { padding: '3px 6px' } }}
        >
          <div 
            onClick={() => {
              console.log('Card clicked, navigating...');
              handleReceiptClick();
            }}
            style={{ cursor: 'pointer' }}
          >
            <Space size={4} align="center">
              <UploadOutlined style={{ fontSize: '14px', color: '#faad14' }} />
              <Text style={{ fontSize: '13px', margin: 0 }}>
                You have {itemsWithoutReceipts} expense item{itemsWithoutReceipts > 1 ? 's' : ''} without a receipt.
                <Button 
                  type="link" 
                  size="small"
                  style={{ padding: '0 2px', fontSize: '13px', height: 'auto', marginLeft: '4px' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click event
                    handleReceiptClick();
                  }}
                >
                  Upload now
                </Button>
              </Text>
            </Space>
          </div>
        </Card>
        
        <Card 
          type="inner"
          size="small"
          hoverable
          onClick={handlePolicyClick}
          style={{ borderLeft: '3px solid #52c41a' }}
          styles={{ body: { padding: '3px 6px' } }}
        >
          <Space size={4}>
            <InfoCircleOutlined style={{ fontSize: '14px', color: '#52c41a' }} />
            <Text style={{ fontSize: '13px' }}>
              Remember to check the company travel policy before traveling.
              <Button type="link" style={{ padding: '0 2px', fontSize: '13px', height: 'auto' }}>View policy</Button>
            </Text>
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

export default AiAssistant;
