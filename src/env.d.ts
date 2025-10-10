// This file is for custom global type declarations specific to your Vite project.
// It can be used to declare types for environment variables or other global constructs
// made available through Vite's `define` feature or similar mechanisms.

interface AppBuildInfo {
  gitUser: string
  publishTime: string // ISO string format
}

/**
 * A JSON string containing the application build information.
 * This is injected by Vite at build time via the `define` config.
 * It should be parsed to get the AppBuildInfo object.
 */
declare const BUILD_INFO_JSON_STRING: string

/**
 * Information about the application build, made globally available after parsing BUILD_INFO_JSON_STRING.
 * Contains the Git username of the publisher and the ISO timestamp of the publish.
 */
declare let __APP_BUILD_INFO__: AppBuildInfo
// Using `declare var` makes it assignable on globalThis/window and accessible globally.

// If you have other global types, you can add them here.
// For example, if you use Vite's `import.meta.env` for other custom env variables:
// interface ImportMetaEnv {
//   readonly VITE_MY_CUSTOM_VARIABLE: string;
//   // more env variables...
// }
//
// interface ImportMeta {
//   readonly env: ImportMetaEnv;
// }

declare global {
  interface Window {
    printPerf: () => void
    __LOWCODER_ORG__?: {}
    $lowcoder_sdk?: { [key: string]: any }
    lowcoder: {
      activeStructureId: string
      platformContext: {
        employeeId: string
        structureId: string
        organizationalUnitId: string
        managerId: string
        locationId: string
      }
      getActiveUserLocale?: () => string
      getCatalogValue?: (value: any) => string
      getDateFormat?: (format: string) => string
      getTranslationFromI18nKeyAndLabel?: (key: string, defaultValue: string, translationVariables?: {}) => string
      formatDate?: (
        dateValue: Date | string | undefined,
        format?: string,
        customSpecificFormat?: string
      ) => string | undefined
      i18n?: {
        formatDate?: (
          dateValue: Date | string | undefined,
          format?: string,
          customSpecificFormat?: string | null
        ) => string | undefined
        selectedLocale?: string
        t: (key: string, label?: string | {}) => string
        formatNumber?: (number: number | string, format: string) => string
        l10nResources?: {
          dateTime: {
            'fullDateTime.ISO': string
          }
        }
      }
      [key: string]: any
    }
  }
}

export {}
