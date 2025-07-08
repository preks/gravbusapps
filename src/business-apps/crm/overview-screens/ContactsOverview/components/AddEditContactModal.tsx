import React, { useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/business-apps/types';
import { useEmployeesData } from '@/business-apps/crm/overview-screens/ContactProfile/hooks/useEmployeesData';
import { useAccountsData } from '@/business-apps/crm/overview-screens/ContactProfile/hooks/useAccountsData';
import dayjs from 'dayjs';
import { env } from '@/common/env/EnvUtils';
// No need for translation imports as we're using direct text labels

interface AddEditContactModalProps extends BusinessAppContextProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  contactId?: string;
  contactData?: any;
  isEdit?: boolean;
}

const AddEditContactModal: React.FC<AddEditContactModalProps> = ({
  accessToken,
  // employeeId not used directly but passed through to other components
  visible,
  onCancel,
  onSuccess,
  contactId,
  contactData,
  isEdit = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { employees } = useEmployeesData(accessToken);
  const { accounts } = useAccountsData(accessToken);

  // Reset form when modal opens or closes
  React.useEffect(() => {
    if (visible) {
      if (isEdit && contactData) {
        form.setFieldsValue({
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          jobTitle: contactData.jobTitle,
          department: contactData.department,
          ownerEmployeeId: contactData.ownerEmployee?.id || null,
          accountId: contactData.account?.id || null,
          birthDate: contactData.birthDate ? dayjs(contactData.birthDate) : undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, form, contactData, isEdit]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Format the data for submission
      const contactPayload = {
        changeMode: isEdit ? "UPDATE" : "INSERT",
        contact: {
          ...(isEdit ? { id: contactId, version: contactData?.version } : {}),
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          jobTitle: values.jobTitle,
          department: values.department,
          ownerEmployee: values.ownerEmployeeId,
          account: values.accountId,
          birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        }
      };

      // Send the request to create/update contact
      const response = await fetch(`${env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')}/customer-relations/saveContact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save contact');
      }

      message.success(isEdit ? 'Contact updated successfully!' : 'Contact created successfully!');
      onSuccess();
      onCancel();
    } catch (error: any) {
      message.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Contact" : "Personal Information"}
      open={visible}
      onCancel={onCancel}
      footer={null}
      maskClosable={false}
      width={450}
      className="gba:max-w-md gba:compact-modal"
      data-testid="add-edit-contact-modal"
      bodyStyle={{ padding: '12px 24px', height: '90vh', overflowY: 'auto' }}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        className="gba:py-2"
        size="small"
        colon={false}
      >
        <Form.Item
          name="firstName"
          label="First Name"
          rules={[{ required: true, message: 'Please enter first name' }]}
          data-testid="contact-first-name-field"
          className="gba:mb-3"
        >
          <Input 
            prefix={<UserOutlined className="gba:text-gray-400" />} 
            placeholder="Please Enter..." 
            className="gba:py-1.5"
          />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Last Name"
          rules={[{ required: true, message: 'Please enter last name' }]}
          data-testid="contact-last-name-field"
          className="gba:mb-3"
        >
          <Input 
            prefix={<UserOutlined className="gba:text-gray-400" />} 
            placeholder="Please Enter..." 
            className="gba:py-1.5"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' }
          ]}
          data-testid="contact-email-field"
          className="gba:mb-3"
        >
          <Input 
            prefix={<MailOutlined className="gba:text-gray-400" />} 
            placeholder="Please Enter..." 
            className="gba:py-1.5"
          />
        </Form.Item>

        <div className="gba:border-t gba:border-gray-200 gba:my-2 gba:pt-2">
          <h3 className="gba:text-sm gba:font-semibold gba:mb-2">
            Employment Information
          </h3>
        </div>

        <Form.Item
          name="accountId"
          label="Account"
          data-testid="contact-account-field"
          className="gba:mb-3"
        >
          <Select
            placeholder="Please Select..."
            showSearch
            optionFilterProp="label"
            className="gba:w-full"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={accounts.map(account => ({
              value: account.id,
              label: account.name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="ownerEmployeeId"
          label="Contact Owner"
          data-testid="contact-owner-field"
          className="gba:mb-3"
        >
          <Select
            placeholder="Please Select..."
            showSearch
            optionFilterProp="label"
            className="gba:w-full"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map(employee => ({
              value: employee.id,
              label: employee.fullName
            }))}
          />
        </Form.Item>

        <Form.Item
          name="jobTitle"
          label="Job Position"
          data-testid="contact-job-title-field"
          className="gba:mb-3"
        >
          <Input 
            placeholder="Please Enter..." 
            className="gba:py-1.5" 
            prefix={<BankOutlined />} 
          />
        </Form.Item>

        <Form.Item
          name="department"
          label="Department"
          data-testid="contact-department-field"
          className="gba:mb-3"
        >
          <Input 
            placeholder="Please Enter..." 
            className="gba:py-1.5" 
            prefix={<BankOutlined />} 
          />
        </Form.Item>

        <div className="gba:border-t gba:border-gray-200 gba:my-2 gba:pt-2">
          <h3 className="gba:text-sm gba:font-semibold gba:mb-2">
            Additional Attributes
          </h3>
        </div>

        <Form.Item
          name="phone"
          label="Phone"
          data-testid="contact-phone-field"
          className="gba:mb-3"
        >
          <Input 
            prefix={<PhoneOutlined className="gba:text-gray-400" />} 
            placeholder="Please Enter..." 
            className="gba:py-1.5"
          />
        </Form.Item>

        <Form.Item
          name="birthDate"
          label="Hire Date"
          data-testid="contact-birth-date-field"
          className="gba:mb-3"
        >
          <DatePicker className="gba:w-full gba:py-1.5" format="MM/DD/YYYY" />
        </Form.Item>

        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
          <Button onClick={onCancel} data-testid="contact-cancel-button">
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={handleSubmit} 
            loading={loading}
            data-testid="contact-submit-button"
          >
            {isEdit ? 'Update' : 'Create Contact'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AddEditContactModal;
