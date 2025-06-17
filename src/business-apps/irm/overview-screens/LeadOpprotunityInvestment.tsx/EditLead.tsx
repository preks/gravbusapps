import React, { useEffect, useState, useMemo } from "react";
import { Typography, Form, Input, Button, message, Spin, Select } from "antd";
import { EnvironmentOutlined, CalendarOutlined, DollarOutlined, GlobalOutlined, ArrowLeftOutlined, TeamOutlined, BankOutlined } from "@ant-design/icons";
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";
import { useGraphqlClient } from "../../../../common/network/graphql/useGraphQLClient";
import { useCatalogManagerClient } from "../../../../common/network/catalogs/useCatalogManagerClient";

const { Title } = Typography;
const { Option } = Select;

interface ReferenceData {
  id: string;
  code: string;
  value: string;
}

interface Activity {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'note';
    title: string;
    date: string;
    user: {
      name: string;
      avatar?: string;
    };
    description?: string;
  }
  
  // Define opportunity type
  interface Opportunity {
    id: string;
    name: string;
    value: number;
    stage: "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
    probability: number;
    expectedCloseDate: string;
    owner: string;
    stageColor: string;
  }

  interface Contact {
    id: string;
    name: string;
    position: string;
    email: string;
    phone: string;
    lastContact: string;
    isPrimary: boolean;
  }

  
interface Lead {
    id: string;
    name: string;
    version: string;
    logo?: string;
    status: string;
    statusRef?: string;
    industryRef?: string;
    industry: {
      value?: string;
      type?: string;
      id?: string;
      code?: string;
    };
    size: string;
    numberOfEmployeesRef?: string;
    numberOfEmployees?: {
      value?: string;
      type?: string;
      id?: string;
      code?: string;
    };
    website: string;
    description: string;
    address: string;
    revenue: string;
    annualRevenueRef?: string;
    regionRef?: string;
    legalForm?: string | {
      value?: string;
      type?: string;
      id?: string;
      code?: string;
    };
    legalFormRef?: string;
    contacts: Contact[];
    activities: Activity[];
    opportunities: Opportunity[];
    aiSummary: {
      text: string;
      insights: string[];
      recommendations: string[];
    };
  }

interface EditLeadProps extends BusinessAppContextProps {
  leadData: Lead;
  onCancel: () => void;
  onSave: (updatedData: Partial<Lead>) => void;
}

const EditLead: React.FC<EditLeadProps> = (props) => {
  const { leadData, onCancel, onSave, accessToken } = props;
  const [form] = Form.useForm();
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  const [industryOptions, setIndustryOptions] = useState<ReferenceData[]>([]);
  const [numberOfEmployeesOptions, setNumberOfEmployeesOptions] = useState<ReferenceData[]>([]);
  
  const graphQLClient = useGraphqlClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  // Fetch catalog data for industry and employee size options
  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        setLoading(true);
        
        // Fetch industry classes
        const industryClassResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'IndustryClass', 
          version: 'v1' 
        });
        
        if (industryClassResponse.data) {
          setIndustryOptions(industryClassResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
        
        // Fetch employee size options
        const employeeSizeResponse = await catalogClient.getCatalogEntriesList({ 
          catalogIdentifier: 'EmployeeSize', 
          version: 'v1' 
        });
        
        if (employeeSizeResponse.data) {
          setNumberOfEmployeesOptions(employeeSizeResponse.data.map((entry: any) => ({
            id: entry.id,
            code: entry.code,
            value: entry.value
          })));
        }
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        message.error('Failed to load reference data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCatalogData();
  }, [catalogClient]);

  // Prepare initial values for the form - these will be overridden by the useEffect after catalog data loads
  const initialValues = useMemo(() => {
    const logAndReturn = (values: any) => {
      console.log('Initial form values:', values);
      return values;
    };

    return logAndReturn({
      ...leadData,
      companyName: leadData?.name,
      industry: leadData?.industryRef,
      numberOfEmployees: leadData?.numberOfEmployeesRef
    });
  }, [leadData]);

  // Apply form values once catalog data is loaded and we have lead data
  useEffect(() => {
    if (!loading && leadData && form) {
      console.log('Applying catalog values to form. Lead data:', leadData);
      
      // Try to match industry by id first, then by code or value if needed
      if (leadData.industryRef) {
        const industryMatch = industryOptions.find(
          option => 
            option.id === leadData.industryRef || 
            option.code === leadData.industry?.code ||
            option.value === leadData.industry?.value
        );
        
        if (industryMatch) {
          form.setFieldsValue({ industry: industryMatch.id });
          console.log('Setting industry field to:', industryMatch.id, industryMatch.value);
        }
      }
      
      // For numberOfEmployees, prioritize size field first, then numberOfEmployees
      let employeeValueSet = false;
      
      // First try to use the size field if it exists (THIS IS THE PRIORITY)
      if (leadData.numberOfEmployees) {
        console.log('Trying to match size field value:', leadData.numberOfEmployees.value);
        const sizeValueMatch = numberOfEmployeesOptions.find(
          option => 
            option.value === leadData.numberOfEmployees?.value || 
            option.code === leadData.numberOfEmployees?.code
        );
        
        if (sizeValueMatch) {
          form.setFieldsValue({ numberOfEmployees: sizeValueMatch.id });
          employeeValueSet = true;
          console.log('Setting numberOfEmployees from size data:', sizeValueMatch.id, sizeValueMatch.value);
        }
      }
      
      // Only if size didn't match, try numberOfEmployees field
      if (!employeeValueSet && leadData.numberOfEmployeesRef) {
        console.log('Trying to match numberOfEmployees field value:', leadData.numberOfEmployeesRef);
        const employeeMatch = numberOfEmployeesOptions.find(
          option => 
            option.code === leadData.numberOfEmployees?.code ||
            option.value === leadData.numberOfEmployees?.value
        );
        
        if (employeeMatch) {
          form.setFieldsValue({ numberOfEmployees: employeeMatch.id });
          console.log('Setting numberOfEmployees field using numberOfEmployees data:', employeeMatch.id, employeeMatch.value);
        }
      }
      
      // After all matching attempts, log the final form values
      console.log('Final form values after catalog matching:', form.getFieldsValue());
    }
  }, [loading, leadData, form, industryOptions, numberOfEmployeesOptions]);

  useEffect(() => {
    if (leadData?.industry) {
      console.log('Lead industry data:', leadData.industry);
    }
    if (leadData?.numberOfEmployees) {
      console.log('Lead employees data:', leadData.numberOfEmployees);
    }
    if (leadData?.numberOfEmployees) {
      console.log('Lead size data:', leadData.numberOfEmployees);
    }
  }, [leadData]);

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      console.log("Savaee?????")
      // Parse the address field to get city, postalCode, and country
      let city = "";
      let postalCode = "";
      let country = "";
      
      if (values.address) {
        const addressParts = values.address.split(',').map((part: string) => part.trim());
        if (addressParts.length >= 1) city = addressParts[0];
        if (addressParts.length >= 2) postalCode = addressParts[1];
        if (addressParts.length >= 3) country = addressParts[2];
      }

      // Get the selected industry and employee size objects
      const selectedIndustry = industryOptions.find(option => option.id === values.industry);
      const selectedEmployeeSize = numberOfEmployeesOptions.find(option => option.id === values.numberOfEmployees);

      console.log('Selected Industry ID:', values.industry);
      console.log('Selected Industry Object:', selectedIndustry);
      console.log('Selected Employee Size ID:', values.numberOfEmployees);
      console.log('Selected Employee Size Object:', selectedEmployeeSize);

      // Prepare the payload for the API
      const savePayload = {
        changeMode: "UPDATE", // Using UPDATE since we're editing an existing lead
        id: leadData.id,
        lead: {
          version: leadData?.version || 0,
          companyName: values.companyName,
          companyWebsite: values.website || "",
        //   city: city,
        //   postalCode: postalCode,
        //   countryRef: country,
        //   annualRevenueRef: values.revenue || "",
        //   industryRef: values.industry || "",
        //   numberOfEmployeesRef: values.numberOfEmployees || "",
        //   statusRef: leadData.statusRef || "",
        //   regionRef: leadData.regionRef || "",
        //   legalFormRef: leadData.legalFormRef || ""
        }
      };
      
      console.log('Saving lead data with payload:', savePayload);
      
      // Call the REST API to save the lead data
      const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveLead', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || 'Failed to save lead data');
      }
      
      // Update the local data and UI
      onSave({
        ...leadData,
        name: values.companyName,
        address: values.address,
        revenue: values.revenue,
        website: values.website,
        industryRef: values.industry,
        industry: selectedIndustry ? {
          id: selectedIndustry.id,
          code: selectedIndustry.code,
          value: selectedIndustry.value
        } : undefined,
        numberOfEmployeesRef: values.numberOfEmployees,
        numberOfEmployees: selectedEmployeeSize ? {
          id: selectedEmployeeSize.id,
          code: selectedEmployeeSize.code,
          value: selectedEmployeeSize.value
        } : undefined,
        // Keep other reference fields
        statusRef: leadData.statusRef,
        regionRef: leadData.regionRef,
        legalFormRef: leadData.legalFormRef,
        legalForm: leadData.legalForm
      });
      
      message.success("Lead information updated successfully");
    } catch (err) {
      console.error("Error updating lead:", err);
      message.error("Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gba:edit-lead-container" data-testid="edit-lead-detail" style={{ backgroundColor: 'white', padding: '16px', width: '100%' }}>
      <Spin spinning={loading || saving} tip={saving ? "Saving changes..." : "Loading data..."}>
        {/* Back navigation */}
        <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            data-testid="back-button"
            onClick={onCancel}
          >
            <span style={{ marginLeft: '4px' }}>Back to Lead</span>
          </Button>
        </div>

        {/* Lead header */}
        <div className="gba:lead-header" style={{ 
          marginBottom: '24px', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                backgroundColor: '#f5f5f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '20px', 
                color: '#1890ff', 
                fontWeight: 'bold' 
              }} data-testid="company-avatar">
                {leadData?.name ? leadData.name[0] : 'A'}
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }} data-testid="company-name">
                  {leadData?.name || 'Company Name'}
                </div>
                <div style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {leadData?.industry?.value && (
                    <span data-testid="company-industry">
                      <BankOutlined style={{ marginRight: '4px' }} /> {leadData.industry.value}
                    </span>
                  )}
                  {leadData?.numberOfEmployees?.value && (
                    <span data-testid="company-size">
                      <TeamOutlined style={{ marginRight: '4px' }} /> {leadData.numberOfEmployees.value}
                    </span>
                  )}
                  {!leadData?.numberOfEmployees?.value && leadData?.numberOfEmployees?.value && (
                    <span data-testid="company-employees">
                      <TeamOutlined style={{ marginRight: '4px' }} /> {leadData.numberOfEmployees.value}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '16px', color: '#666' }} data-testid="edit-mode-indicator">
                  Edit Company Information
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit form - now full width */}
        <div className="gba:company-edit-card" data-testid="company-edit-card" style={{ 
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          width: '100%'
        }}>
          <Title level={4}>Company Information</Title>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={initialValues}
            style={{ marginTop: '24px' }}
          >
            {/* Company Name field */}
            <Form.Item
              name="companyName"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BankOutlined style={{ marginRight: '8px' }} />
                  <span>Company Name</span>
                </div>
              }
              rules={[{ required: true, message: 'Please enter the company name' }]}
            >
              <Input placeholder="Enter company name" data-testid="company-name-input" />
            </Form.Item>

            <Form.Item
              name="address"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EnvironmentOutlined style={{ marginRight: '8px' }} />
                  <span>Address</span>
                </div>
              }
              rules={[{ required: true, message: 'Please enter the company address' }]}
            >
              <Input placeholder="Enter company address (City, Postal Code, Country)" data-testid="address-input" />
            </Form.Item>
            
            <Form.Item
              name="founded"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <span>Founded</span>
                </div>
              }
            >
              <Input placeholder="Enter founding year" data-testid="founded-input" />
            </Form.Item>
            
            <Form.Item
              name="revenue"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  <span>Annual Revenue</span>
                </div>
              }
            >
              <Input placeholder="Enter annual revenue" data-testid="revenue-input" />
            </Form.Item>
            
            <Form.Item
              name="website"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <GlobalOutlined style={{ marginRight: '8px' }} />
                  <span>Website</span>
                </div>
              }
            >
              <Input placeholder="Enter website URL" data-testid="website-input" />
            </Form.Item>
            
            {/* Industry field */}
            <Form.Item
              name="industry"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BankOutlined style={{ marginRight: '8px' }} />
                  <span>Industry</span>
                </div>
              }
            >
              <Select 
                placeholder="Select industry" 
                data-testid="industry-select"
                allowClear
                loading={loading}
                style={{ width: '100%' }}
              >
                {industryOptions.map(option => (
                  <Option key={option.id} value={option.id}>{option.value}</Option>
                ))}
              </Select>
            </Form.Item>
            
            {/* Number of Employees field */}
            <Form.Item
              name="numberOfEmployees"
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TeamOutlined style={{ marginRight: '8px' }} />
                  <span>Number of Employees</span>
                </div>
              }
            >
              <Select 
                placeholder="Select employee count" 
                data-testid="employees-select"
                allowClear
                loading={loading}
                style={{ width: '100%' }}
              >
                {numberOfEmployeesOptions.map(option => (
                  <Option key={option.id} value={option.id}>{option.value}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <div className="gba:form-actions" style={{ 
              display: 'flex', 
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px'
            }}>
              <Button 
                onClick={onCancel}
                data-testid="cancel-button"
                style={{
                  borderColor: '#d9d9d9',
                  color: '#000000',
                  backgroundColor: 'white',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 'normal',
                  fontSize: '14px',
                  borderRadius: '4px'
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
                data-testid="save-button"
                style={{
                  backgroundColor: '#000000',
                  borderColor: '#000000',
                  height: '36px',
                  padding: '0 16px',
                  fontWeight: 'normal',
                  fontSize: '14px',
                  borderRadius: '4px'
                }}
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </div>
  );
};

export default EditLead;
