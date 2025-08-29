import { useState, useEffect, createElement, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  Alert,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@newwork/nw-design-system";
import { Gear, X, Info } from "@phosphor-icons/react";
import { IdeMainMenu, BusinessAppInfo } from "@/components/ide-main-menu";
import { IDERenderer } from "@/components/ide-renderer";
import { UserInfoProps } from "./common/BusinessAppContext";
import ProcessEventListener, {
  ProcessLocalDevEvent,
} from "./common/components/process/ProcessEventListener";
import { IDEStartScreen } from "./components/ide-start-screen";
import HeaderLogo from "./assets/icons/header_logo.svg";
import FeatureHubProvider from "./common/components/feature/FeatureHubProvider";
import { useDynamicScreen } from "./common/hooks/useDynamicScreen";
import { UiCatalogProvider } from "@newwork/gravity-ui-catalog";
import { useRewrapAntDStylesLive } from "./common/hooks/useRewrapAntDStylesLive";

// Get available modules without eagerly loading them
const modulePatterns = import.meta.glob("./business-apps/**/index.ts", {
  eager: false,
});

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
      "components",
      "hooks",
      "types",
      "utils",
      "queries",
      "context",
      "services",
      "modals",
      "tabs",
      "views",
      "charts",
    ];

    // Check if this is a non-app directory or if any parent directory is a non-app directory
    const isNonApp = pathParts.some((part) => nonAppDirectories.includes(part));
    if (isNonApp) {
      continue;
    }

    // Only include paths that are actual apps (typically in "apps", "forms", or "popups" directories)
    const hasAppsFormsOrPopups = pathParts.some(
      (part) => part === "apps" || part === "forms" || part === "popups"
    );
    if (!hasAppsFormsOrPopups) {
      continue;
    }

    // Determine the type based on the parent directory
    let componentType: "app" | "form" | "popup" = "app";
    if (pathParts.includes("forms")) {
      componentType = "form";
    } else if (pathParts.includes("popups")) {
      componentType = "popup";
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
    const displayName = appName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

    businessApps.push({
      name: displayName,
      path,
      module: moduleName,
      subModule: subModule || undefined,
      screenKey,
      type: componentType,
    });
  }
}

const STORAGE_KEY_USER_INFO = "business-app-ide-user-info";
const STORAGE_KEY_ACCESS_TOKEN = "business-app-ide-access-token";
const STORAGE_KEY_ADDITIONAL_DATA = "business-app-ide-additional-data";
const STORAGE_KEY_SIDEBAR_COLLAPSED = "business-app-ide-sidebar-collapsed";



export interface CompMeta {
  name: string;
  layoutInfo?: any;
}

const handleProcessLocalDevEvent = (event: ProcessLocalDevEvent) => {
  const { domain, processName, processInstanceId, startProcessBody } = event;

  // Log process event to console (replaced antd notification)
  console.info("Process Start Event Detected", {
    domain,
    processName,
    processInstanceId,
    startProcessBody,
  });
};

export interface BusinessAppIDEProps {
  readonly packageName: string;
  readonly packageVersion: string;
}



export function BusinessAppIDE(props: Readonly<BusinessAppIDEProps>) {
  const { packageVersion } = props;
  const { getPerformanceMetrics } = useDynamicScreen();

  useRewrapAntDStylesLive();

  const getAppByName = (name: string): BusinessAppInfo | null => {
    return businessApps.find((app) => app.name === name) || null;
  };

  const getAppByPath = (path: string): BusinessAppInfo | null => {
    return businessApps.find((app) => app.screenKey === path) || null;
  };

  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  // Check for different parameter types (app, form, popup)
  const appFromUrl =
    urlParams.get("app") || urlParams.get("form") || urlParams.get("popup");

  const [selectedApp, setSelectedApp] = useState<BusinessAppInfo | null>(
    // First try to find by full path (new format), then fallback to name (legacy format)
    getAppByPath(appFromUrl || "") || getAppByName(appFromUrl || "") || null
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


  const [lastPublishedDate, setLastPublishedDate] = useState<string>("");
  const [openKeys, setOpenKeys] = useState<string[]>([]);


  useEffect(() => {
    const savedUserInfo = localStorage.getItem(STORAGE_KEY_USER_INFO);
    const savedAccessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    const savedAdditionalData = localStorage.getItem(
      STORAGE_KEY_ADDITIONAL_DATA
    );


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



    // Set open keys based on the currently selected app (from URL)
    // Only if menu is not collapsed initially and using legacy menu
    const initialSelectedApp =
      getAppByPath(appFromUrl || "") || getAppByName(appFromUrl || "");
    const initialCollapsed =
      localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === "true";
    if (!initialCollapsed && initialSelectedApp) {
      const requiredKeys = getRequiredOpenKeysForApp(initialSelectedApp);
      setOpenKeys(requiredKeys);
    }


  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, String(collapsed));

    // When menu expands, restore the path to current app
    if (!collapsed && selectedApp) {
      const requiredKeys = getRequiredOpenKeysForApp(selectedApp);
      setOpenKeys(requiredKeys);
    }
  }, [collapsed, selectedApp]);



  useEffect(() => {
    // Update open keys when selected app changes to ensure the path is visible
    // Only do this when menu is not collapsed
    if (selectedApp && !collapsed) {
      const requiredKeys = getRequiredOpenKeysForApp(selectedApp);
      setOpenKeys((prevKeys) => {
        // Only add required keys if they're not already open
        // This ensures the path to the selected app is visible without disrupting user's menu state
        const missingKeys = requiredKeys.filter(
          (key) => !prevKeys.includes(key)
        );
        if (missingKeys.length > 0) {
          return [...prevKeys, ...missingKeys];
        }
        return prevKeys;
      });
    }
  }, [selectedApp, collapsed]);

  useEffect(() => {
    const url = new URL(window.location.href);

    // Clear all type parameters first
    url.searchParams.delete("app");
    url.searchParams.delete("form");
    url.searchParams.delete("popup");

    if (selectedApp) {
      // Set the appropriate parameter based on the app's type
      url.searchParams.set(selectedApp.type, selectedApp.screenKey);
      fetchLastPublishedDate(selectedApp);
    } else {
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
      console.warn(
        `Failed to fetch last published date for ${app.name}:`,
        error
      );
      setLastPublishedDate("");
    }
  };

  /**
   * Calculates which menu keys should be open to show the path to the selected app
   */
  const getRequiredOpenKeysForApp = (app: BusinessAppInfo | null): string[] => {
    if (!app) return [];

    const requiredKeys: string[] = [];

    // Always open the module
    requiredKeys.push(app.module);

    // If there's a submodule, open it too
    if (app.subModule) {
      const subModuleParts = app.subModule.split("/");
      const firstSubModule = subModuleParts[0];
      if (firstSubModule !== "default") {
        requiredKeys.push(`${app.module}/${firstSubModule}`);
      }
    }

    return requiredKeys;
  };

  /**
   * Handles menu open keys change
   */
  const handleOpenChange = (keys: string[]): void => {
    setOpenKeys(keys);
  };



  const handleAppSelect = (app: BusinessAppInfo) => {
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

  const parsedAdditionalData = useCallback(():
    | { [k: string]: any }
    | undefined => {
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
    <UiCatalogProvider>
      <div className="gba:min-h-screen gba:flex gba:flex-col">
        <ProcessEventListener onLocalDevEvent={handleProcessLocalDevEvent} />
        <FeatureHubProvider userId={parsedUserInfo()?.id ?? ""} />

        {/* Full-width Header */}
        <header className="gba:bg-white gba:px-4 gba:grid gba:grid-cols-3 gba:items-center gba:h-12 gba:shadow-sm gba:border-b gba:border-gray-200 gba:fixed gba:top-0 gba:left-0 gba:right-0 gba:z-50">
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
                className="gba:flex gba:items-center gba:text-sm gba:text-gray-600"
                data-testid="LastPublishedDate"
              >
                <span className="gba:text-secondary">
                  Last Published: {lastPublishedDate}
                </span>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsModalVisible(true)}
                  >
                    <Gear size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPerformanceModalVisible(true)}
                  >
                    <Info size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Performance Metrics</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* Layout with Sidebar and Content below header */}
        <div className="gba:flex gba:flex-1 gba:mt-12">
          <aside
            className={`gba:bg-white gba:fixed gba:left-0 gba:top-12 gba:bottom-0 gba:shadow-lg gba:overflow-hidden gba:z-50 gba:transition-all gba:duration-200 ${
              collapsed ? "gba:w-17" : "gba:w-66"
            }`}
            style={{
              height: "calc(100vh - 48px)",
            }}
          >
            <div
              style={{
                height: "calc(100% - 56px)", // Total height minus button height
                overflow: "hidden", // Changed from "auto" to prevent scrolling
                position: "relative",
              }}
            >
              <IdeMainMenu
                businessApps={businessApps}
                selectedApp={selectedApp}
                collapsed={collapsed}
                openKeys={openKeys}
                onAppSelect={handleAppSelect}
                onOpenChange={handleOpenChange}
              />
            </div>

            <div className="gba:border-t gba:border-gray-200 gba:p-2 gba:flex gba:justify-center gba:bg-white gba:sticky gba:bottom-0 gba:h-14 gba:z-10 gba:shadow-lg">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCollapsed(!collapsed)}
                      className="gba:w-full gba:h-10"
                    >
                      {collapsed ? <Gear size={16} /> : <X size={16} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {collapsed ? "Expand Menu" : "Collapse Menu"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </aside>

          <main
            className={`gba:flex-1 gba:bg-white gba:min-h-[calc(100vh-48px)] gba:overflow-auto gba:transition-all gba:duration-200 ${
              collapsed ? "gba:ml-17" : "gba:ml-66"
            }`}
          >
            {!selectedApp ? (
              <IDEStartScreen
                businessApps={businessApps}
                onAppSelect={handleAppSelect}
              />
            ) : (
              <IDERenderer
                selectedApp={selectedApp}
                userInfo={parsedUserInfo()}
                accessToken={accessToken ?? undefined}
                additionalData={parsedAdditionalData()}
                onAppSelect={setSelectedApp}
              />
            )}
          </main>
        </div>

        <Dialog
          open={settingsModalVisible}
          onOpenChange={setSettingsModalVisible}
        >
          <DialogContent className="gba:max-w-[700px] gba:max-h-[90vh] gba:overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Business App Settings</DialogTitle>
            </DialogHeader>
            <div className="gba:space-y-6">
              <div className="gba:space-y-2">
                <Label htmlFor="userInfo">User Info (JSON format)</Label>
                <Textarea
                  id="userInfo"
                  placeholder="Enter user info in JSON format"
                  rows={6}
                  value={userInfo}
                  onChange={(e) => {
                    setUserInfo(e.target.value);
                    validateUserInfo(e.target.value);
                  }}
                  className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${userInfoError ? "gba:border-red-500" : ""}`}
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
                {userInfoError && (
                  <p className="gba:text-sm gba:text-red-500">
                    {userInfoError}
                  </p>
                )}
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Textarea
                  id="accessToken"
                  placeholder="Enter your access token"
                  rows={3}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="additionalData">
                  Additional Data (JSON format)
                </Label>
                <Textarea
                  id="additionalData"
                  placeholder='Enter additional data in JSON format (e.g., {"employeeId": "123", "jobPositionId": "456"})'
                  rows={4}
                  value={additionalData}
                  onChange={(e) => {
                    setAdditionalData(e.target.value);
                    validateAdditionalData(e.target.value);
                  }}
                  className={`gba:w-full gba:resize-none gba:whitespace-pre-wrap gba:break-words ${additionalDataError ? "gba:border-red-500" : ""}`}
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                />
                {additionalDataError && (
                  <p className="gba:text-sm gba:text-red-500">
                    {additionalDataError}
                  </p>
                )}
              </div>

              <p className="gba:text-sm gba:text-gray-600">
                These settings will be saved in your browser's local storage and
                persisted between sessions. Additional Data is used to pass
                context information like employeeId, jobPositionId, etc.
              </p>

              <div className="gba:flex gba:justify-end gba:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSettingsModalVisible(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveSettings}>Save Settings</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={performanceModalVisible}
          onOpenChange={setPerformanceModalVisible}
        >
          <DialogContent className="gba:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Dynamic Screen Loading Performance</DialogTitle>
            </DialogHeader>
            <div className="gba:space-y-4">
              <div className="gba:p-4 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg">
                <h4 className="gba:text-green-800 gba:font-semibold gba:mb-2">
                  Performance Improvements
                </h4>
                <ul className="gba:text-green-700 gba:space-y-1">
                  <li>
                    • Global caching: Components loaded once, reused across
                    sessions
                  </li>
                  <li>
                    • Smart preloading: Common screens preloaded automatically
                  </li>
                  <li>
                    • Concurrent loading prevention: Multiple requests for same
                    screen deduplicated
                  </li>
                  <li>
                    • Performance tracking: Load times monitored and optimized
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="gba:font-semibold gba:mb-2">
                  Screen Loading Statistics
                </h4>
                <div className="gba:max-h-64 gba:overflow-y-auto gba:border gba:border-gray-200 gba:rounded-lg">
                  <table className="gba:w-full gba:text-sm">
                    <thead className="gba:bg-gray-50">
                      <tr>
                        <th className="gba:p-2 gba:text-left gba:font-medium">
                          Screen
                        </th>
                        <th className="gba:p-2 gba:text-left gba:font-medium">
                          Load Count
                        </th>
                        <th className="gba:p-2 gba:text-left gba:font-medium">
                          Avg Time (ms)
                        </th>
                        <th className="gba:p-2 gba:text-left gba:font-medium">
                          Last Load (ms)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(getPerformanceMetrics().entries()).map(
                        ([screenKey, metrics]) => (
                          <tr
                            key={screenKey}
                            className="gba:border-t gba:border-gray-200"
                          >
                            <td className="gba:p-2 gba:font-mono gba:text-xs">
                              {screenKey}
                            </td>
                            <td className="gba:p-2">{metrics.loadCount}</td>
                            <td className="gba:p-2">
                              {(metrics.loadTime / metrics.loadCount).toFixed(
                                1
                              )}
                            </td>
                            <td className="gba:p-2">
                              {metrics.lastLoadTime.toFixed(1)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                  {getPerformanceMetrics().size === 0 && (
                    <div className="gba:p-4 gba:text-center gba:text-gray-500">
                      No screens loaded yet. Navigate to a screen to see
                      performance data.
                    </div>
                  )}
                </div>
              </div>

              <div className="gba:flex gba:justify-end">
                <Button onClick={() => setPerformanceModalVisible(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </UiCatalogProvider>
  );
}
