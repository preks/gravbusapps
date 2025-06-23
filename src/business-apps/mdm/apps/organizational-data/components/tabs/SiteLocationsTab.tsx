import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title } = Typography;
const { Option } = Select;

export interface SiteLocation {
  id: string;
  name: string;
  code: string;
  type: 'Headquarters' | 'Office' | 'Branch' | 'Remote' | 'Coworking' | 'Other';
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  timezone: string;
  capacity: number;
  currentOccupancy: number;
  facilities: string[];
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: 'Active' | 'Inactive' | 'Under Construction';
  description?: string;
}

export interface SiteLocationsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

// Mock data for demonstration
const mockSiteLocations: SiteLocation[] = [
  {
    id: '1',
    name: 'Hamburg Headquarters',
    code: 'HH-HQ',
    type: 'Headquarters',
    address: 'Dammtorstraße 30',
    city: 'Hamburg',
    country: 'Germany',
    postalCode: '20354',
    timezone: 'Europe/Berlin',
    capacity: 800,
    currentOccupancy: 650,
    facilities: ['Cafeteria', 'Gym', 'Parking', 'Conference Rooms', 'Rooftop Terrace'],
    contactPerson: 'Maria Schmidt',
    phone: '+49 40 419 131 0',
    email: 'facility.hamburg@newwork.se',
    status: 'Active',
    description: 'Main headquarters building with all central functions'
  },
  {
    id: '2',
    name: 'Vienna Office',
    code: 'VIE-OFF',
    type: 'Office',
    address: 'Gonzagagasse 11',
    city: 'Vienna',
    country: 'Austria',
    postalCode: '1010',
    timezone: 'Europe/Vienna',
    capacity: 150,
    currentOccupancy: 120,
    facilities: ['Conference Rooms', 'Kitchen', 'Parking'],
    contactPerson: 'Thomas Müller',
    phone: '+43 1 512 56 78',
    email: 'facility.vienna@newwork.se',
    status: 'Active',
    description: 'kununu development and operations office'
  },
  {
    id: '3',
    name: 'Berlin Office',
    code: 'BER-OFF',
    type: 'Office',
    address: 'Friedrichstraße 68',
    city: 'Berlin',
    country: 'Germany',
    postalCode: '10117',
    timezone: 'Europe/Berlin',
    capacity: 200,
    currentOccupancy: 180,
    facilities: ['Conference Rooms', 'Kitchen', 'Bike Storage', 'Rooftop Access'],
    contactPerson: 'Lisa Weber',
    phone: '+49 30 2062 5800',
    email: 'facility.berlin@newwork.se',
    status: 'Active',
    description: 'honeypot and business development office'
  },
  {
    id: '4',
    name: 'Munich Branch',
    code: 'MUC-BR',
    type: 'Branch',
    address: 'Maximilianstraße 13',
    city: 'Munich',
    country: 'Germany',
    postalCode: '80539',
    timezone: 'Europe/Berlin',
    capacity: 80,
    currentOccupancy: 45,
    facilities: ['Conference Rooms', 'Kitchen'],
    contactPerson: 'Robert Schmidt',
    phone: '+49 89 2154 7890',
    email: 'facility.munich@newwork.se',
    status: 'Active',
    description: 'Sales and customer success branch office'
  },
  {
    id: '5',
    name: 'Barcelona Coworking',
    code: 'BCN-COW',
    type: 'Coworking',
    address: 'Carrer de Pallars 193',
    city: 'Barcelona',
    country: 'Spain',
    postalCode: '08005',
    timezone: 'Europe/Madrid',
    capacity: 50,
    currentOccupancy: 12,
    facilities: ['Shared Workspace', 'Meeting Rooms', 'Kitchen'],
    contactPerson: 'Ana García',
    phone: '+34 93 456 7890',
    email: 'facility.barcelona@newwork.se',
    status: 'Active',
    description: 'Shared coworking space for remote employees'
  },
  {
    id: '6',
    name: 'Frankfurt Office',
    code: 'FRA-OFF',
    type: 'Office',
    address: 'Taunusanlage 9-10',
    city: 'Frankfurt am Main',
    country: 'Germany',
    postalCode: '60329',
    timezone: 'Europe/Berlin',
    capacity: 120,
    currentOccupancy: 0,
    facilities: ['Conference Rooms', 'Kitchen', 'Parking'],
    contactPerson: 'Michael Johnson',
    phone: '+49 69 7532 1000',
    email: 'facility.frankfurt@newwork.se',
    status: 'Under Construction',
    description: 'New office space under renovation'
  }
];

const SiteLocationsTab: React.FC<SiteLocationsTabProps> = ({ 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  
  const [siteLocations, setSiteLocations] = useState<SiteLocation[]>(mockSiteLocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SiteLocation | null>(null);
  const [form] = Form.useForm();

  const filteredLocations = siteLocations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingLocation(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: SiteLocation) => {
    setEditingLocation(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      type: record.type,
      address: record.address,
      city: record.city,
      state: record.state,
      country: record.country,
      postalCode: record.postalCode,
      timezone: record.timezone,
      capacity: record.capacity,
      currentOccupancy: record.currentOccupancy,
      facilities: record.facilities,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      status: record.status,
      description: record.description,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: SiteLocation) => {
    Modal.confirm({
      title: 'Delete Site Location',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSiteLocations(prev => prev.filter(location => location.id !== record.id));
          message.success('Site location deleted successfully');
        } catch (error) {
          console.error('Error deleting site location:', error);
          message.error('Failed to delete site location');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingLocation) {
        // Update existing location
        setSiteLocations(prev => 
          prev.map(location => 
            location.id === editingLocation.id 
              ? { ...location, ...values }
              : location
          )
        );
        message.success('Site location updated successfully');
      } else {
        // Create new location
        const newLocation: SiteLocation = {
          id: Date.now().toString(),
          ...values
        };
        setSiteLocations(prev => [...prev, newLocation]);
        message.success('Site location created successfully');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving site location:', error);
      message.error('Failed to save site location');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green';
      case 'Inactive': return 'red';
      case 'Under Construction': return 'orange';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Headquarters': return 'purple';
      case 'Office': return 'blue';
      case 'Branch': return 'cyan';
      case 'Remote': return 'green';
      case 'Coworking': return 'orange';
      default: return 'default';
    }
  };

  const getOccupancyRate = (current: number, capacity: number) => {
    if (capacity === 0) return 0;
    return Math.round((current / capacity) * 100);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: SiteLocation, b: SiteLocation) => a.code.localeCompare(b.code),
    },
    {
      title: 'Location Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: SiteLocation, b: SiteLocation) => a.name.localeCompare(b.name),
      render: (name: string, record: SiteLocation) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EnvironmentOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      width: 120,
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      width: 120,
    },
    {
      title: 'Occupancy',
      key: 'occupancy',
      width: 120,
      render: (_: any, record: SiteLocation) => {
        const rate = getOccupancyRate(record.currentOccupancy, record.capacity);
        return (
          <div>
            <div>{record.currentOccupancy}/{record.capacity}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>({rate}%)</div>
          </div>
        );
      },
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: SiteLocation) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-SiteLocationsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            {t('hr.site_locations_management', 'Site Locations Management')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-AddButton`}
          >
            Add Site Location
          </Button>
        </div>
        
        <Input
          placeholder="Search site locations..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-SearchInput`}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredLocations}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} site locations`,
        }}
        data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-Table`}
        style={{ background: 'white', borderRadius: '8px' }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingLocation ? 'Edit Site Location' : 'Add Site Location'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={900}
        data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-SiteLocationsTab-Form`}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Location Name"
              name="name"
              rules={[{ required: true, message: 'Please enter location name' }]}
            >
              <Input placeholder="Enter location name" />
            </Form.Item>
            
            <Form.Item
              label="Location Code"
              name="code"
              rules={[{ required: true, message: 'Please enter location code' }]}
            >
              <Input placeholder="e.g., HH-HQ" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Please select location type' }]}
            >
              <Select placeholder="Select location type">
                <Option value="Headquarters">Headquarters</Option>
                <Option value="Office">Office</Option>
                <Option value="Branch">Branch</Option>
                <Option value="Remote">Remote</Option>
                <Option value="Coworking">Coworking</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select placeholder="Select status">
                <Option value="Active">Active</Option>
                <Option value="Inactive">Inactive</Option>
                <Option value="Under Construction">Under Construction</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Address"
            name="address"
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <Input placeholder="Enter street address" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="City"
              name="city"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="Enter city" />
            </Form.Item>
            
            <Form.Item
              label="State/Province"
              name="state"
            >
              <Input placeholder="Enter state/province" />
            </Form.Item>
            
            <Form.Item
              label="Postal Code"
              name="postalCode"
              rules={[{ required: true, message: 'Please enter postal code' }]}
            >
              <Input placeholder="Enter postal code" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Country"
              name="country"
              rules={[{ required: true, message: 'Please enter country' }]}
            >
              <Input placeholder="Enter country" />
            </Form.Item>
            
            <Form.Item
              label="Timezone"
              name="timezone"
              rules={[{ required: true, message: 'Please select timezone' }]}
            >
              <Select placeholder="Select timezone" showSearch>
                <Option value="Europe/Berlin">Europe/Berlin</Option>
                <Option value="Europe/Vienna">Europe/Vienna</Option>
                <Option value="Europe/Madrid">Europe/Madrid</Option>
                <Option value="Europe/London">Europe/London</Option>
                <Option value="Europe/Paris">Europe/Paris</Option>
                <Option value="America/New_York">America/New_York</Option>
                <Option value="America/Los_Angeles">America/Los_Angeles</Option>
                <Option value="Asia/Tokyo">Asia/Tokyo</Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Capacity"
              name="capacity"
              rules={[{ required: true, message: 'Please enter capacity' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter maximum capacity"
                min={1}
              />
            </Form.Item>
            
            <Form.Item
              label="Current Occupancy"
              name="currentOccupancy"
              rules={[{ required: true, message: 'Please enter current occupancy' }]}
            >
              <Input 
                type="number" 
                placeholder="Enter current occupancy"
                min={0}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Facilities"
            name="facilities"
          >
            <Select 
              mode="multiple" 
              placeholder="Select available facilities"
              style={{ width: '100%' }}
            >
              <Option value="Cafeteria">Cafeteria</Option>
              <Option value="Gym">Gym</Option>
              <Option value="Parking">Parking</Option>
              <Option value="Conference Rooms">Conference Rooms</Option>
              <Option value="Meeting Rooms">Meeting Rooms</Option>
              <Option value="Kitchen">Kitchen</Option>
              <Option value="Rooftop Terrace">Rooftop Terrace</Option>
              <Option value="Rooftop Access">Rooftop Access</Option>
              <Option value="Bike Storage">Bike Storage</Option>
              <Option value="Shared Workspace">Shared Workspace</Option>
              <Option value="Reception">Reception</Option>
              <Option value="Security">Security</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Contact Person"
              name="contactPerson"
            >
              <Input placeholder="Enter contact person name" />
            </Form.Item>
            
            <Form.Item
              label="Phone"
              name="phone"
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>
            
            <Form.Item
              label="Email"
              name="email"
            >
              <Input placeholder="Enter email address" />
            </Form.Item>
          </div>
          
          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea 
              placeholder="Enter location description (optional)" 
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { SiteLocationsTab }; 