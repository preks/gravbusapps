import { UiCatalogProvider } from '@newwork/gravity-ui-catalog';
import type { HTMLAttributes } from "react";
import { useState, createElement } from "react";
import { Dropdown, Button } from "antd";
import TextArea from "antd/es/input/TextArea";
import { BusinessAppContextProps, UserInfoProps } from "./common/BusinessAppContext";

const modules = import.meta.glob('./business-apps/**/[A-Z]*.tsx', { eager: true });

const businessAppMap: Record<string, React.ComponentType<BusinessAppContextProps>> = {};
for (const path in modules) {
  // extract component name from file name
  // and use found component name in businessAppMap with default export
  const excludedDirs = ['/components/', '/modules/', '/hooks/', '/lib/', '/utils/'];
  if (excludedDirs.some(dir => path.includes(dir))) {
    continue;
  }
  const match = path.match(/\/([A-Z][A-Za-z0-9]*)\.tsx$/);
  if (match) {
    businessAppMap[match[1]] = (props) => createElement(UiCatalogProvider, undefined, createElement((modules[path] as any).default, props));
  }
}
const Container = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col ${className || ""}`}>{children}</div>
);

const Header = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`h-12 border-b border-[#e1e3eb] pl-6 ${className || ""}`}>
    {children}
  </div>
);

const Main = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col ${className || ""}`}>{children}</div>
);

const Content = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex-1 h-[calc(100vh-48px)] ${className || ""}`}>
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
      <Header className="h-16 flex items-center justify-between">
        <div className="pkg-name leading-[48px] flex-1">
          <span className="text-sm font-bold">{packageName}</span>
          <span className="ml-1 text-xs text-[#333]">
            {" "}
            - Version: {packageVersion}
          </span>
        </div>
        <div className="flex items-center space-x-4 pr-6">
          <div className="flex items-center">
            <span className="mr-2 font-bold">Business App:</span>
            <Dropdown menu={{ items: dropdownItems }} arrow>
              <Button>{currentCompName}</Button>
            </Dropdown>
          </div>
          <div className="flex items-center flex-col">
            <div className="flex items-center">
              <span className="mr-2 font-bold whitespace-nowrap">User Info:</span>
              <div className="flex flex-col">
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
          <div className="flex items-center">
            <span className="mr-2 font-bold whitespace-nowrap">Access Token:</span>
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
            <div className="p-4 w-full h-full overflow-auto">
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
