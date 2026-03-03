import base from '@newwork/lint-staged-config'

// Override eslint to add --no-warn-ignored so ignored test files don't fail the build
const config = { ...base }
const eslintTask = config['*.{js,jsx,ts,tsx,mjs,cjs}']
config['*.{js,jsx,ts,tsx,mjs,cjs}'] = Array.isArray(eslintTask)
  ? eslintTask.map(cmd =>
      typeof cmd === 'string' && cmd.startsWith('eslint') ? cmd.replace('eslint ', 'eslint --no-warn-ignored ') : cmd
    )
  : eslintTask

export default config
