import { env } from '@/common/env/EnvUtils'

export const DEFAULT_EMPLOYEE_ID = ''

export const GRAPHQL_API_ENDPOINT = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')

export const ICONS_ENDPOINT = env('NEXT_PUBLIC_BASE_URL') + '/_next/static/media/lowcoder-icons'

export const FILES_ENDPOINT = env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT')

export const EMPLOYEE_FILES_LOCATION = '/api/v1/tenant/files'

export const FILES_ENGINE_ENDPOINT = env('NEXT_PUBLIC_BASE_URL') + '/flowbot/api/expense'

export const PROCESSES_ENDPOINT = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')

export const EVENTS = {
  SUBMIT: 'pse_submit',
  SAVE: 'pse_save',
  NEXT: 'pse_next',
  CANCEL: 'pse_cancel',
  ABORT: 'pse_abort',
  SKIP: 'pse_skip',
  DISCARD: 'pse_discard'
} as const
