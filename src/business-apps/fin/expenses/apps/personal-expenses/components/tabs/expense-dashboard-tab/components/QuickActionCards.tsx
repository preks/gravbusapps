import React, { useCallback } from 'react';
import { Row, Col, Card, Typography, Button, List, Space } from 'antd';
import { PlusCircleOutlined, SendOutlined, ExperimentOutlined, UploadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';

const { Title, Text, Paragraph } = Typography;

const QuickActionCards: React.FC<BusinessAppContextProps> = (props) => {
  const { userInfo } = props;

  const handleRecordExpense = useCallback(() => {
    if (userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseItem',
        payload: {
          employeeId: userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [userInfo?.employeeDetails?.employeeId]);

  const handleSubmitRequest = useCallback(() => {
    if (userInfo?.employeeDetails?.employeeId) {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseRequest',
        payload: {
          employeeId: userInfo.employeeDetails.employeeId
        }
      });
    }
  }, [userInfo?.employeeDetails?.employeeId]);

  const actionCards = [
    {
      id: 'record-expense',
      title: 'Record Expense',
      description: 'Quickly add a new expense to your records. Keep track of your spending efficiently.',
      icon: <PlusCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      features: [
        'Single or multiple items',
        'Attach receipts easily',
        'Categorize for clarity'
      ],
      buttonText: 'New Expense',
      buttonIcon: <PlusCircleOutlined />,
      buttonAction: handleRecordExpense
    },
    {
      id: 'submit-request',
      title: 'Submit Request',
      description: 'Submit your expense reports for reimbursement and manage your trip requests efficiently.',
      icon: <SendOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      features: [
        'Create expense report',
        'Request trip approval',
        'Track submission status'
      ],
      buttonText: 'New Request',
      buttonIcon: <SendOutlined />,
      buttonAction: handleSubmitRequest
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Access and review your expense reports and analytics to track your spending patterns.',
      icon: <ExperimentOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      features: [
        'View trends over time',
        'Export custom reports',
        'Analyze spending data'
      ],
      buttonText: 'View Reports',
      buttonIcon: <ExperimentOutlined />,
      buttonAction: () => console.log('View reports clicked')
    },
    // {
    //   id: 'upload-receipts',
    //   title: 'Upload Receipts',
    //   description: 'Quickly upload receipts for your expense items. Supports multiple file formats.',
    //   icon: <UploadOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
    //   features: [
    //     'Batch upload',
    //     'Auto-categorization',
    //     'Comply with policies'
    //   ],
    //   buttonText: 'Upload Receipts',
    //   buttonIcon: <UploadOutlined />,
    //   buttonAction: () => console.log('Upload receipts clicked')
    // }
  ];

  return (
    <Row gutter={[16, 16]}>
      {actionCards.map(card => (
                <Col key={card.id} xs={24} sm={12} md={8} lg={8}>
          <Card hoverable className="gba:quick-action-card">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center">
                {card.icon}
                <Title level={5} style={{ marginBottom: 0 }}>{card.title}</Title>
              </Space>
              <Paragraph type="secondary" style={{ minHeight: '60px' }}>
                {card.description}
              </Paragraph>
              <List size="small" bordered={false} className="gba:quick-action-list">
                {card.features.map((feature, index) => (
                  <List.Item key={index} style={{borderBlockEnd: 'none', padding: '4px 0'}}>
                    <Text>- {feature}</Text>
                  </List.Item>
                ))}
              </List>
              <Button 
                type="primary" 
                icon={card.buttonIcon} 
                onClick={card.buttonAction} 
                block
              >
                {card.buttonText}
              </Button>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default QuickActionCards;
