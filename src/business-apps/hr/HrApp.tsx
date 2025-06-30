'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, type MenuProps } from 'antd';
import { UserOutlined, FileOutlined, TeamOutlined, IdcardOutlined } from '@ant-design/icons';
import { useLocation, Outlet } from 'react-router-dom';

const { Content, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('Employees', 'employees', <UserOutlined />, [
    getItem('Directory', 'directory'),
    getItem('List', 'employee-list'),
    getItem('Profile', 'profile'),
  ]),
  getItem('Job Positions', 'positions', <IdcardOutlined />),
  getItem('Documents', 'documents', <FileOutlined />, [
    getItem('Document Types', 'document-types'),
  ]),
  getItem('Team', 'team', <TeamOutlined />),
];

const HrApp: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('dashboard');

  // Update selected key based on URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('documents/types')) {
      setSelectedKey('document-types');
    } else if (path.endsWith('dashboard')) {
      setSelectedKey('dashboard');
    } else if (path.endsWith('directory')) {
      setSelectedKey('directory');
    } else if (path.endsWith('employee-list')) {
      setSelectedKey('employee-list');
    } else if (path.endsWith('profile')) {
      setSelectedKey('profile');
    } else if (path.endsWith('positions')) {
      setSelectedKey('positions');
    } else if (path.endsWith('team')) {
      setSelectedKey('team');
    }
  }, [location.pathname]);

  const onMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedKey(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="h-8 m-4 bg-white rounded" />
        <Menu
          theme="dark"
          defaultSelectedKeys={[selectedKey]}
          selectedKeys={[selectedKey]}
          mode="inline"
          items={items}
          onClick={onMenuClick}
        />
      </Sider>
      <Layout className="site-layout">
        <Content style={{ margin: '16px' }}>
          <div className="bg-white p-6 min-h-[280px] rounded-lg">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HrApp;
