import { useTranslation } from '@newwork/nw-design-system'
import setupTranslations from '../_i18n'

/**
 * Fluent (`*.ftl`) strings for the platform setup remote bundle.
 * Requires {@link import('@newwork/nw-design-system').LocalizationProvider} from the remote loader wrapper.
 */
export function useSetupTranslation() {
  return useTranslation(setupTranslations as unknown as Record<string, string>)
}
