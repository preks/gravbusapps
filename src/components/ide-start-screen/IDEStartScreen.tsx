import React from 'react';
import { Card, CardContent, Button, Badge } from '@newwork/nw-design-system';
import { Play, Folder, AppWindow, Article, ChatCircle, SquaresFour, Clock, CaretDown, CaretRight } from '@phosphor-icons/react';

import { PageLayout } from '../layout/pageLayout';

// Removed antd Typography and Collapse imports - using nw-design-system instead

interface BusinessAppInfo {
    name: string;
    path: string;
    module: string;
    subModule?: string;
    screenKey: string;
    type: 'app' | 'form' | 'popup';
}

interface RecentlyUsedApp {
    name: string;
    module: string;
    subModule?: string;
    screenKey: string;
    lastUsed: number;
}

interface IDEStartScreenProps {
    businessApps: BusinessAppInfo[];
    onAppSelect: (app: BusinessAppInfo) => void;
}



export const IDEStartScreen: React.FC<IDEStartScreenProps> = ({
    businessApps,
    onAppSelect
}) => {

    const [recentlyUsedApps, setRecentlyUsedApps] = React.useState<RecentlyUsedApp[]>([]);

    // Load and sync recently used apps from centralized tracking in BusinessAppIDE
    React.useEffect(() => {
        const savedRecentApps = localStorage.getItem("business-app-ide-recent-apps");
        if (savedRecentApps) {
            try {
                const parsed = JSON.parse(savedRecentApps);
                setRecentlyUsedApps(parsed);
            } catch (error) {
                console.error("Failed to parse recent apps:", error);
            }
        }
    }, []);

    // Listen for changes to recently used apps
    React.useEffect(() => {
        const handleStorageChange = () => {
            const savedRecentApps = localStorage.getItem("business-app-ide-recent-apps");
            if (savedRecentApps) {
                try {
                    const parsed = JSON.parse(savedRecentApps);
                    setRecentlyUsedApps(parsed);
                } catch (error) {
                    console.error("Failed to parse recent apps:", error);
                }
            }
        };

        // Listen for custom event when localStorage changes in the same window
        const handleCustomStorageChange = () => {
            handleStorageChange();
        };

        // Initial load
        handleStorageChange();

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('recentAppsUpdated', handleCustomStorageChange);
        
        // Periodic refresh as fallback (every 5 seconds)
        const intervalId = setInterval(handleStorageChange, 5000);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('recentAppsUpdated', handleCustomStorageChange);
            clearInterval(intervalId);
        };
    }, []);

    const handleAppClick = (app: BusinessAppInfo) => {
        onAppSelect(app);
    };

    // Group business apps by module and sub-module
    const groupedApps = businessApps.reduce((acc, app) => {
        if (!acc[app.module]) {
            acc[app.module] = {};
        }

        const subModuleName = app.subModule?.split('/')[0] || 'default';
        if (!acc[app.module][subModuleName]) {
            acc[app.module][subModuleName] = [];
        }

        acc[app.module][subModuleName].push(app);
        return acc;
    }, {} as Record<string, Record<string, BusinessAppInfo[]>>);

    const createAppURL = (app: BusinessAppInfo): string => {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?${app.type}=${app.screenKey}`;
    };



    const handleAppLinkClick = (event: React.MouseEvent, app: BusinessAppInfo) => {
        // Allow middle-click and Ctrl+click to work with browser defaults
        if (event.button === 1 || event.ctrlKey || event.metaKey) {
            return; // Let browser handle middle-click and Ctrl+click
        }
        
        // For left-click, prevent default and handle navigation
        event.preventDefault();
        handleAppClick(app);
    };

    const getRecentApps = (): BusinessAppInfo[] => {
        return recentlyUsedApps
            .map(recent => businessApps.find(app =>
                app.screenKey === recent.screenKey
            ))
            .filter(Boolean) as BusinessAppInfo[];
    };

    const formatModuleName = (module: string): string => {
        return module.charAt(0).toUpperCase() + module.slice(1);
    };

    const formatSubModuleName = (subModule: string): string => {
        return subModule === 'default' ? 'General' : subModule.charAt(0).toUpperCase() + subModule.slice(1);
    };

    const getTypeIcon = (type: 'app' | 'form' | 'popup') => {
        switch (type) {
            case 'app':
                return <Play />;
            case 'form':
                return <Article />;
            case 'popup':
                return <ChatCircle />;
            default:
                return <Play />;
        }
    };

    const getTypeColor = (type: 'app' | 'form' | 'popup'): string => {
        switch (type) {
            case 'app':
                return '#1890ff'; // Blue
            case 'form':
                return '#52c41a'; // Green
            case 'popup':
                return '#fa8c16'; // Orange
            default:
                return '#1890ff';
        }
    };

    const getTypeLabel = (type: 'app' | 'form' | 'popup'): string => {
        switch (type) {
            case 'app':
                return 'App';
            case 'form':
                return 'Form';
            case 'popup':
                return 'Popup';
            default:
                return 'App';
        }
    };

    const renderAppButton = (app: BusinessAppInfo) => (
        <a
            key={app.name}
            href={createAppURL(app)}
            onClick={(e) => handleAppLinkClick(e, app)}
            onAuxClick={(e) => {
                // Handle middle-click specifically
                if (e.button === 1) {
                    // Allow browser to open in new tab
                    e.stopPropagation();
                }
            }}
            className="gba:flex gba:items-center gba:mb-1 gba:h-8 gba:w-full gba:text-left gba:justify-start gba:no-underline hover:gba:bg-gray-100 gba:text-gray-700 hover:gba:text-gray-900"
            style={{
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                textDecoration: 'none',
                color: 'inherit'
            }}
        >
            <span style={{ marginRight: '6px', fontSize: '14px', color: getTypeColor(app.type) }}>
                {getTypeIcon(app.type)}
            </span>
            <span className="gba:text-xs gba:truncate gba:text-left gba:flex-grow">{app.name}</span>
            <Badge 
                variant="secondary" 
                className="gba:ml-2 gba:text-xs"
                style={{ backgroundColor: `${getTypeColor(app.type)}20`, color: getTypeColor(app.type) }}
            >
                {getTypeLabel(app.type)}
            </Badge>
        </a>
    );

    // Move state management to component level
    const [expandedSubModules, setExpandedSubModules] = React.useState<Set<string>>(new Set());
    
    const toggleSubModule = (subModule: string) => {
        const newExpanded = new Set(expandedSubModules);
        if (newExpanded.has(subModule)) {
            newExpanded.delete(subModule);
        } else {
            newExpanded.add(subModule);
        }
        setExpandedSubModules(newExpanded);
    };

    const renderSubModuleContent = (subModules: Record<string, BusinessAppInfo[]>) => {
        const subModuleEntries = Object.entries(subModules);

        // If only one sub-module and it's 'default', show apps directly
        if (subModuleEntries.length === 1 && subModuleEntries[0][0] === 'default') {
            return (
                <div className="gba:space-y-1 gba:text-left">
                    {subModuleEntries[0][1].map(renderAppButton)}
                </div>
            );
        }

        // Show sub-modules with collapsible sections
        return (
            <div className="gba:w-full gba:space-y-2">
                {subModuleEntries.map(([subModule, apps]) => {
                    const isExpanded = expandedSubModules.has(subModule);
                    return (
                        <div key={subModule} className="gba:bg-gray-50 gba:rounded gba:mb-2">
                            <Button
                                variant="ghost"
                                onClick={() => toggleSubModule(subModule)}
                                className="gba:w-full gba:justify-between gba:px-4 gba:py-2 gba:text-left"
                            >
                                <div className="gba:flex gba:items-center gba:gap-2">
                                    <Folder className="gba:text-blue-500" />
                                    <span className="gba:text-sm gba:font-medium">
                                        {formatSubModuleName(subModule)}
                                    </span>
                                    <Badge variant="secondary">
                                        {apps.length}
                                    </Badge>
                                </div>
                                {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
                            </Button>
                            {isExpanded && (
                                <div className="gba:px-4 gba:pb-2 gba:space-y-1 gba:text-left">
                                    {apps.map(renderAppButton)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div 
            data-testid="IDE-StartScreen"
            className="gba:min-h-screen nw:bg-gradient-decorative-2"
        >
            <PageLayout
                variant="display"
                headerIcon={<SquaresFour color='#000000' />}
                headerLabel="Business Applications"
                headerLabelClassName="gba:!text-black"
                className="nw:will-change-auto gba:h-full gba:!bg-transparent gba:!shadow-none gba:!rounded-none"
                contentContainer={
                    <div className="gba:p-6">
                        {/* Recently Used Section */}
                        {recentlyUsedApps.length > 0 && (
                            <div className="gba:mb-8">
                                <h4 className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-black gba:text-lg gba:font-semibold">
                                    <Clock color="#000000" />
                                    Recently Used
                                </h4>
                                <div 
                                    className="gba:grid gba:gap-4"
                                    style={{
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        display: 'grid'
                                    }}
                                >
                                    {getRecentApps().map((app) => (
                                        <Card
                                            key={app.name}
                                            className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow gba:cursor-pointer"
                                        >
                                            <CardContent className="gba:p-3">
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
                                                    className="gba:block gba:no-underline gba:text-inherit"
                                                >
                                                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                                        <div style={{ color: getTypeColor(app.type), fontSize: '18px' }}>
                                                            {getTypeIcon(app.type)}
                                                        </div>
                                                        <div className="gba:text-sm gba:font-medium gba:truncate gba:flex-1" title={app.name}>
                                                            {app.name}
                                                        </div>
                                                    </div>
                                                    <div className="gba:text-xs gba:text-gray-500 gba:mb-2">
                                                        {formatModuleName(app.module)}
                                                        {app.subModule && app.subModule !== 'default' && (
                                                            <span> › {formatSubModuleName(app.subModule.split('/')[0])}</span>
                                                        )}
                                                    </div>
                                                    <Badge 
                                                        variant="secondary" 
                                                        className="gba:text-xs"
                                                        style={{ backgroundColor: `${getTypeColor(app.type)}20`, color: getTypeColor(app.type) }}
                                                    >
                                                        {getTypeLabel(app.type)}
                                                    </Badge>
                                                </a>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Module Cards */}
                        <div className="gba:mb-4">
                            <h4 className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-black gba:text-lg gba:font-semibold">
                                <AppWindow color="#000000" />
                                All Applications
                            </h4>
                            {Object.keys(groupedApps).length === 0 ? (
                                <div className="gba:py-12 gba:text-center">
                                    <div className="gba:text-gray-500 gba:text-lg">
                                        No business applications found
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="gba:grid gba:gap-6"
                                    style={{
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                        display: 'grid'
                                    }}
                                >
                                    {Object.entries(groupedApps).map(([module, subModules]) => {
                                        const totalApps = Object.values(subModules).reduce((sum, apps) => sum + apps.length, 0);

                                        return (
                                            <Card
                                                key={module}
                                                className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                                                style={{ height: '400px', display: 'flex', flexDirection: 'column' }}
                                            >
                                                <CardContent 
                                                    className="gba:p-3" 
                                                    style={{ 
                                                        flex: 1, 
                                                        display: 'flex', 
                                                        flexDirection: 'column',
                                                        minHeight: 0,
                                                        height: '100%'
                                                    }}
                                                >
                                                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                                                        <span className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                                                            <AppWindow className="gba:text-blue-600" />
                                                            {formatModuleName(module)}
                                                        </span>
                                                        <Badge variant="secondary">{totalApps}</Badge>
                                                    </div>
                                                    <div 
                                                        style={{ 
                                                            flex: 1, 
                                                            overflowY: 'auto',
                                                            minHeight: 0,
                                                            maxHeight: '100%'
                                                        }}
                                                    >
                                                        {renderSubModuleContent(subModules)}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                }
            />
        </div>
    );
};

export default IDEStartScreen;
