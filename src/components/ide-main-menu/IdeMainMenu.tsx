import React from 'react';
import { Menu } from 'antd';
import { Play, ArticleNyTimes, ChatCircle } from '@phosphor-icons/react';
import { IdeMainMenuProps, BusinessAppInfo } from './types';

// Icon mapping for different app types
const getTypeIcon = (type: 'app' | 'form' | 'popup') => {
  switch (type) {
    case 'app': return <Play size={16} />;
    case 'form': return <ArticleNyTimes size={16} />;
    case 'popup': return <ChatCircle size={16} />;
    default: return <Play size={16} />;
  }
};

// Color mapping for different app types
const getTypeColor = (type: 'app' | 'form' | 'popup'): string => {
  switch (type) {
    case 'app': return '#1890ff';
    case 'form': return '#52c41a';
    case 'popup': return '#fa8c16';
    default: return '#1890ff';
  }
};

// Create URL for navigation
const createAppURL = (app: BusinessAppInfo): string => {
  return `#/business-app/${app.screenKey}`;
};

export const IdeMainMenu: React.FC<IdeMainMenuProps> = ({
  businessApps,
  selectedApp,
  collapsed,
  openKeys,
  onAppSelect,
  onOpenChange
}) => {
  
  const handleAppLinkClick = (event: React.MouseEvent, app: BusinessAppInfo) => {
    // For left-click, prevent default and handle navigation
    event.preventDefault();
    onAppSelect(app);
  };

  const createAppMenuItem = (app: BusinessAppInfo) => {
    return {
      key: app.screenKey,
      icon: <span style={{ color: getTypeColor(app.type) }}>{getTypeIcon(app.type)}</span>,
      label: app.name, // Simplified - just use the string directly
      onClick: () => onAppSelect(app),
      style: {
        color: "#333333",
        fontSize: "14px"
      }
    };
  };

  const getMenuItems = () => {
    const moduleGroups: Record<string, Record<string, BusinessAppInfo[]>> = {};

    businessApps.forEach((app) => {
      if (!moduleGroups[app.module]) {
        moduleGroups[app.module] = {};
      }

      // Use the full subModule path to avoid key collisions
      let subModuleName = "default";
      if (app.subModule) {
        subModuleName = app.subModule; // Use full path instead of just first part
      }

      if (!moduleGroups[app.module][subModuleName]) {
        moduleGroups[app.module][subModuleName] = [];
      }

      moduleGroups[app.module][subModuleName].push(app);
    });

    return Object.entries(moduleGroups).map(([module, subModules]) => {
      const subModuleEntries = Object.entries(subModules);

      // If there's only one sub-module and it's "default", don't create a sub-menu
      if (
        subModuleEntries.length === 1 &&
        subModuleEntries[0][0] === "default"
      ) {
        return {
          key: module,
          label: module.charAt(0).toUpperCase() + module.slice(1),
          children: subModuleEntries[0][1].map(createAppMenuItem)
        };
      }

      const children = subModuleEntries
        .map(([subModule, apps]) => {
          if (subModule === "default") {
            return apps.map(createAppMenuItem);
          }

          return {
            key: `${module}/${subModule}`,
            label: subModule.replace(/\//g, ' / ').charAt(0).toUpperCase() + subModule.replace(/\//g, ' / ').slice(1),
            children: apps.map(createAppMenuItem)
          };
        })
        .flat();

      return {
        key: module,
        label: module.charAt(0).toUpperCase() + module.slice(1),
        children
      };
    });
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={selectedApp ? [selectedApp.screenKey] : []}
      openKeys={openKeys}
      onOpenChange={onOpenChange}
      style={{ borderRight: 0 }}
      items={getMenuItems()}
      inlineCollapsed={collapsed}
      data-testid="ide-menu"
    />
  );
};

export default IdeMainMenu;
