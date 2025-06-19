import { UiCatalogProvider } from '@newwork/gravity-ui-catalog';
import { useState, useEffect, createElement, useCallback } from "react";
import { Layout, Menu, Modal, Form, Input, Typography, Button, Tooltip } from "antd";
import { SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { BusinessAppContextProps, UserInfoProps } from "./common/BusinessAppContext";
import ProcessEventListener from './common/components/ProcessEventListener';

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
  if (path.includes('/opportunity-tabs/') || 
      path.includes('/oportunity-tabs/') || 
      path.includes('/opportunity-components/')) {
    continue;
  }

  const excludedDirs = ['/components/', '/modules/', '/hooks/', '/lib/', '/utils/'];
  if (excludedDirs.some(dir => path.includes(dir))) {
    continue;
  }

  const match = path.match(/\/([A-Z][A-Za-z0-9]*)\.tsx$/);
  if (match) {
    const pathParts = path.split('/');
    const moduleName = pathParts[2];
    let subModule = '';

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

  const getAppByName = (name: string): BusinessAppInfo | null => {
    return businessApps.find(app => app.name === name) || null;
  };

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const appFromUrl = urlParams.get('app');

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(getAppByName(appFromUrl || '') || (businessApps.length > 0 ? businessApps[0] : null));
  const [userInfo, setUserInfo] = useState<string>("");
  const [userInfoError, setUserInfoError] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true');

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (selectedApp) {
      const url = new URL(window.location.href);
      url.searchParams.set('app', selectedApp.name);
      window.history.pushState({}, '', url.toString());
    }
  }, [selectedApp]);

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

  // Save settings to localStorage and close modal
  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY_USER_INFO, userInfo);
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
    setSettingsModalVisible(false);
  };

  const createAppMenuItem = (app: BusinessAppInfo) => ({
    key: app.name,
    label: app.name,
    onClick: () => setSelectedApp(app)
  });

  const getMenuItems = (): any => {
    const moduleGroups: Record<string, BusinessAppInfo[]> = {};

    businessApps.forEach(app => {
      if (!moduleGroups[app.module]) {
        moduleGroups[app.module] = [];
      }
      moduleGroups[app.module].push(app);
    });

    return Object.entries(moduleGroups).map(([module, apps]) => {
      const subModuleGroups: Record<string, BusinessAppInfo[]> = {};
      apps.forEach(app => {
        const key = app.subModule ?? 'default';
        if (!subModuleGroups[key]) {
          subModuleGroups[key] = [];
        }
        subModuleGroups[key].push(app);
      });

      const children = Object.entries(subModuleGroups).flatMap(([subModule, subApps]): any => {
        if (subModule === 'default') {
          return subApps.map(createAppMenuItem);
        }
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

  // Parse userInfo string to UserInfoProps object
  const parsedUserInfo = useCallback((): UserInfoProps | undefined => {
    if (userInfo?.length > 2) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error('Failed to parse user info:', e);
        return undefined;
      }
    }
    return undefined;
  }, [userInfo]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Add the ProcessEventListener which handles process start events */}
      <ProcessEventListener />
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
        <div className="logo gba:p-4 gba:flex gba:items-center gba:justify-center gba:border-b gba:border-[#e1e3eb]">
          <span className="gba:text-lg gba:font-bold gba:w-full gba:text-center">{collapsed ? 'BA' : 'Business Apps'}</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedApp ? [selectedApp.name] : []}
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
          <div className="gba:flex gba:items-center gba:flex-nowrap">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="gba:flex-shrink-0"
              style={{ fontSize: '16px', marginRight: 16 }}
            />
            <div className="pkg-name gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center">
              <span className="gba:text-sm gba:font-bold">{packageName}</span>
              <span className="gba:ml-0 gba:sm:ml-1 gba:text-xs gba:text-[#333]"> - Version: {packageVersion}</span>
            </div>
          </div>
          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSettingsModalVisible(true)}
              style={{ fontSize: '16px' }}
            />
          </Tooltip>
        </Header>
        <Content style={{ margin: '16px', overflow: 'initial', background: '#fff', padding: 24, minHeight: 280 }}>
          {selectedApp && (
            <div className="gba:w-full gba:h-full gba:overflow-auto">
              {createElement(selectedApp.component, {
                userInfo: parsedUserInfo(),
                accessToken: accessToken ?? undefined,
                key: `${selectedApp.name}-${JSON.stringify(parsedUserInfo())}-${accessToken}`
              })}
            </div>
          )}
        </Content>
      </Layout>

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
