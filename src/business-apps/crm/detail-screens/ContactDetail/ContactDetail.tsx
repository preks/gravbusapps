import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Row, 
  Col, 
  Descriptions, 
  Tag, 
  Space, 
  Divider,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Avatar,
  Badge,
  Tabs,
  List,
  Timeline,
  Empty
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  GlobalOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  BankOutlined,
  TeamOutlined,
  HistoryOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from "@/business-apps/types";
import { env } from '@/common/env/EnvUtils';
import { useContactsData, Contact } from '../../overview-screens/ContactsOverview/hooks/useContactsData';
import { AddEditContactModal } from '../../overview-screens/ContactsOverview/components';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface ContactDetailProps extends BusinessAppContextProps {
  contactId?: string;
  isEditMode?: boolean;
  isNewContact?: boolean;
  onBack: () => void;
  onDelete?: () => void;
}

interface ExtendedContact extends Contact {
  key: string;
  fullName: string;
  company: string;
  position?: string;
  version?: number;
  status?: 'active' | 'inactive';
  relatedOpportunities?: Array<{
    id: string;
    name: string;
    stage: string;
    value: number;
  }>;
  isPrimary?: boolean;
  lastUpdated?: string;
}

export function ContactDetail({ 
  accessToken, 
  employeeId, 
  contactId, 
  isEditMode = false, 
  isNewContact = false, 
  onBack, 
  onDelete 
}: ContactDetailProps) {
  const [contact, setContact] = useState<ExtendedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form] = Form.useForm();

  const { contacts: contactsData, refetch: refetchContacts } = useContactsData(accessToken);

  useEffect(() => {
    if (contactId && contactsData) {
      const foundContact = contactsData.find(c => c.id === contactId);
      if (foundContact) {
        const extendedContact: ExtendedContact = {
          ...foundContact,
          key: foundContact.id,
          fullName: `${foundContact.firstName} ${foundContact.lastName}`,
          position: foundContact.jobTitle || '',
          isPrimary: false,
          lastUpdated: foundContact.updatedAt,
          jobTitle: foundContact.jobTitle || '',
          status: 'active' as const,
          company: foundContact.account?.name || '',
          relatedOpportunities: []
        };
        setContact(extendedContact);
      } else {
        setError('Contact not found');
      }
      setLoading(false);
    } else if (!contactId) {
      setLoading(false);
    }
  }, [contactId, contactsData]);

  const handleEdit = () => {
    setIsEditModalVisible(true);
  };

  const handleDelete = async () => {
    if (!contact) return;

    Modal.confirm({
      title: 'Delete Contact',
      content: 'Are you sure you want to delete this contact? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      okButtonProps: { loading: isDeleting },
      onOk: async () => {
        try {
          setIsDeleting(true);
          
          const deletePayload = {
            changeMode: "DELETE",
            contact: {
              id: contact.id,
              version: contact.version
            }
          };
          
          const response = await fetch(`${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveContact`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(deletePayload)
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete contact: ${response.statusText}`);
          }
          
          message.success('Contact deleted successfully');
          onDelete?.();
          onBack();
        } catch (error) {
          console.error('Error deleting contact:', error);
          message.error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const formatTimeDifference = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
      if (diffInSeconds < 60) {
        if (diffInSeconds <= 0) {
          return '1 second ago';
        }
        return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago`;
      }  
        
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
      }
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  const getFullName = (contact: ExtendedContact): string => {
    return `${contact.firstName} ${contact.lastName}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Loading contact details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ color: 'red', marginBottom: '20px' }}>Error: {error}</div>
        <Button type="primary" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!contact) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="Contact not found" />
        <Button type="primary" onClick={onBack} style={{ marginTop: '20px' }}>
          Go Back
        </Button>
      </div>
    );
  }

  const activityItems = [
    {
      color: 'green',
      children: `Contact created ${formatTimeDifference(contact.createdAt)}`,
    },
    {
      color: 'blue',
      children: `Last updated ${formatTimeDifference(contact.updatedAt)}`,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            style={{ marginRight: 16 }}
          >
            Back
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {getFullName(contact)}
            </Title>
            <Text type="secondary">{contact.position || 'No position specified'}</Text>
          </div>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        {/* Main Contact Information */}
        <Col xs={24} lg={16}>
          <Tabs defaultActiveKey="overview">
            <TabPane tab="Overview" key="overview">
              <Card title="Contact Information" style={{ marginBottom: 24 }}>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="First Name">
                        <Text strong>{contact.firstName || '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Last Name">
                        <Text strong>{contact.lastName || '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Job Title">
                        <Text>{contact.jobTitle || '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Email">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`}>
                            <MailOutlined style={{ marginRight: 8 }} />
                            {contact.email}
                          </a>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Phone">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`}>
                            <PhoneOutlined style={{ marginRight: 8 }} />
                            {contact.phone}
                          </a>
                        ) : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col xs={24} md={12}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Account">
                        <Text>{contact.company || '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Owner">
                        <Text>{contact.ownerEmployee?.fullName || '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={contact.status === 'active' ? 'green' : 'red'}>
                          {contact.status || 'Active'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Created">
                        <Text>{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '-'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Last Updated">
                        <Text>{formatTimeDifference(contact.updatedAt)}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>
              </Card>

              {/* Social Links */}
              {(contact.linkedinUrl || contact.xingUrl) && (
                <Card title="Social Links" style={{ marginBottom: 24 }}>
                  <Space size="large">
                    {contact.linkedinUrl && (
                      <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Button icon={<LinkedinOutlined />} type="link">
                          LinkedIn
                        </Button>
                      </a>
                    )}
                    {contact.xingUrl && (
                      <a href={contact.xingUrl} target="_blank" rel="noopener noreferrer">
                        <Button icon={<GlobalOutlined />} type="link">
                          Xing
                        </Button>
                      </a>
                    )}
                  </Space>
                </Card>
              )}

              {/* Related Opportunities */}
              <Card title="Related Opportunities">
                {contact.relatedOpportunities && contact.relatedOpportunities.length > 0 ? (
                  <List
                    dataSource={contact.relatedOpportunities}
                    renderItem={(opportunity) => (
                      <List.Item>
                        <List.Item.Meta
                          title={opportunity.name}
                          description={`Stage: ${opportunity.stage} | Value: $${opportunity.value.toLocaleString()}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No related opportunities" />
                )}
              </Card>
            </TabPane>

            <TabPane tab="Activity" key="activity">
              <Card title="Recent Activity">
                <Timeline items={activityItems} />
              </Card>
            </TabPane>

            <TabPane tab="Notes" key="notes">
              <Card title="Notes">
                <Empty description="No notes available" />
              </Card>
            </TabPane>
          </Tabs>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<MailOutlined />} block>
                Send Email
              </Button>
              <Button icon={<PhoneOutlined />} block>
                Call Contact
              </Button>
              <Button icon={<CalendarOutlined />} block>
                Schedule Meeting
              </Button>
              <Button icon={<FileTextOutlined />} block>
                Create Note
              </Button>
            </Space>
          </Card>

          <Card title="Contact Summary">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Full Name">
                <Text strong>{getFullName(contact)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Company">
                <Text>{contact.company || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Position">
                <Text>{contact.position || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <Text>{contact.email || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Text>{contact.phone || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Edit Contact Modal */}
      <AddEditContactModal
        accessToken={accessToken}
        employeeId={employeeId}
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          refetchContacts();
        }}
        contactId={contact.id}
        contactData={contact}
        isEdit={true}
      />
    </div>
  );
}

export default ContactDetail; 