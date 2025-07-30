import { useState, useEffect, createElement, useCallback } from "react";
import {
  Layout,
  Menu,
  Modal,
  Form,
  Input,
  Typography,
  Button,
  Tooltip,
  notification,
  Spin,
  Alert,
} from "antd";
import {
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import {
  UserInfoProps,
} from "./common/BusinessAppContext";
import ProcessEventListener, {
  ProcessLocalDevEvent,
} from "./common/components/process/ProcessEventListener";
import { IDEStartScreen } from "./components/ide-start-screen";
import HeaderLogo from "./assets/icons/header_logo.svg";
import FeatureHubProvider from "./common/components/feature/FeatureHubProvider";
import { useDynamicScreen } from "./common/hooks/useDynamicScreen";
import { InfoCircleOutlined } from "@ant-design/icons";

// Get available modules without eagerly loading them
const modulePatterns = import.meta.glob("./business-apps/**/index.ts", {
  eager: false,
});

interface BusinessAppInfo {
  name: string;
  path: string;
  module: string;
  subModule?: string;
  screenKey: string; // Key for dynamic loading
}

const businessApps: BusinessAppInfo[] = [];

// Build the businessApps array from index.ts files (matching getDynamicEntries logic)
for (const path in modulePatterns) {
  if (
    path.includes("/opportunity-tabs/") ||
    path.includes("/oportunity-tabs/") ||
    path.includes("/opportunity-components/")
  ) {
    continue;
  }

  const excludedDirs = [
    "/components/",
    "/modules/",
    "/hooks/",
    "/lib/",
    "/utils/",
  ];
  if (excludedDirs.some((dir) => path.includes(dir))) {
    continue;
  }

  // Parse path: ./business-apps/module/sub-module/.../app-name/index.ts
  const pathParts = path.split("/");
  if (pathParts.length >= 3 && pathParts[pathParts.length - 1] === "index.ts") {
    const moduleName = pathParts[2]; // business-apps is at index 1, module at index 2
    const appName = pathParts[pathParts.length - 2]; // Directory containing index.ts
    
    // Skip non-app directories that have index.ts files
    const nonAppDirectories = [
      "components", "hooks", "types", "utils", "queries", "context", 
      "services", "modals", "tabs", "views", "charts"
    ];
    
    // Check if this is a non-app directory or if any parent directory is a non-app directory
    const isNonApp = pathParts.some(part => nonAppDirectories.includes(part));
    if (isNonApp) {
      continue;
    }

    // Only include paths that are actual apps (typically in "apps" or "forms" directories)
    const hasAppsOrForms = pathParts.some(part => part === "apps" || part === "forms");
    if (!hasAppsOrForms) {
      continue;
    }
    
    let subModule = "";
    if (pathParts.length > 4) {
      // Get everything between module and app-name (excluding both index.ts and app directory)
      subModule = pathParts.slice(3, -2).join("/");
    }

    // Create screen key matching getDynamicEntries format
    const screenKey = subModule 
      ? `${moduleName}/${subModule}/${appName}`
      : `${moduleName}/${appName}`;
    
    // Convert app-name to PascalCase for display
    const displayName = appName.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    businessApps.push({
      name: displayName,
      path,
      module: moduleName,
      subModule: subModule || undefined,
      screenKey,
    });
  }
}

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const STORAGE_KEY_USER_INFO = "business-app-ide-user-info";
const STORAGE_KEY_ACCESS_TOKEN = "business-app-ide-access-token";
const STORAGE_KEY_ADDITIONAL_DATA = "business-app-ide-additional-data";
const STORAGE_KEY_SIDEBAR_COLLAPSED = "business-app-ide-sidebar-collapsed";
const STORAGE_KEY_RECENT_APPS = "business-app-ide-recent-apps";

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
    message: "Process Start Event Detected",
    description: `Domain: ${domain}, \nProcess: ${processName}${
      processInstanceId ? `, ID: ${processInstanceId}` : ""
    }\nProcess body: ${
      startProcessBody ? JSON.stringify(startProcessBody) : "No process body"
    }`,
    duration: 5,
    placement: "topRight",
  });
};

export interface BusinessAppIDEProps {
  readonly packageName: string;
  readonly packageVersion: string;
}

// Dynamic component wrapper that loads components on demand
const DynamicComponentWrapper: React.FC<{
  app: BusinessAppInfo;
  userInfo?: UserInfoProps;
  accessToken?: string;
  additionalData?: { [k: string]: any };
}> = ({ app, userInfo, accessToken, additionalData }) => {
  const { loadScreen, state, getScreenInfo } = useDynamicScreen();

  useEffect(() => {
    loadScreen(app.screenKey);
  }, [app.screenKey, loadScreen]);

  if (state.isLoading) {
    const screenInfo = getScreenInfo(app.screenKey);
    const isFromCache = screenInfo?.isCachedGlobally;
    
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <div className="gba:text-center">
          <Spin size="large" />
          <div className="gba:mt-4 gba:text-gray-600">
            {isFromCache ? `Loading ${app.name} from cache...` : `Loading ${app.name}...`}
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="gba:p-6">
        <Alert
          message="Failed to Load Component"
          description={
            <div>
              <div>{state.error}</div>
              <div className="gba:mt-2 gba:text-xs gba:text-gray-500">
                Screen: {app.screenKey}
              </div>
            </div>
          }
          type="error"
          showIcon
          action={
            <Button 
              size="small" 
              onClick={() => loadScreen(app.screenKey)}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (state.component) {
    return createElement(state.component, {
      userInfo,
      accessToken,
      additionalData,
    });
  }

  return null;
};

export function BusinessAppIDE(props: Readonly<BusinessAppIDEProps>) {
  const { packageVersion } = props;
  const { getPerformanceMetrics } = useDynamicScreen();

  const getAppByName = (name: string): BusinessAppInfo | null => {
    return businessApps.find((app) => app.name === name) || null;
  };

  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const appFromUrl = urlParams.get("app");

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(
    getAppByName(appFromUrl || "") || null
  );
  const [userInfo, setUserInfo] = useState<string>("");
  const [userInfoError, setUserInfoError] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [additionalData, setAdditionalData] = useState<string>("");
  const [additionalDataError, setAdditionalDataError] = useState<string>("");
  const [settingsModalVisible, setSettingsModalVisible] =
    useState<boolean>(false);
  const [performanceModalVisible, setPerformanceModalVisible] =
    useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === "true"
  );
  const [recentlyUsedApps, setRecentlyUsedApps] = useState<RecentlyUsedApp[]>(
    []
  );
  const [lastPublishedDate, setLastPublishedDate] = useState<string>("");

  useEffect(() => {
    const savedUserInfo = localStorage.getItem(STORAGE_KEY_USER_INFO);
    const savedAccessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    const savedAdditionalData = localStorage.getItem(STORAGE_KEY_ADDITIONAL_DATA);
    const savedRecentApps = localStorage.getItem(STORAGE_KEY_RECENT_APPS);

    if (savedUserInfo) {
      setUserInfo(savedUserInfo);
      validateUserInfo(savedUserInfo);
    }

    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
    }

    if (savedAdditionalData) {
      setAdditionalData(savedAdditionalData);
      validateAdditionalData(savedAdditionalData);
    }

    if (savedRecentApps) {
      try {
        const parsed = JSON.parse(savedRecentApps);
        setRecentlyUsedApps(parsed);
      } catch (error) {
        console.error("Failed to parse recent apps:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedApp) {
      url.searchParams.set("app", selectedApp.name);
      fetchLastPublishedDate(selectedApp);
    } else {
      url.searchParams.delete("app");
      setLastPublishedDate("");
    }
    window.history.pushState({}, "", url.toString());
  }, [selectedApp]);

  /**
   * Fetches the last published date for a business app from Azure Storage
   */
  const fetchLastPublishedDate = async (app: BusinessAppInfo) => {
    if (!app.module) {
      setLastPublishedDate("");
      return;
    }

    // Construct the full path including the app name
    const appPath = app.screenKey; // Use the screenKey which includes the full path
    const timestamp = Date.now();
    const url = `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/screens/${appPath}/index.js?t=${timestamp}`;

    try {
      // Note: CORS must be enabled on Azure Storage to allow these requests
      const response = await fetch(url, {
        method: "GET",
        mode: "cors", // This requires proper CORS configuration on Azure Storage
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const lastModified = response.headers.get("Last-Modified");
      if (lastModified) {
        const date = new Date(lastModified);
        const formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        setLastPublishedDate(formattedDate);
      } else {
        setLastPublishedDate("");
      }
    } catch (error) {
      console.warn(`Failed to fetch last published date for ${app.name}:`, error);
      setLastPublishedDate("");
    }
  };

  /**
   * Updates the recently used apps list and saves to localStorage
   */
  const updateRecentlyUsedApps = (app: BusinessAppInfo): void => {
    const now = Date.now();
    const existingIndex = recentlyUsedApps.findIndex(
      (recentApp) => recentApp.name === app.name
    );

    let updatedApps = [...recentlyUsedApps];

    if (existingIndex !== -1) {
      updatedApps[existingIndex].lastUsed = now;
    } else {
      updatedApps.push({
        name: app.name,
        module: app.module,
        subModule: app.subModule,
        lastUsed: now,
      });
    }

    updatedApps = updatedApps
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, MAX_RECENT_APPS);

    setRecentlyUsedApps(updatedApps);
    localStorage.setItem(STORAGE_KEY_RECENT_APPS, JSON.stringify(updatedApps));
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

  const validateAdditionalData = (value: string): void => {
    if (!value) {
      setAdditionalDataError("");
      return;
    }

    try {
      JSON.parse(value);
      setAdditionalDataError("");
    } catch (e: any) {
      setAdditionalDataError("Invalid JSON format");
    }
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY_USER_INFO, userInfo);
    localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEY_ADDITIONAL_DATA, additionalData);
    setSettingsModalVisible(false);
  };

  const createAppURL = (app: BusinessAppInfo): string => {
    const url = new URL(window.location.href);
    url.searchParams.set("app", app.name);
    return url.toString();
  };

  const handleAppLinkClick = (event: React.MouseEvent, app: BusinessAppInfo) => {
    // Allow middle-click and right-click to work with browser defaults
    if (event.button === 1 || event.button === 2) {
      return; // Let browser handle middle-click and right-click
    }
    
    // For left-click, prevent default and handle navigation
    event.preventDefault();
    handleAppSelect(app);
  };

  const createAppMenuItem = (app: BusinessAppInfo) => ({
    key: app.screenKey,
    label: (
      <a 
        href={createAppURL(app)}
        onClick={(e) => handleAppLinkClick(e, app)}
        onAuxClick={(e) => {
          // Handle middle-click specifically
          if (e.button === 1) {
            // Allow browser to open in new tab
            e.stopPropagation();
          }
        }}
        style={{ 
          textDecoration: 'none', 
          color: 'inherit',
          display: 'block',
          width: '100%'
        }}
      >
        {app.name}
      </a>
    ),
  });

  const getMenuItems = (): any => {
    const moduleGroups: Record<string, Record<string, BusinessAppInfo[]>> = {};

    businessApps.forEach((app) => {
      if (!moduleGroups[app.module]) {
        moduleGroups[app.module] = {};
      }

      // Extract the first level of subModule as the actual sub-module
      let subModuleName = "default";
      if (app.subModule) {
        const subModuleParts = app.subModule.split("/");
        subModuleName = subModuleParts[0]; // Take the first part as the sub-module
      }

      if (!moduleGroups[app.module][subModuleName]) {
        moduleGroups[app.module][subModuleName] = [];
      }

      moduleGroups[app.module][subModuleName].push(app);
    });

    const moduleMenuItems = Object.entries(moduleGroups).map(
      ([module, subModules]) => {
        const subModuleEntries = Object.entries(subModules);

        if (
          subModuleEntries.length === 1 &&
          subModuleEntries[0][0] === "default"
        ) {
          return {
            key: module,
            label: module.charAt(0).toUpperCase() + module.slice(1),
            children: subModuleEntries[0][1].map(createAppMenuItem),
          };
        }

        const children = subModuleEntries
          .map(([subModule, apps]) => {
            if (subModule === "default") {
              return apps.map(createAppMenuItem);
            }

            return {
              key: `${module}/${subModule}`,
              label: subModule.charAt(0).toUpperCase() + subModule.slice(1),
              children: apps.map(createAppMenuItem),
            };
          })
          .flat();

        return {
          key: module,
          label: module.charAt(0).toUpperCase() + module.slice(1),
          children,
        };
      }
    );

    const homeMenuItem = {
      key: "home",
      label: "Home",
      icon: <HomeOutlined />,
      onClick: goToStartScreen,
    };

    return [homeMenuItem, ...moduleMenuItems];
  };

  const parsedUserInfo = useCallback((): UserInfoProps | undefined => {
    if (userInfo?.length > 2) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error("Failed to parse user info:", e);
        return undefined;
      }
    }
    return undefined;
  }, [userInfo]);

  const parsedAdditionalData = useCallback((): { [k: string]: any } | undefined => {
    if (additionalData?.length > 2) {
      try {
        return JSON.parse(additionalData);
      } catch (e) {
        console.error("Failed to parse additional data:", e);
        return undefined;
      }
    }
    return undefined;
  }, [additionalData]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <ProcessEventListener onLocalDevEvent={handleProcessLocalDevEvent} />
      <FeatureHubProvider userId={parsedUserInfo()?.id ?? ""} />

      {/* Full-width Header */}
      <Header
        style={{
          background: "#fff",
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "center",
          height: 48,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          borderBottom: "1px solid #e8e8e8",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        {/* Left section: Package Info */}
        <div className="gba:flex gba:items-center gba:flex-nowrap gba:justify-start">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center">
              <div className="gba:py-[12px]">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToStartScreen();
                  }}
                >
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
            <span className="gba:text-xs gba:text-[#666]">
              v{packageVersion}
            </span>
          </div>
        </div>

        {/* Center section: Search Placeholder - Perfectly centered */}
        <div className="gba:flex gba:items-center gba:justify-center">
          <button
            className="gba:w-[219px] gba:h-8 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:bg-[#EFEFEF] gba:outline-none"
            data-testid="GlobalSearchButton-Button"
          >
            <div className="gba:w-[418px] gba:h-[26px] gba:flex gba:items-center gba:justify-center gba:rounded-full gba:bg-[#EFEFEF]">
              <div
                className="gba:text-sm gba:text-[#999999]"
                data-testid="GlobalSearchButton-Text"
              >
                Search in NEWWORK
              </div>
            </div>
          </button>
        </div>

        {/* Right section: Last Published Date and Settings Button */}
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-4">
          {lastPublishedDate && (
            <div
              className="gba:flex gba:items-center gba:text-sm gba:text-[#666666]"
              data-testid="LastPublishedDate"
            >
              <Text type="secondary">Last Published: {lastPublishedDate}</Text>
            </div>
          )}
          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSettingsModalVisible(true)}
              style={{ fontSize: "16px" }}
            />
          </Tooltip>
          <Tooltip title="Performance Metrics">
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => setPerformanceModalVisible(true)}
              style={{ fontSize: "16px" }}
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
            height: "calc(100vh - 48px)",
            position: "fixed",
            left: 0,
            top: 48,
            bottom: 0,
            boxShadow: "2px 0 8px rgba(0,0,0,0.05)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              height: "calc(100% - 56px)", // Total height minus button height
              overflow: "auto",
              position: "relative",
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={selectedApp ? [selectedApp.screenKey] : ["home"]}
              style={{ borderRight: 0 }}
              items={getMenuItems()}
            />
          </div>

          <div
            className="gba:border-t gba:border-[#e1e3eb] gba:p-2 gba:flex gba:justify-center gba:bg-white"
            style={{
              position: "sticky",
              bottom: 0,
              height: "56px",
              zIndex: 10,
              boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Tooltip title={collapsed ? "Expand Menu" : "Collapse Menu"}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: "16px",
                  width: "100%",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </Tooltip>
          </div>
        </Sider>

        <Layout
          style={{
            marginLeft: collapsed ? 68 : 264,
            transition: "margin-left 0.2s",
          }}
        >
          <Content
            style={{
              overflow: "initial",
              background: "#fff",
              minHeight: "calc(100vh - 48px)",
            }}
          >
            {selectedApp ? (
              <div className="gba:w-full gba:h-full gba:overflow-auto">
                <DynamicComponentWrapper
                  app={selectedApp}
                  userInfo={parsedUserInfo()}
                  accessToken={accessToken ?? undefined}
                  additionalData={parsedAdditionalData()}
                  key={`${selectedApp.name}-${JSON.stringify(
                    parsedUserInfo()
                  )}-${accessToken}-${JSON.stringify(parsedAdditionalData())}`}
                />
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
              onChange={(e) => {
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
              onChange={(e) => setAccessToken(e.target.value)}
              value={accessToken}
            />
          </Form.Item>
          <Form.Item
            label="Additional Data (JSON format)"
            validateStatus={additionalDataError ? "error" : ""}
            help={additionalDataError}
          >
            <Input.TextArea
              placeholder='Enter additional data in JSON format (e.g., {"employeeId": "123", "jobPositionId": "456"})'
              rows={4}
              onChange={(e) => {
                setAdditionalData(e.target.value);
                validateAdditionalData(e.target.value);
              }}
              value={additionalData}
            />
          </Form.Item>
          <Text type="secondary">
            These settings will be saved in your browser's local storage and
            persisted between sessions. Additional Data is used to pass context information like employeeId, jobPositionId, etc.
          </Text>
        </Form>
      </Modal>

      <Modal
        title="Dynamic Screen Loading Performance"
        open={performanceModalVisible}
        onCancel={() => setPerformanceModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPerformanceModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        <div className="gba:space-y-4">
          <div className="gba:p-4 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg">
            <h4 className="gba:text-green-800 gba:font-semibold gba:mb-2">
              Performance Improvements
            </h4>
            <ul className="gba:text-green-700 gba:space-y-1">
              <li>• Global caching: Components loaded once, reused across sessions</li>
              <li>• Smart preloading: Common screens preloaded automatically</li>
              <li>• Concurrent loading prevention: Multiple requests for same screen deduplicated</li>
              <li>• Performance tracking: Load times monitored and optimized</li>
            </ul>
          </div>
          
          <div>
            <h4 className="gba:font-semibold gba:mb-2">Screen Loading Statistics</h4>
            <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:border-gray-200 gba:rounded-lg">
              <table className="gba:w-full gba:text-sm">
                <thead className="gba:bg-gray-50">
                  <tr>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Screen</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Load Count</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Avg Time (ms)</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Last Load (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(getPerformanceMetrics().entries()).map(([screenKey, metrics]) => (
                    <tr key={screenKey} className="gba:border-t gba:border-gray-200">
                      <td className="gba:p-2 gba:font-mono gba:text-xs">{screenKey}</td>
                      <td className="gba:p-2">{metrics.loadCount}</td>
                      <td className="gba:p-2">{(metrics.loadTime / metrics.loadCount).toFixed(1)}</td>
                      <td className="gba:p-2">{metrics.lastLoadTime.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getPerformanceMetrics().size === 0 && (
                <div className="gba:p-4 gba:text-center gba:text-gray-500">
                  No screens loaded yet. Navigate to a screen to see performance data.
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
