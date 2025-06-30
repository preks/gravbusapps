import { FC, useEffect, useState } from "react"
import { Spin, Typography, Button, Form, Input, DatePicker, message, Card, Popconfirm, Select } from "antd"
import dayjs from 'dayjs'
import { EditOutlined, ArrowLeftOutlined, UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, DeleteOutlined } from "@ant-design/icons"

import { ProfileHeader } from "./components/ProfileHeader"
import { OrganizationCard } from "./components/OrganizationCard"
import { BioCard } from "./components/BioCard"
import { useContactData } from "./hooks/useContactData"
import { useEmployeesData } from "./hooks/useEmployeesData"
import { useAccountsData, Account } from "./hooks/useAccountsData"
import { BusinessAppContextProps } from "../../../types"
import { env } from '@/common/env/EnvUtils';

const { Title } = Typography;

interface ContactProfileProps extends BusinessAppContextProps {
  contactId?: string;
  isEditMode?: boolean;
  isNewContact?: boolean;
  onBack?: () => void;
  onDelete?: () => void;
}

export const ContactProfile: FC<ContactProfileProps> = ({ accessToken, employeeId: currentEmployeeId, contactId: propContactId, isEditMode: propIsEditMode, isNewContact: propIsNewContact, onBack, onDelete }) => {
  // Form instance for editing contact
  const [form] = Form.useForm();
  
  // State variables
  const [contactId, setContactId] = useState<string | undefined>(propContactId);
  const [isEditMode, setIsEditMode] = useState<boolean>(propIsEditMode || false);
  const [isNewContact, setIsNewContact] = useState<boolean>(propIsNewContact || false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  useEffect(() => {
    // Update state when props change
    if (propContactId !== undefined) {
      setContactId(propContactId);
    }
    
    if (propIsEditMode !== undefined) {
      setIsEditMode(propIsEditMode);
    }
    
    if (propIsNewContact !== undefined) {
      setIsNewContact(propIsNewContact);
      if (propIsNewContact) {
        setIsEditMode(true);
      }
    }
  }, [propContactId, propIsEditMode, propIsNewContact]);
  
  const { contact, loading, error, refetchContact } = useContactData(accessToken, isNewContact ? undefined : contactId);
  const { employees, loading: loadingEmployees } = useEmployeesData(accessToken);
  const { accounts, loading: loadingAccounts } = useAccountsData(accessToken);
  
  // Initialize form with contact data when available
  useEffect(() => {
    if (contact && !isNewContact) {
      form.setFieldsValue({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        jobTitle: contact.jobTitle,
        department: contact.department,
        bio: contact.bio,
        birthDate: contact.birthDate ? dayjs(contact.birthDate) : undefined,
        linkedinUrl: contact.linkedinUrl,
        xingUrl: contact.xingUrl,
        employeeId: contact.employeeId,
        accountId: contact.accountId
      });
    }
  }, [contact, form, isNewContact]);

  const handleBack = () => {
    // Always use the onBack prop for navigation
    if (onBack) {
      onBack();
    } else {
      // Log a warning if onBack is not provided
      console.warn('ContactProfile: onBack prop not provided, navigation may not work as expected');
    }
  };
  
  const handleEdit = () => {
    setIsEditMode(true);
  };
  
  const handleDelete = async () => {
    if (!contact || !contactId) {
      message.error('Cannot delete: Contact information is missing');
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const deletePayload = {
        changeMode: "DELETE",
        contact: {
          id: contactId,
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
      
      // Call onDelete callback if provided to refresh the contacts list
      if (onDelete) {
        onDelete();
      }
      
      handleBack(); // Go back to the contacts list
    } catch (error) {
      console.error('Error deleting contact:', error);
      message.error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const savePayload = {
        changeMode: isNewContact ? "INSERT" : "UPDATE",
        contact: {
          id: isNewContact ? undefined : contactId,
          version: isNewContact ? undefined : contact?.version,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          jobTitle: values.jobTitle,
          department: values.department,
          bio: values.bio,
          account: values.accountId,
          birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : undefined,
          linkedinUrl: values.linkedinUrl,
          xingUrl: values.xingUrl,
          ownerEmployee: values.employeeId 
        }
      };

      const response = await fetch(
        `${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveContact`,
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
      
      if (response.ok || responseData?.contact?.id) {
        message.success(`Contact ${isNewContact ? 'created' : 'updated'} successfully`);
        
        if (isNewContact) {
          if (responseData?.contact?.id) {
            setContactId(responseData.contact.id);
            setIsNewContact(false);
            refetchContact();
            setIsEditMode(false);
          } else {
            handleBack();
          }
          
          if (onDelete) {
            onDelete();
          }
        } else {
          refetchContact();
          setIsEditMode(false);
          
          if (onDelete) {
            onDelete();
          }
        }
      } else {
        const errorMessage = responseData.message || response.statusText || 'Unknown error';
        throw new Error(`Failed to ${isNewContact ? 'create' : 'update'} contact: ${errorMessage}`);
      }
    } catch (err: any) {
      console.error('Error saving contact:', err);
      message.error(`Failed to ${isNewContact ? 'create' : 'update'} contact: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (isNewContact) {
      handleBack();
    } else {
      setIsEditMode(false);
    }
  };

  const renderEditForm = () => {
    return (
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          jobTitle: '',
          department: '',
          bio: ''
        }}
      >
        <Card className="gba:rounded-xl gba:shadow-sm gba:border-gray-300 gba:mb-6">
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="First Name" />
            </Form.Item>
            
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Last Name" />
            </Form.Item>
          </div>
          
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" />
            </Form.Item>
            
            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input prefix={<PhoneOutlined />} placeholder="Phone Number" />
            </Form.Item>
          </div>
          
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            <Form.Item
              name="jobTitle"
              label="Job Title"
            >
              <Input prefix={<BankOutlined />} placeholder="Job Title" />
            </Form.Item>
            
            <Form.Item
              name="department"
              label="Department"
            >
              <Input placeholder="Department" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="employeeId"
            label="Contact Owner"
          >
            <Select
              placeholder="Select an owner"
              loading={loadingEmployees}
              allowClear
              showSearch
              optionFilterProp="children"
              data-testid="contact-owner-select"
            >
              {employees.map((employee) => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="accountId"
            label="Company/Account"
            rules={[
              { required: true, message: 'Please select an account' }
            ]}
          >
            <Select
              placeholder="Select an account"
              loading={loadingAccounts}
              showSearch
              optionFilterProp="children"
              data-testid="contact-account-select"
            >
              {accounts.map((account: Account) => (
                <Select.Option key={account.id} value={account.id}>
                  {account.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="bio"
            label="Bio"
          >
            <Input.TextArea rows={4} placeholder="Bio information" />
          </Form.Item>
          
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            <Form.Item
              name="linkedinUrl"
              label="LinkedIn URL"
            >
              <Input placeholder="LinkedIn URL" />
            </Form.Item>
            
            <Form.Item
              name="xingUrl"
              label="Xing URL"
            >
              <Input placeholder="Xing URL" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="birthDate"
            label="Birth Date"
          >
            <DatePicker />
          </Form.Item>
        </Card>
        
        <div className="gba:flex gba:justify-end gba:gap-4">
          <Button onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave} loading={isSaving}>
            {isNewContact ? 'Create Contact' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !isNewContact) {
    return (
      <div style={{ padding: '20px' }}>
        <Button type="primary" onClick={handleBack} style={{ marginBottom: '20px' }}>
          <ArrowLeftOutlined /> Back
        </Button>
        <div style={{ color: 'red' }}>
          Error loading contact: {error.message}
        </div>
      </div>
    );
  }

  if (!contact && !isNewContact) {
    return (
      <div style={{ padding: '20px' }}>
        <Button type="primary" onClick={handleBack} style={{ marginBottom: '20px' }}>
          <ArrowLeftOutlined /> Back
        </Button>
        <div>
          Contact not found
        </div>
      </div>
    );
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <Button type="primary" onClick={handleBack} icon={<ArrowLeftOutlined />}>
          Back
        </Button>
        <Title level={2}>{isNewContact ? 'New Contact' : contact ? `${contact.firstName} ${contact.lastName}` : 'Contact'}</Title>
        <div className="gba:flex gba:gap-2">
          {!isEditMode && !isNewContact && (
            <>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                Edit
              </Button>
              <Popconfirm
                title="Delete Contact"
                description="Are you sure you want to delete this contact? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: isDeleting }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
          {isEditMode && isNewContact && <div></div>}
        </div>
      </div>

      {isEditMode ? (
        renderEditForm()
      ) : (
        <div className="gba:grid gba:grid-cols-1 gba:gap-6">
          <ProfileHeader contact={contact} />
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
            <OrganizationCard contact={contact} />
            <BioCard contact={contact} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactProfile
