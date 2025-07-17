import React from 'react';
import { Card, Typography, Row, Col } from 'antd';
import { BankOutlined, EnvironmentOutlined, TeamOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { Account } from '../hooks/useAccountData';

const { Text } = Typography;

interface CompanyInformationProps {
  account: Account;
  accountData: any;
}

export const CompanyInformation: React.FC<CompanyInformationProps> = ({ account, accountData }) => {
  const getAddress = () => {
    const address = accountData?.addresses?.[0] || account.addresses?.[0];
    if (!address) return 'N/A';
    
    const parts = [
      address.addressLine,
      address.city,
      address.postalCode,
      address.region?.value,
      address.country?.value
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getRevenue = () => {
    const revenue = accountData?.annualRevenue?.value || account.annualRevenue?.value || account.revenue;
    return revenue || 'N/A';
  };

  const getEmployeeCount = () => {
    return accountData?.numberOfEmployees?.value || account.numberOfEmployees?.value || account.size || 'N/A';
  };

  const getFoundedDate = () => {
    const date = accountData?.foundationDate || account.foundationDate || account.founded;
    if (!date) return 'N/A';
    
    try {
      return new Date(date).getFullYear().toString();
    } catch {
      return date;
    }
  };

  return (
    <Card 
      className="gba:h-full" 
      style={{ 
        height: '100%',
        backgroundColor: '#fafafa',
        border: '1px solid #e8e8e8'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#262626'
      }}>
        <BankOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
        Company Information
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Row gutter={[0, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500' }}>
                  Headquarters
                </Text>
              </div>
              <Text style={{ fontSize: '14px', marginLeft: '22px' }}>
                {getAddress()}
              </Text>
            </div>
          </Col>
        </Row>

        <Row gutter={[0, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500' }}>
                  Company Size
                </Text>
              </div>
              <Text style={{ fontSize: '14px', marginLeft: '22px' }}>
                {getEmployeeCount()}
              </Text>
            </div>
          </Col>
        </Row>

        <Row gutter={[0, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500' }}>
                  Founded
                </Text>
              </div>
              <Text style={{ fontSize: '14px', marginLeft: '22px' }}>
                {getFoundedDate()}
              </Text>
            </div>
          </Col>
        </Row>

        <Row gutter={[0, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500' }}>
                  Annual Revenue
                </Text>
              </div>
              <Text style={{ fontSize: '14px', marginLeft: '22px' }}>
                {getRevenue()}
              </Text>
            </div>
          </Col>
        </Row>

        {accountData?.legalForm?.value && (
          <Row gutter={[0, 16]}>
            <Col span={24}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BankOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500' }}>
                    Legal Form
                  </Text>
                </div>
                <Text style={{ fontSize: '14px', marginLeft: '22px' }}>
                  {accountData.legalForm.value}
                </Text>
              </div>
            </Col>
          </Row>
        )}
      </div>
    </Card>
  );
}; 