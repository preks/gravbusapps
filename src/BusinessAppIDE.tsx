import { UiCatalogProvider } from '@newwork/gravity-ui-catalog';
import { useState, createElement, useEffect } from "react";

import { HashRouter } from 'react-router-dom';
import { Button, Layout, Menu, Modal, Form, Input, Typography, Tooltip } from "antd";
import { SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { BusinessAppContextProps, UserInfoProps } from "./common/BusinessAppContext";

const modules = import.meta.glob('./business-apps/**/[A-Z]*.tsx', { eager: true });

interface BusinessAppInfo {
  name: string;
  path: string;
  module: string;
  subModule?: string;
  component: React.ComponentType<BusinessAppContextProps>;
}

const businessApps: BusinessAppInfo[] = [];

for (const path in modules) {
  // Skip components in special folders that shouldn't appear in the side panel
  if (path.includes('/opportunity-tabs/') || 
      path.includes('/oportunity-tabs/') || 
      path.includes('/opportunity-components/')) {
    continue;
  }
  
  // extract component name from file name
  // and use found component name in businessAppMap with default export
  const excludedDirs = ['/components/', '/modules/', '/hooks/', '/lib/', '/utils/'];
  if (excludedDirs.some(dir => path.includes(dir))) {
    continue;
  }
  
  const match = path.match(/\/([A-Z][A-Za-z0-9]*)\.tsx$/);
  if (match) {
    // Parse module structure from path
    const pathParts = path.split('/');
    const moduleName = pathParts[2]; // business-apps/{module}/...
    let subModule = '';
    
    // Check if there's a submodule
    if (pathParts.length > 4) {
      subModule = pathParts.slice(3, -1).join('/');
    }
    
    businessApps.push({
      name: match[1],
      path,
      module: moduleName,
      subModule: subModule || undefined,
      component: (props) => createElement(UiCatalogProvider, undefined, createElement((modules[path] as any).default, props))
    });
  }
}

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// Local storage keys
const STORAGE_KEY_USER_INFO = 'business-app-ide-user-info';
const STORAGE_KEY_ACCESS_TOKEN = 'business-app-ide-access-token';
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'business-app-ide-sidebar-collapsed';

export interface CompMeta {
  name: string;
  layoutInfo?: any;
}

export interface BusinessAppIDEProps {
  readonly packageName: string;
  readonly packageVersion: string;
}

export function BusinessAppIDE(props: Readonly<BusinessAppIDEProps>) {
  const { packageName, packageVersion } = props;
  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(businessApps.length > 0 ? businessApps[0] : null);
  const [userInfo, setUserInfo] = useState<string>("");
  const [userInfoError, setUserInfoError] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true');
  
  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedUserInfo = localStorage.getItem(STORAGE_KEY_USER_INFO);
    const savedAccessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    
    if (savedUserInfo) {
      setUserInfo(savedUserInfo);
      validateUserInfo(savedUserInfo);
    }
    
    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
    }
  }, []);
  
  // Save sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  }, [collapsed]);
  
  const validateUserInfo = (value: string): void => {
    if (!value) {
      setUserInfoError("");
      return;
    }
    
    try {
      JSON.parse(value);
      setUserInfoError("");
    } catch (e: any) {
      setUserInfoError("Invalid JSON format");
    }
  };
  
  const saveSettings = () => {
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_USER_INFO, userInfo);
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
    setSettingsModalVisible(false);
  };
  
  // Helper function to create app menu items
  const createAppMenuItem = (app: BusinessAppInfo) => ({
    key: app.path,
    label: app.name,
    onClick: () => setSelectedApp(app)
  });
  
  // Group apps by module for the side panel
  const getMenuItems = (): any => {
    const moduleGroups: Record<string, BusinessAppInfo[]> = {};
    
    businessApps.forEach(app => {
      if (!moduleGroups[app.module]) {
        moduleGroups[app.module] = [];
      }
      moduleGroups[app.module].push(app);
    });
    
    return Object.entries(moduleGroups).map(([module, apps]) => {
      // Group by submodule if available
      const subModuleGroups: Record<string, BusinessAppInfo[]> = {};
      apps.forEach(app => {
        const key = app.subModule ?? 'default';
        if (!subModuleGroups[key]) {
          subModuleGroups[key] = [];
        }
        subModuleGroups[key].push(app);
      });
      
      // Create children for each submodule
      const children = Object.entries(subModuleGroups).flatMap(([subModule, subApps]): any => {
        if (subModule === 'default') {
          return subApps.map(createAppMenuItem);
        }
        
        // Create a group for this submodule
        return [{
          key: `${module}/${subModule}`,
          label: subModule.split('/').pop() ?? subModule,
          type: 'group',
          children: subApps.map(createAppMenuItem)
        }];
      });
      
      return {
        key: module,
        label: module.charAt(0).toUpperCase() + module.slice(1),
        children
      };
    });
  };
  
  const parsedUserInfo = (): UserInfoProps | undefined => {
    if (userInfo?.length > 2) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error('Failed to parse user info:', e);
        return undefined;
      }
    }
    return undefined;
  };
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={250} 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        trigger={null}
        theme="light"
        style={{ 
          overflow: 'auto', 
          height: '100vh', 
          position: 'fixed', 
          left: 0, 
          top: 0, 
          bottom: 0,
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
        }}
      >
        <div className="logo p-4 flex items-center justify-center border-b border-[#e1e3eb]">
          <span className="text-lg font-bold">{collapsed ? 'BA' : 'Business Apps'}</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedApp ? [selectedApp.path] : []}
          style={{ borderRight: 0 }}
          items={getMenuItems()}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header style={{ 
          background: '#fff', 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: 64,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}>
          <div className="flex items-center">
            <Button 
              type="text" 
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', marginRight: 16 }}
            />
            <div className="pkg-name">
              <span className="text-sm font-bold">{packageName}</span>
              <span className="ml-1 text-xs text-[#333]">
                {" "}
                - Version: {packageVersion}
              </span>
            </div>
          </div>
          <div>
            <Tooltip title="Settings">
              <Button 
                type="text" 
                icon={<SettingOutlined />} 
                onClick={() => setSettingsModalVisible(true)}
                style={{ fontSize: '16px' }}
              />
            </Tooltip>
          </div>
        </Header>
        <Content style={{ margin: '16px', overflow: 'initial', background: '#fff', padding: 24, minHeight: 280 }}>
          {selectedApp && (
            <div className="w-full h-full overflow-auto">
              <HashRouter>
                {createElement(selectedApp.component, {
                  userInfo: parsedUserInfo(),
                  accessToken: accessToken ?? undefined
                })}
              </HashRouter>
            </div>
          )}
        </Content>
      </Layout>
      
      {/* Settings Modal */}
      <Modal
        title="Business App Settings"
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        onOk={saveSettings}
        width={700}
        okText="Save Settings"
      >
        <Form layout="vertical">
          <Form.Item 
            label="User Info (JSON format)"
            validateStatus={userInfoError ? "error" : ""}
            help={userInfoError}
          >
            <Input.TextArea
              placeholder="Enter user info in JSON format"
              rows={6}
              onChange={e => {
                setUserInfo(e.target.value);
                validateUserInfo(e.target.value);
              }}
              value={userInfo}
            />
          </Form.Item>
          <Form.Item label="Access Token">
            <Input.TextArea
              placeholder="Enter your access token"
              rows={3}
              onChange={e => setAccessToken(e.target.value)}
              value={accessToken}
            />
          </Form.Item>
          <Text type="secondary">
            These settings will be saved in your browser's local storage and persisted between sessions.
          </Text>
        </Form>
      </Modal>
    </Layout>
  );
}
