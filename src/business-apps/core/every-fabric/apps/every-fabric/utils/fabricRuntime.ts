import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { env } from '@/common/env/EnvUtils'

export const isFlowBotFabricRuntime = (): boolean =>
  env('NEXT_PUBLIC_EVERY_FABRIC_RUNTIME')?.toLowerCase() === 'flowbot' ||
  PROMPT_MANAGER_API_URL.includes('/flowbot/prompt-manager/')
