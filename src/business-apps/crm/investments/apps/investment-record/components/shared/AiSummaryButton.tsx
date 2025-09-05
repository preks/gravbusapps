import React, { useState } from 'react';
import { Button } from '@newwork/nw-design-system';
import { RobotOutlined } from '@ant-design/icons';
import { Tooltip, Spin } from 'antd';
import { useInvestmentAiSummary } from '../../hooks/useInvestmentAiSummary';

interface AiSummaryButtonProps {
  investmentId: string;
  accessToken: string;
}

export const AiSummaryButton: React.FC<AiSummaryButtonProps> = ({ investmentId, accessToken }) => {
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const { generateSummary, state: aiSummaryState } = useInvestmentAiSummary(investmentId, accessToken);

  // Handle AI Summary button click - auto-generate and show tooltip
  const handleAiSummaryClick = () => {
    setAiSummaryVisible(true);
    if (!aiSummaryState || aiSummaryState.type === 'idle') {
      generateSummary();
    }
  };

  // Create tooltip content for AI Summary
  const renderAiSummaryTooltip = () => {
    if (aiSummaryState?.type === 'loading') {
      return (
        <div style={{ width: '380px', padding: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
              Generating AI Summary...
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
              Analyzing investment data and activities
            </div>
          </div>
        </div>
      );
    }

    if (aiSummaryState?.type === 'error') {
      return (
        <div style={{ width: '320px', padding: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#dc2626', marginBottom: '12px' }}>
              Unable to generate AI summary
            </div>
            <Button 
              size="small" 
              onClick={() => generateSummary()}
              style={{ fontSize: '12px' }}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (aiSummaryState?.type === 'success' && aiSummaryState.content) {
      return (
        <div style={{ width: '600px', padding: '20px' }}>
          {/* Executive Summary */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📊 Executive Summary
            </div>
            <div style={{ 
              fontSize: '13px', 
              lineHeight: '1.6', 
              color: '#334155',
              whiteSpace: 'pre-wrap'
            }}>
              {aiSummaryState.content.summary}
            </div>
          </div>

          {/* Key Insights */}
          {aiSummaryState.content.keyInsights && aiSummaryState.content.keyInsights.length > 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fde68a',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 Key Insights & Next Steps
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.5' }}>
                {aiSummaryState.content.keyInsights.map((insight, index) => (
                  <li key={index} style={{ 
                    marginBottom: '8px', 
                    color: '#a16207'
                  }}>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div style={{ textAlign: 'center' }}>
            <Button 
              size="small" 
              onClick={() => generateSummary()}
              style={{ fontSize: '12px', padding: '6px 16px' }}
            >
              🔄 Regenerate
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: '320px', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '8px' }}>
          🤖 AI Investment Summary
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
          Click to generate intelligent insights about this investment's performance and next steps
        </div>
      </div>
    );
  };

  return (
    <Tooltip
      title={renderAiSummaryTooltip()}
      open={aiSummaryVisible}
      onOpenChange={setAiSummaryVisible}
      placement="bottomRight"
      trigger="click"
      styles={{
        root: {
          maxWidth: 'none',
          zIndex: 1050
        },
        body: {
          padding: 0,
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
      }}
    >
      <Button
        onClick={handleAiSummaryClick}
        disabled={aiSummaryState?.type === 'loading'}
        data-testid="ai-summary-button"
        style={{
          background: aiSummaryState?.type === 'loading' 
            ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderColor: 'transparent',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease',
          fontSize: '14px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 16px'
        }}
      >
        <RobotOutlined style={{ fontSize: '16px' }} />
        {aiSummaryState?.type === 'loading' ? 'Generating...' : 'AI Summary'}
      </Button>
    </Tooltip>
  );
};
