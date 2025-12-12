import { addScreenConfigToScreenManagement } from './scripts/api-client.js'
import dotenv from '@dotenvx/dotenvx'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })

// Azure path where files are published
const azureDestinationPath = 'fin/expenses/apps/expense-settings'
const customUrlPath = 'fin/expenses/apps/expense-settings'

// Screen key must match the format: url_fin~expenses~apps~expense-settings
const screenKey = 'url_' + customUrlPath.replace(/\//g, '~')

console.log('🚀 Updating screen in Screen Management service...')
console.log(`   Azure destination path: ${azureDestinationPath}`)
console.log(`   Custom URL path: ${customUrlPath}`)
console.log(`   Screen key: ${screenKey}`)

try {
  await addScreenConfigToScreenManagement(
    azureDestinationPath,
    customUrlPath,
    new Date().toISOString(), // buildNumber
    null, // use default API endpoint from env
    {}, // use default OAuth config from env
    {
      screenKeyOverride: screenKey,
      nameOverride: 'Expense Settings'
    }
  )
  console.log('✅ Screen updated successfully!')
  console.log(`🌐 Access at: https://newwork-dev.newwork.com/platform/${customUrlPath}`)
  console.log(`🔑 Screen key: ${screenKey}`)
} catch (error) {
  console.error('❌ Failed to update screen:', error.message)
  process.exit(1)
}
