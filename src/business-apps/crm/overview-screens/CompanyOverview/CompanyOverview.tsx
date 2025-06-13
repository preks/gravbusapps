import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Button, 
  Input, 
  Row, 
  Col, 
  Table, 
  Spin, 
  Empty,
  Popover
} from 'antd';
import CompanyDetail from '../../detail-screens/CompanyDetail/CompanyDetail';
import AddNewCompany from './AddNewCompany';
import { 
  PlusOutlined, 
  SearchOutlined, 
  BankOutlined,
  AreaChartOutlined,
  TeamOutlined,
  GlobalOutlined,
  CaretUpOutlined,
  CaretDownOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_COMPANIES, CompanyData, GetCompaniesResponse } from './graphql/company-queries';
import './styles/CompanyOverview.css';

const { Title, Text } = Typography;

interface DisplayCompanyData {
  id: string;
  name: string;
  location: string;
  version: number;
  industry: string;
  country:string;
  website:string;
  numberOfEmployees: string;
  contacts: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }[];
  accountOwnerName: string;
  accountOwnerId?: string;
  foundationDate?: string;
  legalForm?: string;
}

const transformCompanyData = (apiCompany: CompanyData): DisplayCompanyData => {
  const city = apiCompany.addresses?.[0]?.city;
  const country = apiCompany.addresses?.[0]?.country?.value;
  let locationString = '';
  if (city && country) {
    locationString = `${city} ${country}`;
  } else if (city) {
    locationString = city;
  } else if (country) {
    locationString = country;
  }

  return {
    id: apiCompany.id,
    name: apiCompany.name || '',
    version: apiCompany.version,
    location: locationString,
    industry: apiCompany.industry?.value || '',
    legalForm: apiCompany.legalForm?.value,
    foundationDate: apiCompany.foundationDate,
    website: apiCompany.website,
    country: apiCompany.addresses?.[0]?.country?.value || '',
    accountOwnerName: apiCompany.ownerEmployee 
      ? `${apiCompany.ownerEmployee.firstName} ${apiCompany.ownerEmployee.lastName}` 
      : '',
    accountOwnerId: apiCompany.ownerEmployee?.id,
    numberOfEmployees: apiCompany.numberOfEmployees?.value || '',
    contacts: apiCompany.contact?.map(contact => ({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || ''
    })) || [],
  };
};

interface EmployeeDetails {
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
}

const STORAGE_KEY_USER_INFO = 'business-app-ide-user-info';

const CompanyOverview: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<DisplayCompanyData | null>(null);
  const savedUserInfo = userInfo;
  const [companiesData, setCompaniesData] = useState<DisplayCompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [employeeDetails, setEmployeeDetails ] = useState<EmployeeDetails | null>(null);
  
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  
  // Add sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | null>(null);

  const graphQLClient = useGraphqlClient(accessToken);

  useEffect(() => {
    if (savedUserInfo) {
      try {
        const userInfoObj = userInfo;
        if (userInfoObj?.employeeDetails) {
          try {
            const parsedDetails = typeof userInfoObj.employeeDetails === 'string' 
              ? JSON.parse(userInfoObj.employeeDetails) 
              : userInfoObj.employeeDetails;
            
            setEmployeeDetails(parsedDetails);
          } catch (e) {
            console.error('Error parsing employee details:', e);
          }
        }
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, [savedUserInfo]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCurrentPage(1); 
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  const fetchCompanies = async (page: number, currentSearchText: string, limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const whereCondition: any = {}; 
      if (currentSearchText.trim()) {
        const searchTextPattern = { _iregex: currentSearchText.trim() };
        whereCondition._or = [
          { name: searchTextPattern },
          { legalForm: { value: searchTextPattern } }, 
          { industry: { value: searchTextPattern } },
          { ownerEmployee: { firstName: searchTextPattern } },
          { ownerEmployee: { lastName: searchTextPattern } },
          { addresses: { city: searchTextPattern } },
          { addresses: { country: { value: searchTextPattern } } },
          { website:  searchTextPattern  }
        ];
      }

      // Add order_by condition if a sort field is selected
      const orderBy: any = {};
      if (sortField && sortOrder) {
        // Handle sorting for different fields
        if (sortField === 'name') {
          orderBy.name = sortOrder;
        } else if (sortField === 'website') {
          orderBy.website = sortOrder;
        }
      }
      console.log(orderBy)
      console.log("orderBy: ",orderBy)
      const result = await graphQLClient.request<GetCompaniesResponse>(
        GET_COMPANIES,
        {
          offset: (page - 1) * limit,
          limit: limit,
          where: whereCondition,
          order_by: Object.keys(orderBy).length > 0 ? orderBy : null,
        }
      );

      if (result && result.Account) {
        const transformedData = result?.Account?.map(transformCompanyData);
        setCompaniesData(transformedData);
        setTotalItems(result.AccountAggregate?.aggregate?.count || 0);
      } else {
        setError("Received invalid data from API");
        setCompaniesData([]);
        setTotalItems(0);
      }
    } catch (err) {
      setError('Failed to fetch companies: ' + (err instanceof Error ? err.message : String(err)));
      setCompaniesData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(currentPage, debouncedSearchText, pageSize);
  }, [currentPage, debouncedSearchText, graphQLClient, pageSize, accessToken, sortField, sortOrder]); 

  const handleCreateCompany = () => {
    setIsCreatingCompany(true);
  };

  const handleBackFromDetail = useCallback(() => {
    setSelectedCompany(null);
    fetchCompanies(currentPage, debouncedSearchText, pageSize);
  }, [currentPage, debouncedSearchText, pageSize]);

  const handleCancelCreateCompany = useCallback(() => {
    setIsCreatingCompany(false);
    fetchCompanies(currentPage, debouncedSearchText, pageSize);
  }, [currentPage, debouncedSearchText, pageSize]);

  const handleTableChange = (newPage: number, newPageSize: number) => {
    setCurrentPage(newPage);
    setPageSize(newPageSize);
  };

  const enabledButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db', 
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    margin: '0 4px',
    lineHeight: '1.5',
    minWidth: '80px',
    textAlign: 'center',
    cursor: 'pointer',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...enabledButtonStyle, 
    borderColor: '#e5e7eb', 
    color: '#9ca3af', 
    backgroundColor: '#f9fafb', 
    cursor: 'not-allowed',
  };

  const itemRender = useCallback((_current: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next', originalElement: React.ReactNode): React.ReactNode => {
    if (!React.isValidElement(originalElement)) {
      return originalElement;
    }

    const props = originalElement.props as { className?: string; children?: React.ReactNode };

    const antIsDisabled = props.className?.includes('ant-pagination-disabled');
    let styleToApply: React.CSSProperties = {};
    let newChildren = props.children;
    let isPrevNextButton = false;

    if (type === 'prev') {
      const isLogicallyDisabled = currentPage === 1;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled; 
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Previous';
      isPrevNextButton = true;

    } else if (type === 'next') {
      const totalPages = Math.ceil(totalItems / pageSize);
      const isLogicallyDisabled = totalItems === 0 || currentPage >= totalPages;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled;
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Next';
      isPrevNextButton = true;

    } else if (type === 'jump-prev' || type === 'jump-next') {
      return originalElement;
    } else if (React.isValidElement(originalElement) && (originalElement.props as { className?: string }).className?.includes('ant-pagination-item')) {
      return originalElement;
    } else {
      return originalElement;
    }

    if (isPrevNextButton) {
      const elementToClone = originalElement as React.ReactElement<React.HTMLAttributes<HTMLElement>>;

      const currentClassName = elementToClone.props.className || '';
      const gbaClassName = type === 'prev' ? 'gba-pagination-prev-btn' : 'gba-pagination-next-btn';
      let finalClassName = currentClassName.replace('gba-pagination-prev-btn', '').replace('gba-pagination-next-btn', '').trim();
      finalClassName = `${finalClassName} ${gbaClassName}`.trim();
      if (styleToApply === disabledButtonStyle && !antIsDisabled) {
        finalClassName = `${finalClassName} ant-pagination-disabled`.trim();
      }

      return React.cloneElement(elementToClone, {
        className: finalClassName,
        style: styleToApply,
        children: newChildren,
      });
    }
    
    return originalElement; 
  }, [currentPage, totalItems, pageSize, enabledButtonStyle, disabledButtonStyle]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else if (sortOrder === 'DESC') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const SortableColumnTitle = ({ title, dataIndex }: { title: string; dataIndex: string }) => {
    const isActive = sortField === dataIndex;
    return (
      <div 
        className="gba:sortable-column-title" 
        onClick={() => handleSort(dataIndex)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        data-testid={`${dataIndex}-sort-header`}
      >
        <span>{title}</span>
        <span style={{ marginLeft: '5px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: '16px' }}>
          {isActive && sortOrder === 'ASC' ? (
            <CaretUpOutlined style={{ color: '#000000', fontSize: '14px' }} />
          ) : (
            <CaretUpOutlined style={{ color: isActive ? '#595959' : '#8c8c8c', fontSize: '12px' }} />
          )}
          {isActive && sortOrder === 'DESC' ? (
            <CaretDownOutlined style={{ color: '#000000', fontSize: '14px' }} />
          ) : (
            <CaretDownOutlined style={{ color: isActive ? '#595959' : '#8c8c8c', fontSize: '12px' }} />
          )}
        </span>
      </div>
    );
  };

  const columns: ColumnsType<DisplayCompanyData> = [
    {
      title: <SortableColumnTitle title="Company Name" dataIndex="name" />,
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }} className="gba-company-name-cell">
          <a 
            onClick={() => setSelectedCompany(record)} 
            className="gba-text-primary hover:gba-underline" 
            style={{ color: 'black' }} 
          >
            {name}
          </a>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      className: 'gba-location-cell',
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      className: 'gba-industry-cell',
    },
    {
      title: <SortableColumnTitle title="Website" dataIndex="website" />,
      dataIndex: 'website',
      key: 'website',
      className: 'gba-website-cell',
      render: (website: string) => {
        if (website) {
          const fullUrl = website.startsWith('http://') || website.startsWith('https://') ? website : `http://${website}`;
          return (
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="gba-text-primary hover:gba-underline">
              {website}
            </a>
          );
        }
        return '';
      },
    },
    {
      title: 'Contact',
      dataIndex: 'contacts',
      key: 'contacts',
      className: 'gba-contact-cell',
      render: (contacts: { firstName: string; lastName: string; email?: string; phone?: string }[]) => {
        if (!contacts || contacts.length === 0) {
          return '';
        }
        
        const firstContact = contacts[0];
        const firstContactElement = (
          <div>
            {firstContact.firstName} {firstContact.lastName}
            {firstContact.email && (
              <span style={{ marginLeft: 8 }}>
                ({firstContact.email})
              </span>
            )}
            {firstContact.phone && (
              <span style={{ marginLeft: 8 }}>
                ({firstContact.phone})
              </span>
            )}
          </div>
        );
        
        if (contacts.length === 1) {
          return firstContactElement;
        }
        
        const additionalContacts = contacts.slice(1);
        return (
          <div className="gba:contacts-container">
            {firstContactElement}
            <Popover
              classNames={{ root: 'gba:contacts-list-popover' }}
              content={
                <div className="gba:additional-contacts gba:hide-scrollbar" style={{ 
                  maxWidth: '320px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  padding: '0 5px'
                }}>
                  {additionalContacts.map((contact, index) => (
                    <div key={index} style={{ 
                      marginBottom: index < additionalContacts.length - 1 ? '12px' : 0,
                      borderBottom: index < additionalContacts.length - 1 ? '1px solid #f0f0f0' : 'none',
                      paddingBottom: index < additionalContacts.length - 1 ? '8px' : 0
                    }}>
                      <div>
                        {contact.firstName} {contact.lastName}
                        {contact.email && (
                          <div style={{ fontSize: '13px', marginTop: '2px' }}>
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div style={{ fontSize: '13px', marginTop: '2px' }}>
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              }
              title="Additional Contacts"
              trigger={["hover", "click"]}
              placement="right"
            >
              <div 
                className="gba:more-contacts-indicator" 
                style={{ 
                  color: '#000000', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                ...
              </div>
            </Popover>
          </div>
        );
      },
    },
    {
      title: 'Account Owner',
      dataIndex: 'accountOwnerName', 
      key: 'accountOwner',
      className: 'gba-account-owner-cell',
    },
    {
      title: 'Legal Form',
      dataIndex: 'legalForm',
      key: 'legalForm',
      className: 'gba-legal-form-cell',
    },
    {
      title: 'Foundation Date',
      dataIndex: 'foundationDate',
      key: 'foundationDate',
      className: 'gba-foundation-date-cell',
      render: (dateString) => dateString ? new Date(dateString).toLocaleDateString() : '',
    },
    {
      title: 'No. of Employees',
      dataIndex: 'numberOfEmployees',
      key: 'numberOfEmployees',
      className: 'gba-number-of-employees-cell',
      render: (text: string) => text || '',
    },
    // {
    //   title: 'Actions',
    //   key: 'actions',
    //   className: 'gba-actions-cell',
    //   render: (_, record) => {
    //     const menu = (
    //       <Menu>
    //         <Menu.Item key="view" onClick={() => setSelectedCompany(record)}>
    //           View Details
    //         </Menu.Item>
    //         <Menu.Item key="edit">
    //           Edit
    //         </Menu.Item>
    //         <Menu.Item key="delete"  danger>
    //           Delete
    //         </Menu.Item>
    //       </Menu>
    //     );
    //     return (
    //       <Dropdown overlay={menu} trigger={['click']}>
    //         <Button type="text" icon={<EllipsisOutlined />} />
    //       </Dropdown>
    //     );
    //   },
    // },
  ];
  if (selectedCompany) {
    return (
      <CompanyDetail 
        companyId={selectedCompany.id} 
        onBack={handleBackFromDetail} 
        accessToken={accessToken} 
      />
    );
  }

  if (isCreatingCompany) {
    return (
      <AddNewCompany
        accessToken={accessToken}
        employeeDetails={employeeDetails || undefined}
        onBack={handleCancelCreateCompany}
      />
    );
  }

  return (
    <div style={{ padding: '24px' }} className="gba-company-overview-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }} className="gba-header-row">
        <Col>
          <Title level={3} style={{ margin: 0 }} className="gba-page-title">Companies</Title>
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateCompany}
            className="gba-create-button"
          >
            Create Company
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }} className="gba-kpi-row">
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankOutlined className="gba:h-5 gba:w-5 gba:text-blue-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Total Companies</div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-500">{totalItems}</div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AreaChartOutlined className="gba:h-5 gba:w-5 gba:text-green-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Industries</div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-500">
                  {companiesData.reduce((industries, company) => {
                    if (company.industry && !industries.includes(company.industry)) {
                      industries.push(company.industry);
                    }
                    return industries;
                  }, [] as string[]).length}
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TeamOutlined className="gba:h-5 gba:w-5 gba:text-orange-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Total Employees</div>
                <div className="gba:text-2xl gba:font-bold gba:text-orange-500">
                  {companiesData.reduce((sum, company) => {
                    const employeeCount = parseInt(company.numberOfEmployees) || 0;
                    return sum + employeeCount;
                  }, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="gba:p-6 gba:border gba:rounded-lg gba:bg-white gba:shadow-sm" style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '110px' }}>
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-50 gba:flex gba:items-center gba:justify-center gba:mr-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlobalOutlined className="gba:h-5 gba:w-5 gba:text-purple-500" style={{ fontSize: '18px' }} />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Countries</div>
                <div className="gba:text-2xl gba:font-bold gba:text-purple-500">
                  {companiesData.reduce((countries, company) => {
                    if (company.country && !countries.includes(company.country)) {
                      countries.push(company.country);
                    }
                    return countries;
                  }, [] as string[]).length}
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row justify="start" style={{ marginBottom: '16px' }} className="gba-filter-row">
        <Col span={6}>
          <Input 
            placeholder="Search companies (e.g., name, industry)"
            prefix={<SearchOutlined className="gba-search-icon" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="gba-search-input"
            style={{ 
              width: '100%',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
          />
        </Col>
      </Row>

      <Spin spinning={loading} tip="Loading companies..." className="gba-loading-spin">
        <Table 
          key={`company-table-${currentPage}-${pageSize}`} 
          columns={columns} 
          dataSource={companiesData} 
          rowKey="id" 
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handleTableChange,
            className: 'gba-custom-pagination',
            itemRender: itemRender
          }}
          className="gba-company-table"
          style={{ 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
            padding: '24px'
          }}
          locale={{
            emptyText: 
              !loading && companiesData.length === 0 && debouncedSearchText ? 
              <Empty description={`No companies found matching "${debouncedSearchText}"`} /> : 
              !loading && companiesData.length === 0 ? 
              <Empty description="No companies found." /> : 
              <span>No data</span> 
          }}
        />
      </Spin>

    </div>
  );
};

export default CompanyOverview;
