import React from 'react';
import { ConfigProvider, Menu } from 'antd';
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

// (removed unused createAppURL)

export const IdeMainMenu: React.FC<IdeMainMenuProps> = ({
  businessApps,
  selectedApp,
  collapsed,
  openKeys,
  onAppSelect,
  onOpenChange
}) => {
  
  // (removed unused handleAppLinkClick)

  const onAppSelectRef = React.useRef(onAppSelect);
  React.useEffect(() => {
    onAppSelectRef.current = onAppSelect;
  }, [onAppSelect]);

  const createAppMenuItem = (app: BusinessAppInfo) => {
    return {
      key: app.screenKey,
      icon: <span style={{ color: getTypeColor(app.type) }}>{getTypeIcon(app.type)}</span>,
      label: app.name, // Simplified - just use the string directly
      onClick: () => onAppSelectRef.current(app),
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

    return Object.entries(moduleGroups).map(([module, subModules]) => {
      const subModuleEntries = Object.entries(subModules);
      const moduleLabel = module.toUpperCase();
      const moduleAbbrev = module.slice(0, 4).toUpperCase();

      const children =
        subModuleEntries.length === 1 && subModuleEntries[0][0] === "default"
          ? subModuleEntries[0][1].map(createAppMenuItem)
          : subModuleEntries
              .map(([subModule, apps]) => {
                if (subModule === "default") {
                  return apps.map(createAppMenuItem);
                }
                return {
                  key: `${module}/${subModule}`,
                  label: subModule.charAt(0).toUpperCase() + subModule.slice(1),
                  children: apps.map(createAppMenuItem)
                };
              })
              .flat();

      return {
        key: module,
        label: moduleLabel,
        title: moduleLabel,
        icon: collapsed ? (
          <span style={{ display: 'flex', width: '100%', justifyContent: 'center', textAlign: 'center' }}>
            {moduleAbbrev}
          </span>
        ) : undefined,
        children
      };
    });
  };

  const menuItems = React.useMemo(() => getMenuItems(), [businessApps, collapsed]);
  const antTheme = React.useMemo(() => ({
    components: {
      Menu: {
        collapsedWidth: 68,
      },
    },
  }), []);

  return (
    <ConfigProvider theme={antTheme}>
      <Menu
        mode="inline"
        selectedKeys={selectedApp ? [selectedApp.screenKey] : []}
        openKeys={openKeys}
        onOpenChange={onOpenChange}
        items={menuItems}
        inlineCollapsed={collapsed}
        data-testid="ide-menu"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      />
    </ConfigProvider>
  );
};

export default IdeMainMenu;
