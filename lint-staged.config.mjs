import baseConfig from '@newwork/lint-staged-config'

export default {
  ...baseConfig,
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write']
}
