import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Tag,
  Button,
  Timeline,
  Tabs,
  Spin,
  Alert,
  Typography,
  Descriptions,
  Progress,
  Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TrophyOutlined,
  PercentageOutlined,
  BankOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import './styles/OpportunityDetail.css';
import dayjs from 'dayjs';
import { getOpportunityByIdQuery } from './queries';
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/business-apps/types";

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Currency {
  id: string;
  value: string;
  code: string;
}

interface SalesPipeline {
  id: string;
  value: string;
  code: string;
}

interface SalesPipelineStage {
  id: string;
  value: string;
  code: string;
}

interface OwnerEmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

interface Account {
  id: string;
  name: string;
  website: string;
  industry?: {
    value: string;
  };
}

interface Activity {
  title: string;
  date: string;
  description: string;
  type: string;
}

interface OpportunityData {
  id: string;
  version: number;
  name: string;
  estimatedAmount: number;
  winningChance: number;
  currencyRef: string;
  currency: Currency;
  account: Account;
  accountId: string;
  salesPipeline: SalesPipeline;
  salesPipelineStage: SalesPipelineStage;
  ownerEmployee: OwnerEmployee;
  createdAt: string;
  updatedAt: string;
  expectedClosingDate?: string;
  priority?: string;
  source?: string;
  notesSummary: string;
  activityTimeline: Activity[];
}

interface OpportunityDetailProps extends BusinessAppContextProps {
  opportunityId: string;
  onBack?: () => void;
}

const emptyOpportunityData: OpportunityData = {
  id: '',
  version: 0,
  name: '',
  notesSummary: '',
  estimatedAmount: 0,
  winningChance: 0,
  currencyRef: '',
  currency: {
    id: '',
    value: '',
    code: ''
  },
  account: {
    id: '',
    name: '',
    website: '',
    industry: {
      value: ''
    }
  },
  accountId: '',
  salesPipeline: {
    id: '',
    value: '',
    code: ''
  },
  salesPipelineStage: {
    id: '',
    value: '',
    code: ''
  },
  ownerEmployee: {
    id: '',
    firstName: '',
    lastName: '',
    displayName: ''
  },
  createdAt: '',
  updatedAt: '',
  expectedClosingDate: '',
  priority: '',
  source: '',
  activityTimeline: []
};

const OpportunityDetail: React.FC<OpportunityDetailProps> = ({ opportunityId, onBack, accessToken }) => {
  // Removed isEditing state since we're not implementing edit functionality yet
  const [loading, setLoading] = useState<boolean>(!!opportunityId);
  const [error, setError] = useState<string | null>(null);
  const [opportunityData, setOpportunityData] = useState<OpportunityData>(emptyOpportunityData);
  
  const graphQLClient = useGraphqlClient(accessToken);
  
  useEffect(() => {
    if (opportunityId) {
      fetchOpportunityById();
    }
  }, [opportunityId]);
  
  const fetchOpportunityById = async () => {
    if (!opportunityId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await graphQLClient.request(
        getOpportunityByIdQuery,
        { id: opportunityId }
      );
      
      if (result?.Opportunity && result.Opportunity[0]) {
        const apiData = result.Opportunity[0];
        
        const transformedData: OpportunityData = {
          id: apiData.id || '',
          version: apiData.version || 0,
          name: apiData.name || '',
          notesSummary: apiData.notesSummary || '',
          estimatedAmount: apiData.estimatedAmount || 0,
          winningChance: apiData.winningChance || 0,
          currencyRef: apiData.currencyRef || '',
          currency: apiData.currency || { id: '', value: '', code: '' },
          account: apiData.account || { id: '', name: '', website: '', industry: { value: '' } },
          accountId: apiData.accountId || '',
          salesPipeline: apiData.salesPipeline || { id: '', value: '', code: '' },
          salesPipelineStage: apiData.salesPipelineStage || { id: '', value: '', code: '' },
          ownerEmployee: apiData.ownerEmployee || { id: '', firstName: '', lastName: '', displayName: '' },
          createdAt: apiData.createdAt || '',
          updatedAt: apiData.updatedAt || '',
          expectedClosingDate: apiData.expectedClosingDate,
          priority: apiData.priority,
          source: apiData.source,
          activityTimeline: []
        };
        
        setOpportunityData(transformedData);
      } else {
        setError('Opportunity not found');
      }
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError('Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      // Fallback to browser history if no onBack handler provided
      window.history.back();
    }
  };
  
  const handleEdit = () => {
    // Edit functionality will be implemented later
    console.log('Edit opportunity:', opportunityId);
  };
  
  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Lead': 'blue',
      'Opportunity': 'purple',
      'Quote': 'orange',
      'Negotiation': 'geekblue',
      'Closed Won': 'green',
      'Closed Lost': 'red'
    };
    
    return stageColors[stage] || 'default';
  };
  
  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD'
    }).format(amount);
  };
  
  // Helper function to format date strings
  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return dayjs(dateStr).format('MMMM D, YYYY');
    } catch (err) {
      return dateStr || 'N/A';
    }
  };
  
  if (loading) {
    return (
      <div className="gba:opportunity-detail-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Spin size="large" tip="Loading opportunity details..." />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="gba:opportunity-detail-container">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={handleBack}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }
  
  return (
    <div className="gba:opportunity-detail-container" data-testid="opportunity-detail">
      {/* Header */}
      <div className="gba:header">
        <div className="gba:header-title">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            data-testid="back-button"
          />
          <Title level={3}>{opportunityData.name}</Title>
          <Tag color={getStageColor(opportunityData.salesPipelineStage?.value || '')} className="gba:stage-tag">
            {opportunityData.salesPipelineStage?.value || 'No Stage'}
          </Tag>
        </div>
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          onClick={handleEdit}
          data-testid="edit-opportunity"
        >
          Edit
        </Button>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Main Information Card */}
          <Card className="gba:card-container" data-testid="opportunity-info-card">
            <div className="gba:section-title">
              <DollarOutlined /> Opportunity Overview
            </div>
            
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Deal Value">
                <div className="gba:amount-display">
                  <DollarOutlined />
                  {formatCurrency(opportunityData.estimatedAmount, opportunityData.currency?.code)}
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Winning Chance">
                <div className="gba:amount-display">
                  <PercentageOutlined />
                  <Progress 
                    percent={opportunityData.winningChance} 
                    size="small" 
                    status={opportunityData.winningChance > 50 ? "success" : "normal"}
                    style={{ width: 120 }}
                  />
                </div>
              </Descriptions.Item>
              
              <Descriptions.Item label="Expected Close Date">
                <ClockCircleOutlined /> {formatDateString(opportunityData.expectedClosingDate)}
              </Descriptions.Item>
              
              <Descriptions.Item label="Account">
                <BankOutlined /> {opportunityData.account?.name || 'N/A'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Sales Pipeline">
                <TrophyOutlined /> {opportunityData.salesPipeline?.value || 'N/A'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Notes" span={3}>
                {opportunityData.notesSummary || "No notes available"}
              </Descriptions.Item>
              
              <Descriptions.Item label="Source">
                {opportunityData.source || 'N/A'}
              </Descriptions.Item>
              
              <Descriptions.Item label="Owner">
                <UserOutlined /> {opportunityData.ownerEmployee?.displayName || 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          
          {/* Description Card */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }} data-testid="opportunity-description-card">
            <div className="gba:section-title">
              <InfoCircleOutlined /> Description
            </div>
            <Paragraph>
              {opportunityData.notesSummary || 'No notes available'}
            </Paragraph>
          </Card>
          
          {/* Notes Card */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }} data-testid="opportunity-notes-card">
            <div className="gba:section-title">
              <FileTextOutlined /> Notes
            </div>
            <Paragraph>
              {opportunityData.notesSummary || 'No notes available'}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          {/* Account Information */}
          <Card className="gba:card-container" data-testid="opportunity-account-card">
            <div className="gba:section-title">
              <BankOutlined /> Account Information
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Name</div>
              <div className="gba:opportunity-info-value">{opportunityData.account?.name || 'N/A'}</div>
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Website</div>
              <div className="gba:opportunity-info-value">
                {opportunityData.account?.website ? (
                  <a href={opportunityData.account.website} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined /> {opportunityData.account.website}
                  </a>
                ) : 'N/A'}
              </div>
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Industry</div>
              <div className="gba:opportunity-info-value">{opportunityData.account?.industry?.value || 'N/A'}</div>
            </div>
          </Card>
          
          {/* Dates Information */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }} data-testid="opportunity-dates-card">
            <div className="gba:section-title">
              <CalendarOutlined /> Timeline
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Created</div>
              <div className="gba:opportunity-info-value">{formatDateString(opportunityData.createdAt)}</div>
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Last Updated</div>
              <div className="gba:opportunity-info-value">{formatDateString(opportunityData.updatedAt)}</div>
            </div>
            
            <div className="gba:opportunity-info-item">
              <div className="gba:opportunity-info-label">Expected Closing</div>
              <div className="gba:opportunity-info-value">{formatDateString(opportunityData.expectedClosingDate)}</div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* Activity Timeline */}
      <Card className="gba:card-container" style={{ marginTop: '24px' }} data-testid="opportunity-activity-card">
        <div className="gba:section-header">
          <div className="gba:section-title">
            <CalendarOutlined /> Activities
          </div>
          <Button type="primary" icon={<PaperClipOutlined />} size="small">
            Add Activity
          </Button>
        </div>
        
        <Tabs defaultActiveKey="activities">
          <TabPane tab="Activities" key="activities">
            <div className="gba:tab-content">
              {opportunityData.activityTimeline && opportunityData.activityTimeline.length > 0 ? (
                <Timeline className="gba:timeline-container">
                  {opportunityData.activityTimeline.map((activity, index) => (
                    <Timeline.Item key={index} color="blue">
                      <div>
                        <Text strong>{activity.title}</Text>
                        <div><Text type="secondary">{activity.date}</Text></div>
                        <div>{activity.description}</div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty description="No activities yet" />
              )}
            </div>
          </TabPane>
          <TabPane tab="Notes" key="notes">
            <div className="gba:tab-content">
              <Text type="secondary">No notes available</Text>
            </div>
          </TabPane>
          <TabPane tab="Documents" key="documents">
            <div className="gba:tab-content">
              <Text type="secondary">No documents available</Text>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default OpportunityDetail;
