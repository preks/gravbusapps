import React, { useState } from 'react';
import { Button, Steps, Card, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ReferenceData } from '../types';

interface StageProgressionProps {
  currentStage: string;
  stages: ReferenceData[];
  opportunityId: string;
  opportunityVersion: number;
  accessToken: string;
  onStageUpdate: () => void;
}

export const StageProgression: React.FC<StageProgressionProps> = ({
  currentStage,
  stages,
  opportunityId,
  opportunityVersion,
  accessToken,
  onStageUpdate
}) => {
  const [updating, setUpdating] = useState(false);

  const handleStageUpdate = async (newStage: string) => {
    try {
      setUpdating(true);
      
      // TODO: Implement stage update API call
      // This would typically involve a GraphQL mutation or REST API call
      console.log('Updating opportunity stage:', {
        opportunityId,
        currentStage,
        newStage,
        opportunityVersion
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success(`Stage updated to ${newStage}`);
      onStageUpdate();
    } catch (error) {
      message.error('Failed to update stage');
      console.error('Error updating stage:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Discovery': '#1890ff',
      'Qualification': '#52c41a',
      'Proposal': '#faad14',
      'Negotiation': '#f5222d',
      'Closed Won': '#52c41a',
      'Closed Lost': '#8c8c8c'
    };
    return stageColors[stage] || '#1890ff';
  };

  const getStageIcon = (stage: string, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.value === currentStage);
  };

  const getStageItems = () => {
    const currentIndex = getCurrentStageIndex();
    
    return stages.map((stage, index) => ({
      title: stage.value,
      status: (index < currentIndex ? 'finish' : 
              index === currentIndex ? 'process' : 'wait') as 'finish' | 'process' | 'wait',
      icon: getStageIcon(stage.value, index < currentIndex),
      description: index === currentIndex ? 'Current Stage' : 
                   index < currentIndex ? 'Completed' : 'Pending'
    }));
  };

  const getNextStage = () => {
    const currentIndex = getCurrentStageIndex();
    if (currentIndex < stages.length - 1) {
      return stages[currentIndex + 1];
    }
    return null;
  };

  const getPreviousStage = () => {
    const currentIndex = getCurrentStageIndex();
    if (currentIndex > 0) {
      return stages[currentIndex - 1];
    }
    return null;
  };

  const nextStage = getNextStage();
  const previousStage = getPreviousStage();

  return (
    <Card
      title="Opportunity Stage Progression"
      style={{ marginBottom: '24px' }}
      data-testid="stage-progression-card"
    >
      <div style={{ marginBottom: '24px' }}>
        <Steps
          current={getCurrentStageIndex()}
          items={getStageItems()}
          style={{ marginBottom: '24px' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Current Stage:
          </span>
          <span 
            style={{ 
              color: getStageColor(currentStage),
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            {currentStage}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {previousStage && (
            <Button
              type="default"
              size="small"
              loading={updating}
              onClick={() => handleStageUpdate(previousStage.value)}
              data-testid="previous-stage-button"
            >
              ← {previousStage.value}
            </Button>
          )}
          
          {nextStage && (
            <Button
              type="primary"
              size="small"
              loading={updating}
              onClick={() => handleStageUpdate(nextStage.value)}
              data-testid="next-stage-button"
            >
              {nextStage.value} →
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}; 