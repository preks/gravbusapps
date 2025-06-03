import { UiCatalogProvider } from '@newwork/gravity-ui-catalog';
import type { HTMLAttributes } from "react";
import { useState, createElement } from "react";
import { Dropdown, Button } from "antd";
import TextArea from "antd/es/input/TextArea";
import { BusinessAppContextProps, UserInfoProps } from "./common/BusinessAppContext";

const modules = import.meta.glob('./business-apps/**/[A-Z]*.tsx', { eager: true });

const businessAppMap: Record<string, React.ComponentType<BusinessAppContextProps>> = {};
for (const path in modules) {
  // Skip components in special folders that shouldn't appear in the dropdown
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
    console.log('match[1]', match[1], path)
    businessAppMap[match[1]] = (props) => createElement(UiCatalogProvider, undefined, createElement((modules[path] as any).default, props));
  }
}

const Container = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`gba:flex gba:flex-col ${className || ""}`}>{children}</div>
);

const Header = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`gba:h-12 gba:border-b gba:border-[#e1e3eb] gba:pl-6 ${className || ""}`}>
    {children}
  </div>
);

const Main = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`gba:flex gba:flex-col ${className || ""}`}>{children}</div>
);

const Content = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`gba:flex-1 gba:h-[calc(100vh-48px)] ${className || ""}`}>
    {children}
  </div>
);

export interface CompMeta {
  name: string;
  layoutInfo?: any;
}

export interface BusinessAppIDEProps {
  packageName: string;
  packageVersion: string;
}

export function BusinessAppIDE(props: BusinessAppIDEProps) {
  const { packageName, packageVersion } = props;
  const [currentCompName, setCurrentCompName] = useState<keyof typeof businessAppMap>(
    Object.keys(businessAppMap)[0] as keyof typeof businessAppMap
  );
  const [userInfo, setUserInfo] = useState<string>("");
  const [userInfoError, setUserInfoError] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  
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

  const dropdownItems = Object.keys(businessAppMap).map((comp) => ({
    key: comp,
    label: comp,
    onClick: () => setCurrentCompName(comp as keyof typeof businessAppMap),
  }));

  return (
    <Container>
      <Header className="gba:h-16 gba:flex gba:items-center gba:justify-between">
        <div className="gba:pkg-name gba:leading-[48px] gba:flex-1">
          <span className="gba:text-sm gba:font-bold">{packageName}</span>
          <span className="gba:ml-1 gba:text-xs gba:text-[#333]">
            {" "}
            - Version: {packageVersion}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:space-x-4 gba:pr-6">
          <div className="gba:flex gba:items-center">
            <span className="gba:mr-2 gba:font-bold">Business App:</span>
            <Dropdown menu={{ items: dropdownItems }} arrow>
              <Button>{currentCompName}</Button>
            </Dropdown>
          </div>
          <div className="gba:flex gba:items-center gba:flex-col">
            <div className="gba:flex gba:items-center">
              <span className="gba:mr-2 gba:font-bold gba:whitespace-nowrap">User Info:</span>
              <div className="gba:flex gba:flex-col">
                <TextArea
                  placeholder="Enter user info in JSON format"
                  style={{ minWidth: "200px", maxWidth: "250px", minHeight: "50px", maxHeight: "100px", resize: "none" }}
                  onChange={e => {
                    setUserInfo(e.target.value);
                    validateUserInfo(e.target.value);
                  }}
                  value={userInfo}
                  status={userInfoError ? "error" : ""}
                />
              </div>
            </div>
          </div>
          <div className="gba:flex gba:items-center">
            <span className="gba:mr-2 gba:font-bold gba:whitespace-nowrap">Access Token:</span>
            <TextArea
              placeholder="Enter your access token"
              style={{ minWidth: "400px", maxWidth: "450px", minHeight: "50px", maxHeight: "100px", resize: "none" }}
              onChange={e => setAccessToken(e.target.value)}
              value={accessToken}
            />
          </div>
        </div>
      </Header>
      <Main>
        <Content>
          {currentCompName && (
            <div className="gba:p-4 gba:w-full gba:h-full gba:overflow-auto">
              {createElement(businessAppMap[currentCompName], {
                userInfo: userInfo?.length > 2 ? ((): UserInfoProps | undefined => {
                  try {
                    return JSON.parse(userInfo);
                  } catch (e) {
                    return undefined;
                  }
                })() : undefined,
                accessToken: accessToken ?? undefined
              })}
            </div>
          )}
        </Content>
      </Main>
    </Container>
  );
}
