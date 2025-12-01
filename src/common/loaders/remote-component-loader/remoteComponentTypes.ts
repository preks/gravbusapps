import React from 'react'
import * as antd from 'antd'

/**
 * Type definitions for the remote component loading functionality
 */

export interface UserInfoProps {
  id: string
  userName: string
  givenName: string
  familyName: string
  nickName: string
  tenantId?: string
  employeeDetails: {
    employeeId: string
    firstName: string
    lastName: string
    supervisor: {
      id: string
      firstName: string
      lastName: string
      userId: string
    }
    organizationalUnit: {
      id: string
      name: string
    }
  }
}

// Interface for remote component props
export interface RemoteComponentProps {
  accessToken?: string
  userInfo?: UserInfoProps
  additionalData?: { [k: string]: any }
}

/**
 * Global window interface extensions for remote component loading
 */
export interface RemoteWindowExtensions extends Window {
  // Core libraries
  React: typeof React
  ReactDOM: any
  ReactJSXRuntime: any
  ReactJSXDevRuntime: any
  antd: typeof antd
  DNDKitCore: any
  DNDKitUtilities: any
  DNDKitSortable: any
  zustand: any
  clsx: any
  tailwindMerge: any
  reactIcons: any
  reactI18Next: any
  GravityUICatalog: any
  remixIconReact: any

  // Other UI libraries
  classVarianceAuthority: any
  cmdk: any
  emblaCarouselReact: any
  inputOtp: any
  lucideReact: any
  reactDayPicker: any
  reactHookForm: any
  reactResizablePanels: any
  recharts: any
  vaul: any

  // Dynamic registration and module support
  [key: string]: any // Allow for dynamic component registration
  __componentLoaded?: boolean
  __componentError?: string | null
  __moduleExports?: any
  __componentRegistered?: Record<string, boolean> // Track registration state for multiple components
  registerComponent?: (name: string, component: React.ComponentType<RemoteComponentProps>) => void
  __modules?: Record<string, any>
  module?: { exports: any }
  exports?: any
  require?: (moduleName: string) => any
  __REACT_IMPORT_PROXY_INJECTED?: boolean
  __originalCreateElement?: any
  __safeCreateElement?: any
  __libNamesInitialized?: boolean
  __libNames?: string[]
}

/**
 * Configuration for a library to be exposed to the remote component
 */
export interface ExposedLibrary {
  /** Name of the library as it would be required (e.g., 'react') */
  name: string
  /** The actual library object to expose */
  lib: any
  /** Optional path transformations for submodule requires */
  submodules?: {
    /** Path pattern to match (e.g., 'antd/') */
    pattern: string
    /** Handler function to resolve the submodule */
    resolver: (fullPath: string) => any
  }[]
}

/**
 * Configuration options for loading a remote component
 */
export interface RemoteComponentLoaderOptions {
  /** Direct URL to the component (optional if componentPath is provided) */
  componentUrl?: string
  /** Path to the component relative to the CDN base (optional if componentUrl is provided) */
  componentPath?: string
  /** Base URL for the CDN (optional, defaults to production CDN) */
  componentCdnBase?: string
  /** Name of the component to register (required) */
  componentName: string
  /** Version of the component for constructing versioned URLs (optional) */
  version?: string
  /** Additional libraries to expose to the remote component (optional) */
  exposedLibraries?: ExposedLibrary[]
  /** Timeout for component loading in milliseconds (optional, default: 5000ms) */
  timeout?: number
  /** Custom cache key for component isolation (optional, defaults to componentName) */
  cacheKey?: string
}
