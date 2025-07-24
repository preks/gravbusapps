import React, { useCallback } from 'react';
import { Card, Button, CardContent } from '@newwork/nw-design-system';
import { PlusCircleOutlined, SendOutlined, ExperimentOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';

const QuickActionCards: React.FC<BusinessAppContextProps> = (props) => {
  const { userInfo } = props;

  const handleRecordExpense = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
      message.warning('User information not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting Record Expense process for employeeId:', employeeId);
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseItem',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    });
  }, [userInfo?.employeeDetails?.employeeId]);

  const handleSubmitRequest = useCallback(() => {
    const employeeId = userInfo?.employeeDetails?.employeeId;
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.');
      message.warning('User information not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    console.log('Starting Submit Request process for employeeId:', employeeId);
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: employeeId
      }
    });
  }, [userInfo?.employeeDetails?.employeeId]);

  const actionCards = [
    {
      id: 'record-expense',
      title: 'Record Expense',
      description: 'Quickly add a new expense to your records. Keep track of your spending efficiently.',
      icon: <PlusCircleOutlined className="gba:text-2xl gba:text-blue-500" />,
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
      icon: <SendOutlined className="gba:text-2xl gba:text-green-500" />,
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
      icon: <ExperimentOutlined className="gba:text-2xl gba:text-purple-500" />,
      features: [
        'View trends over time',
        'Export custom reports',
        'Analyze spending data'
      ],
      buttonText: 'View Reports',
      buttonIcon: <ExperimentOutlined />,
      buttonAction: () => console.log('View reports clicked')
    }
  ];

  return (
    <div className="gba:grid gba:grid-cols-3 gba:gap-4">
      {actionCards.map(card => (
        <Card 
          key={card.id} 
          className="gba:quick-action-card gba:h-full gba:transition-all gba:duration-200 hover:gba:shadow-lg"
          data-testid={`quick-action-card-${card.id}`}
        >
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:flex-col gba:h-full gba:space-y-4">
              <div className="gba:flex gba:items-center gba:space-x-3">
                {card.icon}
                <h3 className="gba:text-lg gba:font-semibold gba:m-0" data-testid={`card-title-${card.id}`}>
                  {card.title}
                </h3>
              </div>
              
              <p className="gba:text-sm gba:text-gray-600 gba:min-h-[60px] gba:flex-1" data-testid={`card-description-${card.id}`}>
                {card.description}
              </p>
              
              <div className="gba:space-y-1" data-testid={`card-features-${card.id}`}>
                {card.features.map((feature, index) => (
                  <div key={index} className="gba:text-sm gba:flex gba:items-center">
                    <span className="gba:mr-2">-</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="default"
                className="gba:w-full gba:mt-auto" 
                onClick={card.buttonAction}
                data-testid={`action-button-${card.id}`}
              >
                <span className="gba:flex gba:items-center gba:justify-center gba:space-x-2">
                  {card.buttonIcon}
                  <span>{card.buttonText}</span>
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickActionCards;
