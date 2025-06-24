import React from 'react';
import { ConfigProvider, theme as antdTheme, ThemeConfig } from 'antd';
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext';

export interface ThemeProviderProps extends BusinessAppContextProps {
  children: React.ReactNode;
  themeMode?: 'light' | 'dark';
}

/**
 * ThemeProvider wraps children with Ant Design ConfigProvider and provides theme switching.
 * Tailwind dark mode should be handled by toggling the 'dark' class on the html/body element externally.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  themeMode = 'light',
  ...ctxProps
}) => {
  // You can expand theme tokens here for more customization
  const themeConfig: ThemeConfig = {
    algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div data-testid="gba-theme-provider" className="gba:theme-provider">
        {children}
      </div>
    </ConfigProvider>
  );
};

export default ThemeProvider;
