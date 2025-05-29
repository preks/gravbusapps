import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  Input, 
  Card, 
  Row, 
  Col, 
  Table, 
  Tag,
  Avatar 
} from 'antd';
import CompanyDetail from '../../detail-screens/CompanyDetail/CompanyDetail';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined,
  BankOutlined,
  AreaChartOutlined,
  DollarOutlined,
  TeamOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// Helper function to generate a consistent color from a string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
};

interface Company {
  key: string;
  name: string;
  location: string;
  industry: string;
  size: string; // employee_count_group
  mainContact: {
    id: string;
    name: string;
    email?: string;
  };
  accountOwner: {
    id: string;
    name: string;
    avatar?: string;
  };
  website: string; // company_page_url
  tags: string[];
  lastContacted: string;
}

const CompanyOverview: React.FC = () => {
  // State to control creation mode
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  // State for selected company (for viewing details)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  // Function to navigate to company detail page
  const navigateToCompanyDetail = (companyId: string) => {
    // In a real application with routing, you would use something like:
    // navigate(`/companies/${companyId}`) from react-router-dom
    console.log(`Navigating to company details for ID: ${companyId}`);
    
    // For demonstration purposes only - simulating navigation
    // In a real app, you would use proper routing
    alert(`Navigating to company details for ID: ${companyId}`);
  };
  // State for search functionality
  const [searchText, setSearchText] = useState<string>('');

  // Mock data based on the JIRA ticket requirements
  const companies: Company[] = [
    {
      key: '1',
      name: 'Acme Corporation',
      industry: 'Technology',
      size: '1001-5000',
      location: 'New York, NY',
      mainContact: {
        id: 'c1',
        name: 'John Smith',
        email: 'john.smith@example.com'
      },
      accountOwner: {
        id: 'e1',
        name: 'Sarah Johnson',
        avatar: '/avatars/sarah.jpg'
      },
      website: 'acmecorp.com',
      tags: ['Enterprise', 'Key Account', 'Technology'],
      lastContacted: '5/15/2023',
    },
    {
      key: '2',
      name: 'Tech Solutions Inc.',
      industry: 'Software',
      size: '101-250',
      location: 'San Francisco, CA',
      mainContact: {
        id: 'c2',
        name: 'Emily Davis',
        email: 'emily.davis@example.com'
      },
      accountOwner: {
        id: 'e2',
        name: 'Robert Taylor',
        avatar: '/avatars/robert.jpg'
      },
      website: 'techsolutions.com',
      tags: ['Mid-Market', 'Software'],
      lastContacted: '5/18/2023',
    },
    {
      key: '3',
      name: 'Global Innovations',
      industry: 'Manufacturing',
      size: '1001-5000',
      location: 'Chicago, IL',
      mainContact: {
        id: 'c3',
        name: 'Michael Brown',
        email: 'michael.brown@example.com'
      },
      accountOwner: {
        id: 'e3',
        name: 'Lisa Anderson',
        avatar: '/avatars/lisa.jpg'
      },
      website: 'globalinnovations.com',
      tags: ['Enterprise', 'Manufacturing'],
      lastContacted: '5/10/2023',
    },
    {
      key: '4',
      name: 'Future Systems',
      industry: 'Technology',
      size: '11-50',
      location: 'Austin, TX',
      mainContact: {
        id: 'c4',
        name: 'David Wilson',
        email: 'david.wilson@example.com'
      },
      accountOwner: {
        id: 'e4',
        name: 'Sarah Johnson',
        avatar: '/avatars/sarah.jpg'
      },
      website: 'futuresystems.com',
      tags: ['SMB', 'Technology', 'Startup'],
      lastContacted: '4/23/2023',
    },
    {
      key: '5',
      name: 'Bright Ideas Ltd.',
      industry: 'Consulting',
      size: '11-50',
      location: 'Boston, MA',
      mainContact: {
        id: 'c5',
        name: 'Jennifer Lee',
        email: 'jennifer.lee@example.com'
      },
      accountOwner: {
        id: 'e5',
        name: 'Robert Taylor',
        avatar: '/avatars/robert.jpg'
      },
      website: 'brightideas.com',
      tags: ['SMB', 'Consulting'],
      lastContacted: '5/12/2023',
    },
    {
      key: '6',
      name: 'Smart Solutions',
      industry: 'Software',
      size: '251-500',
      location: 'Seattle, WA',
      mainContact: {
        id: 'c6',
        name: 'William Chen',
        email: 'william.chen@example.com'
      },
      accountOwner: {
        id: 'e6',
        name: 'Lisa Anderson',
        avatar: '/avatars/lisa.jpg'
      },
      website: 'smartsolutions.com',
      tags: ['Mid-Market', 'Software', 'AI'],
      lastContacted: '5/20/2023',
    },
    {
      key: '7',
      name: 'Innovative Tech',
      industry: 'Technology',
      size: '501-1000',
      location: 'Los Angeles, CA',
      mainContact: {
        id: 'c7',
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com'
      },
      accountOwner: {
        id: 'e1',
        name: 'Sarah Johnson',
        avatar: '/avatars/sarah.jpg'
      },
      website: 'innovativetech.com',
      tags: ['Enterprise', 'Technology'],
      lastContacted: '4/15/2023',
    },
    // European Companies
    {
      key: '8',
      name: 'Pinch Studio',
      industry: 'Design',
      size: '1-10',
      location: 'Lisbon, Portugal',
      mainContact: {
        id: 'c8',
        name: 'Marta Costa',
        email: 'marta@pinchstudio.pt'
      },
      accountOwner: {
        id: 'e8',
        name: 'Rui Almeida',
        avatar: '/avatars/rui.jpg'
      },
      website: 'www.pinchstudio.pt',
      tags: ['SMB', 'Design', 'Europe'],
      lastContacted: '5/25/2023',
    },
    {
      key: '9',
      name: 'True Gum',
      industry: 'Food Products',
      size: '11-50',
      location: 'Copenhagen, DK',
      mainContact: {
        id: 'c9',
        name: 'Peter Ellegaard',
        email: 'peter@truegum.com'
      },
      accountOwner: {
        id: 'e9',
        name: 'Mia Sørensen',
        avatar: '/avatars/mia.jpg'
      },
      website: 'www.truegum.com',
      tags: ['SMB', 'Food Products', 'Europe'],
      lastContacted: '5/21/2023',
    },
    {
      key: '10',
      name: 'Worksome',
      industry: 'SaaS',
      size: '51-100',
      location: 'London, UK',
      mainContact: {
        id: 'c10',
        name: 'Morten Petersen',
        email: 'morten@worksome.com'
      },
      accountOwner: {
        id: 'e10',
        name: 'Carla Evans',
        avatar: '/avatars/carla.jpg'
      },
      website: 'www.worksome.com',
      tags: ['SMB', 'SaaS', 'Europe'],
      lastContacted: '5/22/2023',
    },
    {
      key: '11',
      name: 'Klevu',
      industry: 'eCommerce Tech',
      size: '101-250',
      location: 'Helsinki, Finland',
      mainContact: {
        id: 'c11',
        name: 'Sampo Virolainen',
        email: 'sampo@klevu.com'
      },
      accountOwner: {
        id: 'e11',
        name: 'Tommi Ruotanen',
        avatar: '/avatars/tommi.jpg'
      },
      website: 'www.klevu.com',
      tags: ['Mid-Market', 'eCommerce Tech', 'Europe'],
      lastContacted: '5/19/2023',
    },
    {
      key: '12',
      name: 'Ecosia',
      industry: 'Search Engine',
      size: '251-500',
      location: 'Berlin, Germany',
      mainContact: {
        id: 'c12',
        name: 'Christian Kroll',
        email: 'christian@ecosia.org'
      },
      accountOwner: {
        id: 'e12',
        name: 'Ana Schmidt',
        avatar: '/avatars/ana.jpg'
      },
      website: 'www.ecosia.org',
      tags: ['Mid-Market', 'Search Engine', 'Europe'],
      lastContacted: '5/24/2023',
    },
    {
      key: '13',
      name: 'Personio',
      industry: 'HR Software',
      size: '501-1000',
      location: 'Munich, Germany',
      mainContact: {
        id: 'c13',
        name: 'Hanno Renner',
        email: 'hanno@personio.com'
      },
      accountOwner: {
        id: 'e13',
        name: 'Julia Meyer',
        avatar: '/avatars/julia.jpg'
      },
      website: 'www.personio.com',
      tags: ['Mid-Market', 'HR Software', 'Europe'],
      lastContacted: '5/17/2023',
    },
    {
      key: '14',
      name: 'Miro',
      industry: 'Collaboration',
      size: '1001-2500',
      location: 'Amsterdam, NL',
      mainContact: {
        id: 'c14',
        name: 'Andrey Khusid',
        email: 'andrey@miro.com'
      },
      accountOwner: {
        id: 'e14',
        name: 'Sara Jansen',
        avatar: '/avatars/sara.jpg'
      },
      website: 'www.miro.com',
      tags: ['Enterprise', 'Collaboration', 'Europe'],
      lastContacted: '5/20/2023',
    },
    {
      key: '15',
      name: 'Trustpilot',
      industry: 'Reviews',
      size: '2501-5000',
      location: 'Copenhagen, DK',
      mainContact: {
        id: 'c15',
        name: 'Peter Mühlmann',
        email: 'peter@trustpilot.com'
      },
      accountOwner: {
        id: 'e15',
        name: 'Laura Jensen',
        avatar: '/avatars/laura.jpg'
      },
      website: 'www.trustpilot.com',
      tags: ['Enterprise', 'Reviews', 'Europe'],
      lastContacted: '5/23/2023',
    },
    {
      key: '16',
      name: 'Klarna',
      industry: 'FinTech',
      size: '5001-10000',
      location: 'Stockholm, Sweden',
      mainContact: {
        id: 'c16',
        name: 'Sebastian Siemiatkowski',
        email: 'sebastian@klarna.com'
      },
      accountOwner: {
        id: 'e16',
        name: 'Viktor Holm',
        avatar: '/avatars/viktor.jpg'
      },
      website: 'www.klarna.com',
      tags: ['Enterprise', 'FinTech', 'Europe'],
      lastContacted: '5/16/2023',
    },
    {
      key: '17',
      name: 'Siemens AG',
      industry: 'Engineering',
      size: '10001+',
      location: 'Munich, Germany',
      mainContact: {
        id: 'c17',
        name: 'Eva Müller',
        email: 'eva.mueller@siemens.com'
      },
      accountOwner: {
        id: 'e17',
        name: 'Sarah Keller',
        avatar: '/avatars/sarah-k.jpg'
      },
      website: 'www.siemens.com',
      tags: ['Enterprise', 'Engineering', 'Europe'],
      lastContacted: '5/14/2023',
    },
  ];

  const columns: ColumnsType<Company> = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <a onClick={() => navigateToCompanyDetail(record.key)}>{text}</a>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      filters: Array.from(new Set(companies.map(c => c.industry))).map(industry => ({
        text: industry,
        value: industry,
      })),
      onFilter: (value, record) => record.industry.indexOf(value as string) === 0,
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      sorter: (a, b) => {
        // Extract the lower bound of the size range for sorting
        const getNumericSize = (size: string) => {
          const match = size.match(/^(\d+)/); 
          return match ? parseInt(match[1]) : 0;
        };
        return getNumericSize(a.size) - getNumericSize(b.size);
      },
    },
    {
      title: 'Main Contact',
      dataIndex: 'mainContact',
      key: 'mainContact',
      render: (mainContact) => <a>{mainContact.name}</a>,
    },
    {
      title: 'Account Owner',
      dataIndex: 'accountOwner',
      key: 'accountOwner',
      filters: Array.from(new Set(companies.map(c => c.accountOwner.name))).map(owner => ({
        text: owner,
        value: owner,
      })),
      onFilter: (value, record) => record.accountOwner.name.indexOf(value as string) === 0,
      render: (accountOwner) => (
        <div className="account-owner">
          <div className="avatar-container">
            <Avatar 
              src={accountOwner.avatar} 
              size="small"
              style={{ backgroundColor: stringToColor(accountOwner.name) }}
            >
              {accountOwner.name.charAt(0).toUpperCase()}
            </Avatar>
          </div>
          <span>{accountOwner.name}</span>
        </div>
      ),
    },
    {
      title: 'Company Website',
      dataIndex: 'website',
      key: 'website',
      render: (text) => <a href={`https://${text}`} target="_blank">{text}</a>,
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      filters: Array.from(new Set(companies.flatMap(c => c.tags))).map(tag => ({
        text: tag,
        value: tag,
      })),
      onFilter: (value, record) => record.tags.includes(value as string),
      render: (tags: string[]) => (
        <>
          {tags.map(tag => {
            let color = 'geekblue';
            if (tag === 'Enterprise') {
              color = 'blue';
            } else if (tag === 'Mid-Market') {
              color = 'purple';
            } else if (tag === 'SMB') {
              color = 'green';
            } else if (tag === 'Key Account') {
              color = 'gold';
            } else if (tag === 'Startup') {
              color = 'orange';
            }
            return (
              <Tag color={color} key={tag}>
                {tag}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Last Contacted',
      dataIndex: 'lastContacted',
      key: 'lastContacted',
      sorter: (a, b) => new Date(a.lastContacted).getTime() - new Date(b.lastContacted).getTime(),
      render: (date) => {
        const contactDate = new Date(date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - contactDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date;
      }
    },
    {
      title: '',
      key: 'action',
      render: () => (
        <EllipsisOutlined className="action-icon" />
      ),
    },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Filter companies based on search text
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchText.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchText.toLowerCase()) ||
    company.location.toLowerCase().includes(searchText.toLowerCase()) ||
    company.mainContact.name.toLowerCase().includes(searchText.toLowerCase()) ||
    company.accountOwner.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (isCreatingCompany) {
    return <CompanyDetail onBack={() => setIsCreatingCompany(false)} />;
  }
  if (selectedCompany) {
    return <CompanyDetail companyId={selectedCompany.key} onBack={() => setSelectedCompany(null)} />;
  }

  return (
    <div>
      <div className="company-header">
        <div>
          <Title level={3} className="company-header-title">Companies</Title>
          <Text type="secondary">Manage your investment companies and their information.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreatingCompany(true)}>
          Add Company
        </Button>
      </div>

      <Row gutter={[16, 16]} className="stats-cards">
        <Col span={6}>
          <Card>
            <div className="card-content">
              <div>
                <div className="card-metric">Total Companies</div>
                <div className="card-value">342</div>
                <div className="card-change">+5.4% from last month</div>
              </div>
              <div className="card-icon-container blue-icon-bg">
                <BankOutlined className="blue-icon" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="card-content">
              <div>
                <div className="card-metric">Active Opportunities</div>
                <div className="card-value">64</div>
                <div className="card-change">+2.3% from last month</div>
              </div>
              <div className="card-icon-container green-icon-bg">
                <AreaChartOutlined className="green-icon" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="card-content">
              <div>
                <div className="card-metric">Total Portfolio Value</div>
                <div className="card-value">$1.2M</div>
                <div className="card-change">+6.8% from last month</div>
              </div>
              <div className="card-icon-container light-blue-icon-bg">
                <DollarOutlined className="blue-icon" />
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="card-content">
              <div>
                <div className="card-metric">Total Contacts</div>
                <div className="card-value">528</div>
                <div className="card-change">+7.2% from last month</div>
              </div>
              <div className="card-icon-container purple-icon-bg">
                <TeamOutlined className="purple-icon" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <div className="search-filter-container">
        <Input
          placeholder="Search companies..."
          prefix={<SearchOutlined />}
          onChange={handleSearch}
          className="search-input"
        />
        <div className="filter-wrapper">
          <Button icon={<FilterOutlined />} className="filter-dropdown">
            Filter
          </Button>
        </div>
      </div>

      {filteredCompanies.length > 0 ? (
        <Table
          columns={columns}
          dataSource={filteredCompanies}
          pagination={{ position: ['bottomRight'] }}
          rowKey="key"
          onRow={record => ({
            onClick: () => setSelectedCompany(record)
          })}
          style={{ cursor: 'pointer' }}
        />
      ) : (
        <div className="empty-state">
          <BankOutlined className="empty-state-icon" />
          <h2 className="empty-state-title">No companies found</h2>
          <p className="empty-state-description">There are no companies matching your search criteria or no companies have been added yet.</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {/* Handle navigation to create company */}}>
            Add Company
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyOverview;
