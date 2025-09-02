export interface BusinessAppInfo {
  name: string;
  path: string;
  module: string;
  subModule?: string;
  screenKey: string;
  type: 'app' | 'form' | 'popup';
}

export interface IdeMainMenuProps {
  businessApps: BusinessAppInfo[];
  selectedApp?: BusinessAppInfo | null;
  collapsed: boolean;
  openKeys?: string[];
  onAppSelect: (app: BusinessAppInfo) => void;
  onOpenChange?: (keys: string[]) => void;
}

export interface MenuItemGroup {
  key: string;
  label: string;
  children: MenuItem[];
}

export interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
}
