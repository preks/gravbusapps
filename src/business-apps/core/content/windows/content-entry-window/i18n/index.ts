import { mergeTranslations, createPrefixedTranslations, type I18nModule } from '@/common/utils/localizationUtils'
import parentTranslations from '../../../_i18n'

import deDE from './de-DE.ftl?raw'
import enUS from './en-US.ftl?raw'
import roRO from './ro-RO.ftl?raw'

const ownTranslations: I18nModule = createPrefixedTranslations(deDE, enUS, roRO, 'core-content-content-entry-window-')
const entryWindowTranslations: I18nModule = mergeTranslations(parentTranslations, ownTranslations)

export default entryWindowTranslations
