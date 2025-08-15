import React from 'react';
import { Card, Typography, Button, Empty, Row, Col, Collapse, Tag } from 'antd';
import { Play, Folder, AppWindow, ArticleNyTimes, ChatCircle } from '@phosphor-icons/react';
import { PiSquaresFourDuotone, PiAppWindowBold, PiClockBold } from 'react-icons/pi';
import BackgroundImage from '../../assets/images/background.png';
import { PageLayout } from '../layout/pageLayout';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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
    lastUsed: number;
}

interface IDEStartScreenProps {
    businessApps: BusinessAppInfo[];
    onAppSelect: (app: BusinessAppInfo) => void;
    recentlyUsedApps: RecentlyUsedApp[];
}



export const IDEStartScreen: React.FC<IDEStartScreenProps> = ({
    businessApps,
    onAppSelect,
    recentlyUsedApps
}) => {

    // Recently used apps are now managed by the parent component

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
        const url = new URL(window.location.href);
        url.searchParams.set("app", app.name);
        return url.toString();
    };

    const handleAppClick = (app: BusinessAppInfo) => {
        onAppSelect(app);
    };

    const handleAppLinkClick = (event: React.MouseEvent, app: BusinessAppInfo) => {
        // Allow middle-click and right-click to work with browser defaults
        if (event.button === 1 || event.button === 2) {
            return; // Let browser handle middle-click and right-click
        }
        
        // For left-click, prevent default and handle navigation
        event.preventDefault();
        handleAppClick(app);
    };

    const getRecentApps = (): BusinessAppInfo[] => {
        return recentlyUsedApps
            .map(recent => businessApps.find(app =>
                app.name === recent.name &&
                app.module === recent.module &&
                app.subModule === recent.subModule
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
                return <ArticleNyTimes />;
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
            className="gba:w-full gba:text-left gba:justify-start gba:mb-1 gba:h-8 gba:flex gba:items-center gba:no-underline hover:gba:bg-gray-100 gba:text-gray-700 hover:gba:text-gray-900"
            style={{
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                justifyContent: 'flex-start',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            <span style={{ marginRight: '6px', fontSize: '14px', color: getTypeColor(app.type) }}>
                {getTypeIcon(app.type)}
            </span>
            <span className="gba:text-xs gba:truncate gba:text-left gba:flex-grow">{app.name}</span>
            <Tag size="small" color={getTypeColor(app.type)} style={{ marginLeft: '4px', fontSize: '10px' }}>
                {getTypeLabel(app.type)}
            </Tag>
        </a>
    );

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
            <Collapse
                ghost
                size="small"
                className="gba:w-full"
                expandIconPosition="end"
            >
                {subModuleEntries.map(([subModule, apps]) => (
                    <Panel
                        key={subModule}
                        header={
                            <div className="gba:flex gba:items-center gba:gap-2">
                                <Folder className="gba:text-blue-500" />
                                <Text strong className="gba:text-sm">
                                    {formatSubModuleName(subModule)}
                                </Text>
                                <Tag color="blue">
                                    {apps.length}
                                </Tag>
                            </div>
                        }
                        className="gba:bg-gray-50 gba:rounded gba:mb-2"
                    >
                        <div className="gba:space-y-1 gba:pl-4 gba:text-left">
                            {apps.map(renderAppButton)}
                        </div>
                    </Panel>
                ))}
            </Collapse>
        );
    };

    return (
        <div data-testid="IDE-StartScreen">
            <PageLayout
                variant="display"
                headerIcon={<PiSquaresFourDuotone color='#FFFFFF' />}
                headerLabel="Business Applications"
                headerLabelClassName="gba:!text-white"
                backgroundImage={BackgroundImage}
                contentContainer={
                    <div className="gba:p-6">
                        {/* Recently Used Section */}
                        {recentlyUsedApps.length > 0 && (
                            <div className="gba:mb-8">
                                <Title level={4} className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:!text-white">
                                    <PiClockBold color="#FFFFFF" />
                                    Recently Used
                                </Title>
                                <Row gutter={[16, 16]} justify="center">
                                    {getRecentApps().map((app) => (
                                        <Col key={app.name} xs={24} sm={12} md={8} lg={6} xl={4}>
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
                                                    display: 'block'
                                                }}
                                            >
                                                <Card
                                                    hoverable
                                                    size="small"
                                                    className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="gba:text-center">
                                                        <div style={{ color: getTypeColor(app.type), fontSize: '24px', marginBottom: '8px' }}>
                                                            {getTypeIcon(app.type)}
                                                        </div>
                                                        <div className="gba:text-sm gba:font-medium gba:truncate" title={app.name}>
                                                            {app.name}
                                                        </div>
                                                        <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                                                            {formatModuleName(app.module)}
                                                            {app.subModule && app.subModule !== 'default' && (
                                                                <span> › {formatSubModuleName(app.subModule.split('/')[0])}</span>
                                                            )}
                                                        </div>
                                                        <Tag size="small" color={getTypeColor(app.type)} style={{ marginTop: '4px' }}>
                                                            {getTypeLabel(app.type)}
                                                        </Tag>
                                                    </div>
                                                </Card>
                                            </a>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* Module Cards */}
                        <div className="gba:mb-4">
                            <Title level={4} className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:!text-white">
                                <PiAppWindowBold color="#FFFFFF" />
                                All Applications
                            </Title>
                            {Object.keys(groupedApps).length === 0 ? (
                                <Empty
                                    description="No business applications found"
                                    className="gba:py-12"
                                />
                            ) : (
                                <Row gutter={[24, 24]}>
                                    {Object.entries(groupedApps).map(([module, subModules]) => {
                                        const totalApps = Object.values(subModules).reduce((sum, apps) => sum + apps.length, 0);

                                        return (
                                            <Col key={module} xs={24} sm={12} lg={8} xl={6}>
                                                <Card
                                                    title={
                                                        <div className="gba:flex gba:items-center gba:justify-between">
                                                                                                    <span className="gba:flex gba:items-center gba:gap-2">
                                            <AppWindow className="gba:text-blue-600" />
                                            {formatModuleName(module)}
                                        </span>
                                                            <Tag color="blue">{totalApps}</Tag>
                                                        </div>
                                                    }
                                                    className="gba:shadow-sm hover:gba:shadow-md gba:transition-shadow"
                                                    style={{ height: '400px' }}
                                                    bodyStyle={{
                                                        padding: '12px',
                                                        height: 'calc(100% - 57px)',
                                                        overflowY: 'auto'
                                                    }}
                                                >
                                                    {renderSubModuleContent(subModules)}
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                </Row>
                            )}
                        </div>
                    </div>
                }
            />
        </div>
    );
};

export default IDEStartScreen;
