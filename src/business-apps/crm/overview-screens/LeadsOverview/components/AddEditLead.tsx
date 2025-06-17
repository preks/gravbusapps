import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  message, 
  Divider, 
  Row, 
  Col,
  Typography,
  Card
} from 'antd';
import { UserOutlined, BankOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

// Interface for the component props
interface AddEditLeadProps {
  onCancel: () => void;
  onSave: (leadData: LeadFormData) => void;
  initialData?: LeadFormData;
  isEditing: boolean;
  userInfo?: any;
  employeeId?: string;
}

// Interface for the lead form data
export interface LeadFormData {
  id?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string;
  ownerName?: string;
  status: 'active' | 'lost' | 'converted';
  notes?: string;
  source?: string;
  createdAt?: string;
  lastActivity?: string;
  version?: number;
}

const AddEditLead: React.FC<AddEditLeadProps> = ({
  onCancel,
  onSave,
  initialData,
  isEditing,
  userInfo,
  employeeId
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // Mock data for owners (would typically come from an API)
  const mockOwners = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Mike Johnson' },
    { id: '4', name: 'Sarah Williams' },
  ];
  
  // Mock data for lead sources
  const leadSources = [
    'Website', 
    'Referral', 
    'Cold Call', 
    'Social Media', 
    'Event', 
    'Email Campaign',
    'Partner',
    'Other'
  ];

  // Reset form when component mounts or initialData changes
  useEffect(() => {
    form.resetFields();
    
    if (initialData) {
      // Format the data for the form
      const formattedData = {
        ...initialData,
      };
      form.setFieldsValue(formattedData);
    } else {
      // Set default values for new lead
      form.setFieldsValue({
        status: 'active',
        ownerId: employeeId || '',
        ownerName: userInfo?.displayName || '',
      });
    }
  }, [initialData, form, employeeId, userInfo]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Prepare data for saving
      const leadData: LeadFormData = {
        ...values,
        id: initialData?.id,
        version: initialData?.version,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
      
      // Simulate API delay
      setTimeout(() => {
        onSave(leadData);
        setLoading(false);
        message.success(`Lead ${isEditing ? 'updated' : 'created'} successfully!`);
      }, 1000);
      
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const modalTitle = isEditing ? 'Edit Lead' : 'Create New Lead';

  return (
    <Card 
      title={<Title level={4}>{modalTitle}</Title>}
      className="gba:add-edit-lead-card"
      data-testid="add-edit-lead-card"
      style={{ marginBottom: 24 }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        data-testid="lead-form"
      >
        <Divider orientation="left">Company Information</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="companyName"
              label="Company Name"
              rules={[{ required: true, message: 'Please enter company name' }]}
              data-testid="company-name-field"
            >
              <Input 
                prefix={<BankOutlined />} 
                placeholder="Enter company name" 
                data-testid="company-name-input"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Contact Information</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="contactName"
              label="Contact Name"
              rules={[{ required: true, message: 'Please enter contact name' }]}
              data-testid="contact-name-field"
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Enter contact name" 
                data-testid="contact-name-input"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contactEmail"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' }
              ]}
              data-testid="contact-email-field"
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="Enter email address" 
                data-testid="contact-email-input"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contactPhone"
              label="Phone"
              data-testid="contact-phone-field"
            >
              <Input 
                prefix={<PhoneOutlined />} 
                placeholder="Enter phone number" 
                data-testid="contact-phone-input"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Lead Details</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Please select status' }]}
              data-testid="status-field"
            >
              <Select placeholder="Select status" data-testid="status-select">
                <Option value="active">Active</Option>
                <Option value="lost">Lost</Option>
                <Option value="converted">Converted</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="source"
              label="Lead Source"
              data-testid="source-field"
            >
              <Select placeholder="Select source" data-testid="source-select">
                {leadSources.map(source => (
                  <Option key={source} value={source}>{source}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="ownerId"
              label="Lead Owner"
              data-testid="owner-field"
            >
              <Select 
                placeholder="Select lead owner"
                data-testid="owner-select"
                optionFilterProp="children"
                showSearch
              >
                {mockOwners.map(owner => (
                  <Option key={owner.id} value={owner.id}>{owner.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="notes"
              label="Notes"
              data-testid="notes-field"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="Enter any additional notes about this lead"
                data-testid="notes-input"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className="gba:form-actions" style={{ textAlign: 'right', marginTop: 24 }}>
          <Button 
            onClick={onCancel} 
            style={{ marginRight: 16 }}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={handleSubmit} 
            loading={loading}
            data-testid="save-button"
          >
            {isEditing ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default AddEditLead;
