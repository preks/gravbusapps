import { UiCatalogProvider } from '@newwork/gravity-ui-catalog';
import { useState, useEffect, createElement, useCallback } from "react";
import { Layout, Menu, Modal, Form, Input, Typography, Button, Tooltip, notification } from "antd";
import { SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined, HomeOutlined } from "@ant-design/icons";
import { BusinessAppContextProps, UserInfoProps } from "./common/BusinessAppContext";
import ProcessEventListener, { ProcessLocalDevEvent } from './common/components/ProcessEventListener';
import { IDEStartScreen } from './components/ide-start-screen';
import HeaderLogo from './assets/icons/header_logo.svg';

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
const STORAGE_KEY_RECENT_APPS = 'business-app-ide-recent-apps';

interface RecentlyUsedApp {
  name: string;
  module: string;
  subModule?: string;
  lastUsed: number;
}

const MAX_RECENT_APPS = 5;

export interface CompMeta {
  name: string;
  layoutInfo?: any;
}

const handleProcessLocalDevEvent = (event: ProcessLocalDevEvent) => {
  const { domain, processName, processInstanceId, startProcessBody } = event;

  notification.info({
    message: 'Process Start Event Detected',
    description: `Domain: ${domain}, \nProcess: ${processName}${processInstanceId ? `, ID: ${processInstanceId}` : ''}\nProcess body: ${startProcessBody ? JSON.stringify(startProcessBody) : 'No process body'}`,
    duration: 5,
    placement: 'topRight'
  });
};

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

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(getAppByName(appFromUrl || '') || null);
  const [userInfo, setUserInfo] = useState<string>("");
  const [userInfoError, setUserInfoError] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === 'true');
  const [recentlyUsedApps, setRecentlyUsedApps] = useState<RecentlyUsedApp[]>([]);

  useEffect(() => {
    const savedUserInfo = localStorage.getItem(STORAGE_KEY_USER_INFO);
    const savedAccessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    const savedRecentApps = localStorage.getItem(STORAGE_KEY_RECENT_APPS);

    if (savedUserInfo) {
      setUserInfo(savedUserInfo);
      validateUserInfo(savedUserInfo);
    }

    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
    }

    if (savedRecentApps) {
      try {
        const parsed = JSON.parse(savedRecentApps);
        setRecentlyUsedApps(parsed);
      } catch (error) {
        console.error('Failed to parse recent apps:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedApp) {
      url.searchParams.set('app', selectedApp.name);
    } else {
      url.searchParams.delete('app');
    }
    window.history.pushState({}, '', url.toString());
  }, [selectedApp]);

  const updateRecentlyUsedApps = (app: BusinessAppInfo): void => {
    const newRecentApp: RecentlyUsedApp = {
      name: app.name,
      module: app.module,
      subModule: app.subModule,
      lastUsed: Date.now()
    };

    setRecentlyUsedApps(currentRecent => {
      const filtered = currentRecent.filter(recent => recent.name !== app.name);
      const updated = [newRecentApp, ...filtered];
      const final = updated.slice(0, MAX_RECENT_APPS);

      localStorage.setItem(STORAGE_KEY_RECENT_APPS, JSON.stringify(final));

      return final;
    });
  };

  const handleAppSelect = (app: BusinessAppInfo) => {
    updateRecentlyUsedApps(app);
    setSelectedApp(app);
  };

  const goToStartScreen = () => {
    setSelectedApp(null);
  };

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
    localStorage.setItem(STORAGE_KEY_USER_INFO, userInfo);
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
    setSettingsModalVisible(false);
  };

  const createAppMenuItem = (app: BusinessAppInfo) => ({
    key: app.name,
    label: app.name,
    onClick: () => handleAppSelect(app)
  });

  const getMenuItems = (): any => {
    const moduleGroups: Record<string, Record<string, BusinessAppInfo[]>> = {};

    businessApps.forEach(app => {
      if (!moduleGroups[app.module]) {
        moduleGroups[app.module] = {};
      }

      // Extract the first level of subModule as the actual sub-module
      let subModuleName = 'default';
      if (app.subModule) {
        const subModuleParts = app.subModule.split('/');
        subModuleName = subModuleParts[0]; // Take the first part as the sub-module
      }

      if (!moduleGroups[app.module][subModuleName]) {
        moduleGroups[app.module][subModuleName] = [];
      }

      moduleGroups[app.module][subModuleName].push(app);
    });

    const moduleMenuItems = Object.entries(moduleGroups).map(([module, subModules]) => {
      const subModuleEntries = Object.entries(subModules);

      if (subModuleEntries.length === 1 && subModuleEntries[0][0] === 'default') {
        return {
          key: module,
          label: module.charAt(0).toUpperCase() + module.slice(1),
          children: subModuleEntries[0][1].map(createAppMenuItem)
        };
      }

      const children = subModuleEntries.map(([subModule, apps]) => {
        if (subModule === 'default') {
          return apps.map(createAppMenuItem);
        }

        return {
          key: `${module}/${subModule}`,
          label: subModule.charAt(0).toUpperCase() + subModule.slice(1),
          children: apps.map(createAppMenuItem)
        };
      }).flat();

      return {
        key: module,
        label: module.charAt(0).toUpperCase() + module.slice(1),
        children
      };
    });

    const homeMenuItem = {
      key: 'home',
      label: 'Home',
      icon: <HomeOutlined />,
      onClick: goToStartScreen
    };

    return [homeMenuItem, ...moduleMenuItems];
  };

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
      <ProcessEventListener onLocalDevEvent={handleProcessLocalDevEvent} />

      {/* Full-width Header */}
      <Header style={{
        background: '#fff',
        padding: '0 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'center',
        height: 48,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderBottom: '1px solid #e8e8e8',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        {/* Left section: Package Info */}
        <div className="gba:flex gba:items-center gba:flex-nowrap gba:justify-start">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center">
              <div className="gba:py-[12px]">
                <a href="#" onClick={(e) => { e.preventDefault(); goToStartScreen(); }}>
                  <img
                    src={HeaderLogo}
                    alt="Business Apps IDE"
                    width="120"
                    height="14"
                    className="gba:w-[120px] gba:h-[14px]"
                  />
                </a>
              </div>
            </div>
            <span className="gba:text-xs gba:text-[#666]">v{packageVersion}</span>
          </div>
        </div>

        {/* Center section: Search Placeholder - Perfectly centered */}
        <div className="gba:flex gba:items-center gba:justify-center">
          <button
            className="gba:w-[219px] gba:h-8 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:bg-[#EFEFEF] gba:outline-none"
            data-testid="GlobalSearchButton-Button"
          >
            <div className="gba:w-[418px] gba:h-[26px] gba:flex gba:items-center gba:justify-center gba:rounded-full gba:bg-[#EFEFEF]">
              <div className="gba:text-sm gba:text-[#999999]" data-testid="GlobalSearchButton-Text">
                Search in NEWWORK
              </div>
            </div>
          </button>
        </div>

        {/* Right section: Settings Button */}
        <div className="gba:flex gba:items-center gba:justify-end">
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

      {/* Layout with Sidebar and Content below header */}
      <Layout style={{ marginTop: 48 }}>
        <Sider
          width={264}
          collapsedWidth={68}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          theme="light"
          style={{
            height: 'calc(100vh - 48px)',
            position: 'fixed',
            left: 0,
            top: 48,
            bottom: 0,
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            height: 'calc(100% - 56px)', // Total height minus button height
            overflow: 'auto',
            position: 'relative'
          }}>
            <Menu
              mode="inline"
              selectedKeys={selectedApp ? [selectedApp.name] : ['home']}
              style={{ borderRight: 0 }}
              items={getMenuItems()}
            />
          </div>

          <div
            className="gba:border-t gba:border-[#e1e3eb] gba:p-2 gba:flex gba:justify-center gba:bg-white"
            style={{
              position: 'sticky',
              bottom: 0,
              height: '56px',
              zIndex: 10,
              boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Tooltip title={collapsed ? "Expand Menu" : "Collapse Menu"}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: '100%',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </Tooltip>
          </div>
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 68 : 264, transition: 'margin-left 0.2s' }}>
          <Content style={{ overflow: 'initial', background: '#fff', minHeight: 'calc(100vh - 48px)' }}>
            {selectedApp ? (
              <div className="gba:w-full gba:h-full gba:overflow-auto">
                {createElement(selectedApp.component, {
                  userInfo: parsedUserInfo(),
                  accessToken: accessToken ?? undefined,
                  key: `${selectedApp.name}-${JSON.stringify(parsedUserInfo())}-${accessToken}`
                })}
              </div>
            ) : (
              <IDEStartScreen
                businessApps={businessApps}
                onAppSelect={handleAppSelect}
                recentlyUsedApps={recentlyUsedApps}
              />
            )}
          </Content>
        </Layout>
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
