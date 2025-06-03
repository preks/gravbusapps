import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Row, Col, Card, Typography, Button, List, Space, Statistic, Segmented, Spin, Alert } from 'antd';
import { PlusCircleOutlined, SendOutlined, ExperimentOutlined, UploadOutlined, DollarCircleOutlined, CalendarOutlined, FlagOutlined, GlobalOutlined, ArrowRightOutlined, WarningOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { useGetExpenseDashboard } from '../../hooks/useGetExpenseDashboard';

const { Title, Text, Paragraph } = Typography;

export interface DashboardTabProps extends BusinessAppContextProps {}

const DashboardTab: React.FC<DashboardTabProps> = (props) => {
  const { stats, isLoading, error } = useGetExpenseDashboard(props);
  const [chartView, setChartView] = useState<string | number>('Monthly');
  const renderQuickActionCards = () => {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center">
                <PlusCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={5} style={{ marginBottom: 0 }}>Record Expense</Title>
              </Space>
              <Paragraph type="secondary" style={{ minHeight: '60px' }}>
                Quickly add a new expense to your records. Keep track of your spending efficiently.
              </Paragraph>
              <List size="small" bordered={false}>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Single or multiple items</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Attach receipts easily</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Categorize for clarity</Text></List.Item>
              </List>
              <Button type="primary" icon={<PlusCircleOutlined />} block>
                New Expense
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center">
                <SendOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                <Title level={5} style={{ marginBottom: 0 }}>Submit Request</Title>
              </Space>
              <Paragraph type="secondary" style={{ minHeight: '60px' }}>
                Finalize and submit your expense requests for approval and reimbursement.
              </Paragraph>
              <List size="small" bordered={false}>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Review all items</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Check policy compliance</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Get timely approvals</Text></List.Item>
              </List>
              <Button type="primary" icon={<SendOutlined />} block style={{backgroundColor: '#52c41a', borderColor: '#52c41a'}}>
                New Request
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center">
                <ExperimentOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                <Title level={5} style={{ marginBottom: 0 }}>Plan Business Trip</Title>
              </Space>
              <Paragraph type="secondary" style={{ minHeight: '60px' }}>
                Organize your upcoming business travel, including flights, hotels, and advances.
              </Paragraph>
              <List size="small" bordered={false}>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Create travel itinerary</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Request cash advance</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Link to expense plan</Text></List.Item>
              </List>
              <Button type="primary" icon={<ExperimentOutlined />} block style={{backgroundColor: '#faad14', borderColor: '#faad14'}}>
                New Trip Plan
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card hoverable>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space align="center">
                <UploadOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />
                <Title level={5} style={{ marginBottom: 0 }}>Upload Receipts</Title>
              </Space>
              <Paragraph type="secondary" style={{ minHeight: '60px' }}>
                Easily upload and manage all your receipts in one place for quick access.
              </Paragraph>
              <List size="small" bordered={false}>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Scan or drag & drop</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Auto-link to expenses</Text></List.Item>
                <List.Item style={{borderBlockEnd: 'none', padding: '4px 0'}}><Text>- Secure cloud storage</Text></List.Item>
              </List>
              <Button type="primary" icon={<UploadOutlined />} block style={{backgroundColor: '#eb2f96', borderColor: '#eb2f96'}}>
                Upload Now
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderSummaryStatisticCards = () => {
    if (isLoading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((index) => (
            <Col key={index} xs={24} sm={12} md={12} lg={6}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <Spin />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      );
    }

    if (error) {
      return (
        <Alert
          message="Error loading statistics"
          description={error}
          type="error"
          showIcon
        />
      );
    }

    const summaryStats = [
      {
        title: 'Waiting for Payout',
        value: `€${stats?.pendingPayouts.toFixed(2) ?? '0.00'}`,
        icon: <DollarCircleOutlined style={{ color: '#1890ff' }} />,
        link: '#',
        color: '#1890ff',
      },
      {
        title: "This Month's Expenses",
        value: `€${stats?.currentMonthExpenses.total.toFixed(2) ?? '0.00'}`,
        suffix: `(${stats?.currentMonthExpenses.count ?? 0} items)`,
        icon: <CalendarOutlined style={{ color: '#52c41a' }} />,
        link: '#',
        color: '#52c41a',
      },
      {
        title: 'Flagged Items',
        value: stats?.flaggedItems ?? 0,
        icon: <FlagOutlined style={{ color: '#faad14' }} />,
        link: '#',
        color: '#faad14',
      },
      {
        title: 'Upcoming Trips',
        value: stats?.upcomingTrips ?? 0,
        icon: <GlobalOutlined style={{ color: '#eb2f96' }} />,
        link: '#',
        color: '#eb2f96',
      },
    ];

    return (
      <Row gutter={[16, 16]}>
        {summaryStats.map((stat) => (
          <Col key={stat.title} xs={24} sm={12} md={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={stat.title}
                value={stat.value}
                precision={typeof stat.value === 'string' && stat.value.includes('.') ? 2 : 0}
                prefix={typeof stat.value === 'string' && stat.value.startsWith('€') ? '' : stat.icon}
                valueStyle={{ color: stat.color, fontSize: '24px' }}
                suffix={stat.suffix ?? (typeof stat.value === 'string' && stat.value.startsWith('€') ? stat.icon : '')}
              />
              <Button type="link" href={stat.link} style={{ padding: '0', marginTop: '10px' }}>
                View all <ArrowRightOutlined />
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderSpendingOverview = () => {
    if (isLoading) {
      return (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <Alert
            message="Error loading spending overview"
            description={error}
            type="error"
            showIcon
          />
        </Card>
      );
    }

    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Segmented 
            options={['Monthly', 'By Category', 'By Type']} 
            block 
            value={chartView}
            onChange={setChartView}
          />
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9', borderRadius: '2px' }}>
            <Text type="secondary">Chart Placeholder - {chartView} View</Text>
          </div>
        </Space>
      </Card>
    );
  };

  const renderActionFeed = () => {
    if (isLoading) {
      return (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <Alert
            message="Error loading action feed"
            description={error}
            type="error"
            showIcon
          />
        </Card>
      );
    }

    // Generate action feed items based on recent activity data
    const feedItems = stats?.recentActivity?.map(item => {
      let icon;
      let actionText;
      let text;

      switch(item.status) {
        case 'Approved':
          icon = <CheckCircleOutlined style={{ color: '#52c41a' }} />;
          actionText = 'View Details';
          text = `Your expense "${item.title}" (€${item.totalAmount.toFixed(2)}) has been approved.`;
          break;
        case 'Rejected':
          icon = <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
          actionText = 'Review Issues';
          text = `Your expense "${item.title}" (€${item.totalAmount.toFixed(2)}) has been rejected.`;
          break;
        case 'Pending':
        case 'In Progress':
          icon = <ClockCircleOutlined style={{ color: '#faad14' }} />;
          actionText = 'Check Status';
          text = `Your expense "${item.title}" (€${item.totalAmount.toFixed(2)}) is awaiting approval.`;
          break;
        default:
          icon = <InfoCircleOutlined style={{ color: '#1890ff' }} />;
          actionText = 'View Details';
          text = `Update on your expense "${item.title}" (€${item.totalAmount.toFixed(2)}).`;
      }

      return {
        id: item.id,
        icon,
        text,
        actionText,
        actionLink: `#/expense/${item.id}`,
        date: item.updatedAt,
      };
    }) ?? [];

    // Add some static items if we don't have enough from the API
    if (feedItems.length < 2) {
      feedItems.push(
        {
          id: 'policy-update',
          icon: <InfoCircleOutlined style={{ color: '#52c41a' }} />,
          text: 'New company travel policy update effective June 1st.',
          actionText: 'Read Policy',
          actionLink: '#',
          date: '2025-06-01',
        },
        {
          id: 'receipt-reminder',
          icon: <WarningOutlined style={{ color: '#faad14' }} />,
          text: 'Don\'t forget to upload receipts for your recent expenses.',
          actionText: 'Upload Now',
          actionLink: '#',
          date: '2025-06-02',
        }
      );
    }

    return (
      <Card>
        <List
          itemLayout="horizontal"
          dataSource={feedItems}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key={`action-${item.id}`} type="link" href={item.actionLink} style={{paddingRight: 0}}>
                  {item.actionText}
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={React.cloneElement(item.icon, { style: { ...item.icon.props.style, fontSize: '20px' } })}
                title={<Text>{item.text}</Text>}
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderDataBody = () => {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Quick Actions</Title>
          {renderQuickActionCards()}
        </div>
        
        <div>
          <Title level={4}>Summary Statistics</Title>
          {renderSummaryStatisticCards()}
        </div>
        
        <div>
          <Title level={4}>Spending Overview</Title>
          {renderSpendingOverview()}
        </div>
        
        <div>
          <Title level={4}>Action Feed</Title>
          {renderActionFeed()}
        </div>
      </Space>
    );
  };

  return (
    <DataContainer
      dataControllerProps={{
        search: '',
        filter: [],
        setSearch: () => {},
        setFilter: () => {},
      }}
      dataFilterProps={{}}
      hideFilter={true}
      dataBody={renderDataBody()}
      contentBackground="white"
    />
  );
};

export default DashboardTab;
