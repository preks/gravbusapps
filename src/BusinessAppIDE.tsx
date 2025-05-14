import type { HTMLAttributes } from "react";
import { useState, createElement } from "react";
import { Dropdown, Button } from "antd";
import { businessAppMap } from "./index.map";

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

  const dropdownItems = Object.keys(businessAppMap).map((comp) => ({
    key: comp,
    label: comp,
    onClick: () => setCurrentCompName(comp as keyof typeof businessAppMap),
  }));

  return (
    <Container>
      <Header className="flex items-center justify-between">
        <div className="pkg-name leading-[48px] flex-1">
          <span className="text-sm font-bold">{packageName}</span>
          <span className="ml-1 text-xs text-[#333]">
            {" "}
            - Version: {packageVersion}
          </span>
        </div>
        <div className="text-sm font-bold pr-6">
          Business App:
          <Dropdown menu={{ items: dropdownItems }} className="ml-[10px]" arrow>
            <Button>{currentCompName}</Button>
          </Dropdown>
        </div>
      </Header>
      <Main>
        <Content>
          {currentCompName && (
            <div className="p-4 w-full h-full overflow-auto">
              {createElement(businessAppMap[currentCompName])}
            </div>
          )}
        </Content>
      </Main>
    </Container>
  );
}
