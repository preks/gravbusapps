/**
 * Expense Detail Drawer Component
 * 
 * Displays detailed information about a selected expense request in a side drawer.
 * Includes trip details, expense items, allowances, and approval metadata.
 */

import React from 'react';
import { Drawer, Typography, Descriptions, Tag, Divider, List, Empty, Spin, Alert } from 'antd';
import { CalendarOutlined, GlobalOutlined, DollarOutlined, UserOutlined, CommentOutlined } from '@ant-design/icons';
import useExpenseRequestDetails from '../../hooks/useExpenseRequestDetails';

const { Title } = Typography;

interface ExpenseDetailDrawerProps {
  visible: boolean;
  expenseId: string | null;
  onClose: () => void;
  accessToken?: string;
}

const ExpenseDetailDrawer: React.FC<ExpenseDetailDrawerProps> = ({
  visible,
  expenseId,
  onClose,
  accessToken
}) => {
  // Use the custom hook to fetch expense request details
    const { data, loading, error } = useExpenseRequestDetails({ requestId: expenseId, accessToken });

  // Format currency amount
  const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render status tag
  const renderStatusTag = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Tag color="green">Approved</Tag>;
      case 'rejected':
        return <Tag color="red">Rejected</Tag>;
      case 'pending':
        return <Tag color="orange">In Approval</Tag>;
      case 'booked':
        return <Tag color="blue">Booked</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Helper function to render the main content based on the state
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading expense details...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Error"
          description={`Failed to load expense details: ${error.message}`}
          type="error"
          showIcon
        />
      );
    }

    if (!data) {
      return <Empty description="No expense details available" />;
    }

    return (
      <>
        {/* Basic Information */}
        <Descriptions title="Basic Information" column={1} bordered>
          <Descriptions.Item label="Request Code">{data.code}</Descriptions.Item>
          <Descriptions.Item label="Title">{data.title}</Descriptions.Item>
          <Descriptions.Item label="Description">{data.description}</Descriptions.Item>
          <Descriptions.Item label="Status">{renderStatusTag(data.status)}</Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            {formatCurrency(data.totalAmount, data.currency)}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">{formatDate(data.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{formatDate(data.updatedAt)}</Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Employee Information */}
        <Descriptions title="Employee Information" column={1} bordered>
          <Descriptions.Item label="Name">
            {`${data.employee?.firstName} ${data.employee?.lastName}`}
          </Descriptions.Item>
          <Descriptions.Item label="Employee Code">
            {data.employee?.businessKey}
          </Descriptions.Item>
          <Descriptions.Item label="Email">
            {data.employee?.email}
          </Descriptions.Item>
          <Descriptions.Item label="Cost Center">
            {`${data.costCenter?.name} (${data.costCenter?.code})`}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* Trip Details */}
        <Title level={5}>
          <GlobalOutlined /> Trip Details
        </Title>
        {data.trips && data.trips.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={data.trips}
            renderItem={(trip) => (
              <List.Item>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Description">{trip.description}</Descriptions.Item>
                  <Descriptions.Item label="Date/Time">
                    <CalendarOutlined /> {formatDate(trip.tripDateTime)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Direction">{trip.tripDirection}</Descriptions.Item>
                  <Descriptions.Item label="Destination">
                    {trip.address}
                    {trip.country && ` (${trip.country.name})`}
                  </Descriptions.Item>
                </Descriptions>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No trip details available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        <Divider />

        {/* Expense Items */}
        <Title level={5}>
          <DollarOutlined /> Expense Items
        </Title>
        {data.expenseItems && data.expenseItems.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={data.expenseItems}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.description}
                  description={`Category: ${item.category} | Type: ${item.itemType}`}
                />
                <div>
                  {formatCurrency(item.totalAmount, item.currency?.code)}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No expense items available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        <Divider />

        {/* Approval Metadata */}
        <Title level={5}>
          <UserOutlined /> Approval Information
        </Title>
        {data.approvalMetadata && data.approvalMetadata.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={data.approvalMetadata}
            renderItem={(metadata) => (
              <List.Item>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Approver">{metadata.author}</Descriptions.Item>
                  <Descriptions.Item label="Position">{metadata.position}</Descriptions.Item>
                  <Descriptions.Item label="Date">{formatDate(metadata.date)}</Descriptions.Item>
                  <Descriptions.Item label="Comment">
                    <CommentOutlined /> {metadata.comment || 'No comment provided'}
                  </Descriptions.Item>
                </Descriptions>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No approval information available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </>
    );
  };

  return (
    <Drawer
      title={<Title level={4}>Expense Request Details</Title>}
      placement="right"
      onClose={onClose}
      open={visible}
      width={500}
    >
      {renderContent()}
    </Drawer>
  );
};

export default ExpenseDetailDrawer;
