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
  
  // Fetch data for dropdowns
  const { accounts, loading: accountsLoading } = useAccountsData(accessToken);
  const { contacts, loading: contactsLoading } = useContactsData(accessToken);
  const { employees, loading: employeesLoading } = useEmployeesData(accessToken);

  // Reset form when component mounts or initialData changes
  useEffect(() => {
    form.resetFields();
    
    if (initialData) {
      // Format the data for the form
      const formattedData = {
        ...initialData,
        accountId: initialData.accountId,
        contactId: initialData.contactId,
        ownerId: initialData.ownerId,
      };
      form.setFieldsValue(formattedData);
    } else {
      // Set default values for new lead
      form.setFieldsValue({
        ownerId: employeeId || '',
      });
    }
  }, [initialData, form, employeeId]);

  // Handle contact selection to auto-populate email and phone
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
      
      // Get selected account and contact names
      const selectedAccount = accounts.find(account => account.id === values.accountId);
      const selectedContact = contacts.find(contact => contact.id === values.contactId);
      const selectedEmployee = employees.find(employee => employee.id === values.ownerId);
      
      // Prepare data for saving
      const savePayload = {
        changeMode: isEditing ? "UPDATE" : "INSERT",
        lead: {
          id: isEditing ? initialData?.id : undefined,
          version: isEditing ? initialData?.version : undefined,
          companyName: selectedAccount?.name || values.companyName,
          // Map selected IDs to proper object structure
          ownerEmployee: values.ownerId ? values.ownerId : null,
          account: values.accountId ? values.accountId : null,
          contact: values.contactId ? values.contactId : null,
        }
      };

      console.log('Sending payload:', JSON.stringify(savePayload, null, 2));
      
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
        
        console.log('Response status:', response.status);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { message: responseText };
        }
        
        if (response.ok || responseData?.lead?.id) {
          message.success(`Lead ${isEditing ? 'updated' : 'created'} successfully!`);
          
          // Prepare the lead data to pass back to the parent component
          const leadData: LeadFormData = {
            ...values,
            id: responseData?.lead?.id || initialData?.id,
            version: responseData?.lead?.version || initialData?.version,
            companyName: selectedAccount?.name || values.companyName,
            contactName: selectedContact?.fullName || values.contactName,
            ownerName: selectedEmployee?.fullName,
            createdAt: initialData?.createdAt || new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          };
          
          // Call the onSave callback to update the UI
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
