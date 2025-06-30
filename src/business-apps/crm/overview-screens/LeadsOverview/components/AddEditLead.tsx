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
import { PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useAccountsData } from '../hooks/useAccountsData';
import { useContactsData } from '../hooks/useContactsData';
import { useEmployeesData } from '../hooks/useEmployeesData';
import { useLeadCatalogs } from '../hooks/useLeadCatalogs';

const { Title } = Typography;
const { Option } = Select;

// Interface for the component props
interface AddEditLeadProps {
  onCancel: () => void;
  onSave: (leadData: LeadFormData) => void;
  initialData?: LeadFormData;
  isEditing: boolean;
  employeeId?: string;
  accessToken: string;
}

// Interface for the lead form data
export interface LeadFormData {
  id?: string;
  name?: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string;
  ownerName?: string;
  contactId?: string;
  accountId?: string;
  createdAt?: string;
  lastActivity?: string;
  version?: number;
  leadSourceId?: string;
  leadStatusId?: string;
  leadRatingId?: string;
  leadSource?: { id: string; value: string };
  leadStatus?: { id: string; value: string };
  leadRating?: { id: string; value: string };
}

const AddEditLead: React.FC<AddEditLeadProps> = ({
  onCancel,
  onSave,
  initialData,
  isEditing,
  employeeId,
  accessToken
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const { accounts, loading: accountsLoading } = useAccountsData(accessToken);
  const { contacts, loading: contactsLoading } = useContactsData(accessToken);
  const { employees, loading: employeesLoading } = useEmployeesData(accessToken);
  const { leadSources, leadStatuses, leadRatings, loading: catalogsLoading } = useLeadCatalogs(accessToken);
  useEffect(() => {
    form.resetFields();
    
    if (initialData) {
      const formattedData = {
        name: initialData.name,
        companyName: initialData.companyName,
        contactName: initialData.contactName,
        contactEmail: initialData.contactEmail,
        contactPhone: initialData.contactPhone,
        leadSourceId: initialData.leadSource?.id || initialData.leadSourceId,
        leadStatusId: initialData.leadStatus?.id || initialData.leadStatusId,
        leadRatingId: initialData.leadRating?.id || initialData.leadRatingId,
        accountId: initialData.accountId,
        contactId: initialData.contactId,
        ownerId: initialData.ownerId,
      };
      
      form.setFieldsValue(formattedData);
    } else {
      form.setFieldsValue({
        ownerId: employeeId || '',
      });
    }
  }, [initialData, form, employeeId]);

  const handleContactChange = (contactId: string) => {
    const selectedContact = contacts.find(contact => contact.id === contactId);
    if (selectedContact) {
      form.setFieldsValue({
        contactEmail: selectedContact.email,
        contactPhone: selectedContact.phone,
        contactName: selectedContact.fullName
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const selectedAccount = accounts.find(account => account.id === values.accountId);
      const selectedContact = contacts.find(contact => contact.id === values.contactId);
      const selectedEmployee = employees.find(employee => employee.id === values.ownerId);
      const savePayload = isEditing ? {
        changeMode: "UPDATE",
        lead: {
          id: initialData?.id,
          name: values.name,
          companyName: selectedAccount?.name || values.companyName,
          ownerEmployee: values.ownerId || null,
          account: values.accountId || null,
          contact: values.contactId || null,
          version: initialData?.version || 0,
          leadSourceRef: values.leadSourceId || null,
          leadStatusRef: values.leadStatusId || null,
          leadRatingRef: values.leadRatingId || null,
        }
      } : {
        changeMode: "INSERT",
        lead: {
          name: values.name,
          companyName: selectedAccount?.name || values.companyName,
          ownerEmployee: values.ownerId || null,
          account: values.accountId || null,
          contact: values.contactId || null,
          leadSourceRef: values.leadSourceId || null,
          leadStatusRef: values.leadStatusId || null,
          leadRatingRef: values.leadRatingId || null,
        }
      };
      
      try {
        // Make the API call using fetch
        const response = await fetch(
          'https://newwork-dev.newwork.com/processes/customer-relations/saveLead',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(savePayload)
          }
        );
        
        
        const responseText = await response.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { message: responseText };
        }
        
        if (response.ok || responseData?.lead?.id) {
          message.success(`Lead ${isEditing ? 'updated' : 'created'} successfully!`);
          
          // Prepare the lead data to pass back to the parent component
          const selectedSource = leadSources.find(source => source.id === values.leadSourceId);
          const selectedStatus = leadStatuses.find(status => status.id === values.leadStatusId);
          const selectedRating = leadRatings.find(rating => rating.id === values.leadRatingId);
          
          const leadData: LeadFormData = {
            ...values,
            id: responseData?.lead?.id || initialData?.id,
            version: responseData?.lead?.version || initialData?.version,
            companyName: selectedAccount?.name || values.companyName,
            contactName: selectedContact?.fullName || values.contactName,
            ownerName: selectedEmployee?.fullName,
            leadSource: selectedSource ? { id: selectedSource.id, value: selectedSource.value } : undefined,
            leadStatus: selectedStatus ? { id: selectedStatus.id, value: selectedStatus.value } : undefined,
            leadRating: selectedRating ? { id: selectedRating.id, value: selectedRating.value } : undefined,
            createdAt: initialData?.createdAt || new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          };
          onSave(leadData);
        } else {
          const errorMessage = responseData.message || response.statusText || 'Unknown error';
          throw new Error(`Failed to ${isEditing ? 'update' : 'create'} lead: ${errorMessage}`);
        }
      } catch (err: any) {
        console.error('Error saving lead:', err);
        message.error(`Failed to ${isEditing ? 'update' : 'create'} lead: ${err.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
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
              name="accountId"
              label="Company Name"
              rules={[{ required: true, message: 'Please select a company' }]}
              data-testid="company-name-field"
            >
              <Select 
                placeholder="Select a company"
                data-testid="company-name-select"
                loading={accountsLoading}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {accounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Contact Information</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="contactId"
              label="Contact Name"
              rules={[{ required: true, message: 'Please select a contact' }]}
              data-testid="contact-name-field"
            >
              <Select 
                placeholder="Select a contact"
                data-testid="contact-name-select"
                loading={contactsLoading}
                showSearch
                optionFilterProp="children"
                onChange={handleContactChange}
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {contacts.map(contact => (
                  <Option key={contact.id} value={contact.id}>
                    {contact.fullName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="contactEmail"
              label="Email"
              data-testid="contact-email-field"
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="Email will auto-populate from contact" 
                data-testid="contact-email-input"
                disabled
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
                placeholder="Phone will auto-populate from contact" 
                data-testid="contact-phone-input"
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Lead Details</Divider>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="Lead Name"
              rules={[{ required: true, message: 'Please enter a lead name' }]}
              data-testid="lead-name-field"
            >
              <Input 
                placeholder="Enter lead name"
                data-testid="lead-name-input"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="leadStatusId"
              label="Lead Status"
              data-testid="lead-status-field"
            >
              <Select
                placeholder="Select lead status"
                data-testid="lead-status-select"
                loading={catalogsLoading}
              >
                {leadStatuses.map(status => (
                  <Option key={status.id} value={status.id}>
                    {status.value}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="leadSourceId"
              label="Lead Source"
              data-testid="lead-source-field"
            >
              <Select
                placeholder="Select lead source"
                data-testid="lead-source-select"
                loading={catalogsLoading}
              >
                {leadSources.map(source => (
                  <Option key={source.id} value={source.id}>
                    {source.value}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="leadRatingId"
              label="Lead Rating"
              data-testid="lead-rating-field"
            >
              <Select
                placeholder="Select lead rating"
                data-testid="lead-rating-select"
                loading={catalogsLoading}
              >
                {leadRatings.map(rating => (
                  <Option key={rating.id} value={rating.id}>
                    {rating.value}
                  </Option>
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
              rules={[{ required: true, message: 'Please select a lead owner' }]}
              data-testid="owner-field"
            >
              <Select 
                placeholder="Select lead owner"
                data-testid="owner-select"
                loading={employeesLoading}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {employees.map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </Option>
                ))}
              </Select>
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
