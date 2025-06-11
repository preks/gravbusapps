import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Row,
  Col,
  Card,
  Input,
  Select,
  Space,
  Spin,
  message,
  DatePicker
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloseOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import './styles/AddNewCompany.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface AddNewCompanyProps extends Omit<BusinessAppContextProps, 'employee'> {
    onBack?: () => void;
    employeeDetails?: {
      employeeId: string;
      firstName: string;
      lastName: string;
      organizationalUnit: {
        id: string;
        name: string;
      };
      supervisor: {
        firstName: string;
        id: string;
        lastName: string;
        userId: string;
      };
    };
}

interface ReferenceData {
  id: string;
  code: string;
  value: string;
}

interface NumberOfEmployeesOption extends ReferenceData {
}

const emptyCompanyData = {
  name: '',
  industry: {
    id: '',
    code: '',
    value: ''
  },
  description: '',
  founded: '',
  website: '',
  email: '',
  phone: '',
  numberOfEmployees: {
    id: '',
    code: '',
    value: ''
  },
  addresses: {
    addressLine: '',
    postalCode: '',
    city: '',
    region: {
      id: '',
      value: '',
      code: ''
    },
    country: {
      id: '',
      value: '',
      code: ''
    }
  },
  contact: [{
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  }],
  accountOwner: {
    id: '',
    name: ''
  },
  legalForm: {
    id: '',
    code: '',
    value: ''
  }
};

const AddNewCompany: React.FC<AddNewCompanyProps> = ({ accessToken, employeeDetails, onBack }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState(emptyCompanyData);
  
  const [industryOptions, setIndustryOptions] = useState<ReferenceData[]>([
    { id: "IndustryClass:v1:A", code: "A", value: "Agriculture, forestry and fishing" },
    { id: "IndustryClass:v1:I", code: "I", value: "Accommodation and food service activities" },
    { id: "IndustryClass:v1:P", code: "P", value: "Education" },
    { id: "IndustryClass:v1:R", code: "R", value: "Arts, entertainment and recreation" },
    { id: "IndustryClass:v1:T", code: "T", value: "Activities of households as employers; undifferentiated goods- and services-producing activities of households for own use" },
    { id: "IndustryClass:v1:U", code: "U", value: "Activities of extraterritorial organizations and bodies" }
  ]);

  const [legalFormOptions, setLegalFormOptions] = useState<ReferenceData[]>([
    { id: "LegalForm:v1:LLC", code: "LLC", value: "Limited Liability Company LLC" },
    { id: "LegalForm:v1:C-CORP", code: "C-CORP", value: "C Corporation" },
    { id: "LegalForm:v1:S-CORP", code: "S-CORP", value: "S Corporation" },
    { id: "LegalForm:v1:GP", code: "GP", value: "General Partnership (GP)" },
    { id: "LegalForm:v1:LP", code: "LP", value: "Limited Partnerships (LP)" },
    { id: "LegalForm:v1:PRIVATE", code: "PRIVATE", value: "Private Limited Company" }
  ]);

  const [numberOfEmployeesOptions, setNumberOfEmployeesOptions] = useState<NumberOfEmployeesOption[]>([
    { id: "EmployeeSize:v1:10", code: "10", value: "1-10" },
    { id: "EmployeeSize:v1:20", code: "20", value: "11-50" },
    { id: "EmployeeSize:v1:30", code: "30", value: "51-100" },
    { id: "EmployeeSize:v1:40", code: "40", value: "101-500" },
    { id: "EmployeeSize:v1:50", code: "50", value: "501-1000" },
    { id: "EmployeeSize:v1:60", code: "60", value: "1001-5000" },
    { id: "EmployeeSize:v1:70", code: "70", value: "5001-10000" }
  ]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setCompanyData((prevData) => {
      if (field.includes('.')) {
        const parts = field.split('.');
        if (parts.length === 3) {
          const [parent, child, subChild] = parts;
          return {
            ...prevData,
            [parent]: {
              ...(prevData as any)[parent],
              [child]: {
                ...(prevData as any)[parent][child],
                [subChild]: value
              }
            }
          };
        } else {
          const [parent, child] = parts;
          return {
            ...prevData,
            [parent]: {
              ...(prevData as any)[parent],
              [child]: value
            }
          };
        }
      }
      
      if (field === 'industry' && typeof value === 'string') {
        const selectedIndustry = industryOptions.find(option => option.id === value);
        return { ...prevData, industry: selectedIndustry || { id: '', code: '', value: '' } };
      }
      
      if (field === 'legalForm' && typeof value === 'string') {
        const selectedLegalForm = legalFormOptions.find(option => option.id === value);
        return { ...prevData, legalForm: selectedLegalForm || { id: '', code: '', value: '' } };
      }
      
      if (field === 'numberOfEmployees' && typeof value === 'string') {
        const selectedSize = numberOfEmployeesOptions.find(option => option.id === value);
        return { ...prevData, numberOfEmployees: selectedSize || { id: '', code: '', value: '' } };
      }
      
      return { ...prevData, [field]: value };
    });
  };

  const handleContactChange = (index: number, field: string, value: any) => {
    setCompanyData((prevData) => {
      const updatedContacts = [...prevData.contact];
      updatedContacts[index] = {
        ...updatedContacts[index],
        [field]: value
      };
      return {
        ...prevData,
        contact: updatedContacts
      };
    });
  };

  const handleSave = async () => {
    console.log(employeeDetails)
    try {
      setLoading(true);
      const savePayload = {
        changeMode: "INSERT",
        account: {
          name: companyData.name || "",
          website: companyData.website,
          foundationDate: companyData.founded ? new Date(companyData.founded).toISOString() : undefined,
          email: companyData.email,
          phone: companyData.phone,
          numberOfEmployeesRef: companyData.numberOfEmployees?.id,
          ownerEmployee: employeeDetails?.employeeId,
          industryRef: companyData.industry?.id,
          legalFormRef: companyData.legalForm?.id,
          addresses: [{
            addressType: "PRIMARY_ADDRESS",
            addressLine: companyData.addresses.addressLine,
            postalCode: companyData.addresses.postalCode,
            city: companyData.addresses.city,
            regionRef: companyData?.addresses?.region?.id,
            countryRef: companyData?.addresses?.country?.id
          }]
        }
      };

      const response = await fetch(
        'https://newwork-dev.newwork.com/processes/customer-relations/saveAccount',
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
      
      if (response.ok || responseData?.account?.id) {
        message.success('Company created successfully');
        
        if (responseData?.account?.id) {
          console.log('Created company with ID:', responseData.account.id);
        }
        
        handleBack(); 
      } else {
        const errorMessage = responseData.message || response.statusText || 'Unknown error';
        throw new Error(`Failed to create company: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating company:', error);
      message.error(`Failed to create company: ${error instanceof Error ? error.message : String(error)}`);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gba:add-new-company-container" style={{ padding: '24px' }}>
      <Spin spinning={loading} tip="Saving company...">
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              className="gba:add-new-company-back-button"
            >
              Back to Companies
            </Button>
            <Title level={2} style={{ margin: '16px 0' }}>Create New Company</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                onClick={handleBack}
                icon={<CloseOutlined />}
                className="gba:add-new-company-cancel-button"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                onClick={handleSave}
                icon={<SaveOutlined />}
                className="gba:add-new-company-save-button"
                disabled={!companyData.name}
              >
                Create Company
              </Button>
            </Space>
          </Col>
        </Row>

        {error && (
          <Row style={{ marginBottom: '20px' }}>
            <Col span={24}>
              <div className="gba:add-new-company-error-message" style={{ color: 'red' }}>
                {error}
              </div>
            </Col>
          </Row>
        )}

        <Row gutter={24}>
          <Col span={16}>
            <Card className="gba:add-new-company-info-card" title="Company Information">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Company Name*</Text>
                  <Input 
                    placeholder="Enter company name" 
                    value={companyData.name} 
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
                
                <Col span={12}>
                  <Text strong>Industry</Text>
                  <Select
                    placeholder="Select industry"
                    style={{ width: '100%' }}
                    value={companyData.industry?.id}
                    onChange={(value) => handleFieldChange('industry', value)}
                    className="gba:add-new-company-select-field"
                  >
                    {industryOptions.map(option => (
                      <Option key={option.id} value={option.id}>{option.value}</Option>
                    ))}
                  </Select>
                </Col>

                <Col span={12}>
                  <Text strong>Legal Form</Text>
                  <Select
                    placeholder="Select legal form"
                    style={{ width: '100%' }}
                    value={companyData.legalForm?.id}
                    onChange={(value) => handleFieldChange('legalForm', value)}
                    className="gba:add-new-company-select-field"
                  >
                    {legalFormOptions.map(option => (
                      <Option key={option.id} value={option.id}>{option.value}</Option>
                    ))}
                  </Select>
                </Col>

                <Col span={12}>
                  <Text strong>Foundation Date</Text>
                  <DatePicker 
                    style={{ width: '100%' }} 
                    onChange={(date) => handleFieldChange('founded', date ? date.toDate() : null)}
                    className="gba:add-new-company-date-picker"
                  />
                </Col>

                <Col span={12}>
                  <Text strong>Number of Employees</Text>
                  <Select
                    placeholder="Select number of employees"
                    style={{ width: '100%' }}
                    value={companyData.numberOfEmployees?.id}
                    onChange={(value) => handleFieldChange('numberOfEmployees', value)}
                    className="gba:add-new-company-select-field"
                  >
                    {numberOfEmployeesOptions.map(option => (
                      <Option key={option.id} value={option.id}>{option.value}</Option>
                    ))}
                  </Select>
                </Col>

                <Col span={24}>
                  <Text strong>Website</Text>
                  <Input 
                    prefix={<GlobalOutlined />}
                    placeholder="https://example.com" 
                    value={companyData.website} 
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>

                <Col span={12}>
                  <Text strong>Email</Text>
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="contact@example.com" 
                    value={companyData.email} 
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>

                <Col span={12}>
                  <Text strong>Phone</Text>
                  <Input 
                    prefix={<PhoneOutlined />}
                    placeholder="+1 (123) 456-7890" 
                    value={companyData.phone} 
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
              </Row>
            </Card>

            <Card className="gba:add-new-company-address-card" title="Address Information" style={{ marginTop: '20px' }}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Address Line</Text>
                  <Input 
                    placeholder="123 Business Street" 
                    value={companyData.addresses.addressLine} 
                    onChange={(e) => handleFieldChange('addresses.addressLine', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
                
                <Col span={12}>
                  <Text strong>City</Text>
                  <Input 
                    placeholder="City" 
                    value={companyData.addresses.city} 
                    onChange={(e) => handleFieldChange('addresses.city', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>

                <Col span={12}>
                  <Text strong>Postal Code</Text>
                  <Input 
                    placeholder="12345" 
                    value={companyData.addresses.postalCode} 
                    onChange={(e) => handleFieldChange('addresses.postalCode', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>

                <Col span={12}>
                  <Text strong>Region/State</Text>
                  <Select
                    placeholder="Select region"
                    style={{ width: '100%' }}
                    value={companyData.addresses.region.id}
                    onChange={(value) => handleFieldChange('addresses.region.id', value)}
                    className="gba:add-new-company-select-field"
                  >
                    <Option value="region1">California</Option>
                    <Option value="region2">New York</Option>
                    <Option value="region3">Texas</Option>
                  </Select>
                </Col>

                <Col span={12}>
                  <Text strong>Country</Text>
                  <Select
                    placeholder="Select country"
                    style={{ width: '100%' }}
                    value={companyData.addresses.country.id}
                    onChange={(value) => handleFieldChange('addresses.country.id', value)}
                    className="gba:add-new-company-select-field"
                  >
                    <Option value="country1">United States</Option>
                    <Option value="country2">Germany</Option>
                    <Option value="country3">United Kingdom</Option>
                    <Option value="country4">France</Option>
                  </Select>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={8}>
            <Card className="gba:add-new-company-contact-card" title="Primary Contact">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>First Name</Text>
                  <Input 
                    placeholder="First Name" 
                    value={companyData.contact[0]?.firstName} 
                    onChange={(e) => handleContactChange(0, 'firstName', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
                <Col span={12}>
                  <Text strong>Last Name</Text>
                  <Input 
                    placeholder="Last Name" 
                    value={companyData.contact[0]?.lastName} 
                    onChange={(e) => handleContactChange(0, 'lastName', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
                <Col span={24}>
                  <Text strong>Email</Text>
                  <Input 
                    placeholder="email@example.com" 
                    value={companyData.contact[0]?.email} 
                    onChange={(e) => handleContactChange(0, 'email', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
                <Col span={24}>
                  <Text strong>Phone</Text>
                  <Input 
                    placeholder="+1 (123) 456-7890" 
                    value={companyData.contact[0]?.phone} 
                    onChange={(e) => handleContactChange(0, 'phone', e.target.value)}
                    className="gba:add-new-company-input-field"
                  />
                </Col>
              </Row>
            </Card>

            <Card className="gba:add-new-company-owner-card" title="Account Owner" style={{ marginTop: '20px' }}>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text strong>Owner</Text>
                  <Input 
                    prefix={<UserOutlined />}
                    disabled
                    value={`${employeeDetails?.firstName || ''} ${employeeDetails?.lastName || ''}`} 
                    className="gba:add-new-company-input-field"
                  />
                  <Text type="secondary">Default owner is set to current user</Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default AddNewCompany;
