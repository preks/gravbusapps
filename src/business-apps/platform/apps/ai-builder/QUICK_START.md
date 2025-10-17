# AI Builder Quick Start Guide

Get the NEWWORK AI Builder running in 5 minutes!

## Prerequisites

- Node.js 20+ installed
- Git installed
- Access to the gravity-business-apps repository
- Access to the FORGE repository

## Step 1: Start FORGE Backend

```bash
# Navigate to FORGE
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge

# Install dependencies (first time only)
pnpm install

# Start the FORGE API
pnpm run dev

# Verify it's running
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

## Step 2: Index gravbusapps Repository

1. Open FORGE dashboard: http://localhost:3001/dashboard
2. Click "Add Repository"
3. Enter URL: `https://github.com/preks/gravbusapps`
4. Branch: `main`
5. Click "Start Indexing"
6. Wait for completion (~5-10 minutes for first index)

## Step 3: Start Conductor Proxy (for publishing)

```bash
# Navigate to gravity-business-apps root
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/BusinessApps/gravity-business-apps

# Start conductor proxy (handles both conductor API AND AI Builder publishing)
npm run proxy:conductor

# Verify it's running
curl http://localhost:3002/health
# Expected: {"status":"ok"}
```

## Step 4: Configure Environment

Create or update `.env` in project root:

```env
# FORGE API URL
FORGE_API_URL=http://localhost:3000

# Publish Service Port
PUBLISH_PORT=3002

# Project Root (adjust to your path)
PROJECT_ROOT=/Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps

# Azure Storage (for publishing)
AZURE_STORAGE_ACCOUNT=your_storage_account
AZURE_STORAGE_SAS_TOKEN=your_sas_token
AZURE_BLOB_CONTAINER_NAME=screens
```

## Step 5: Start gravity-business-apps Dev Server

```bash
# Navigate to gravity-business-apps root
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/BusinessApps/gravity-business-apps

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# App will be available at http://localhost:3001
```

## Step 6: Access AI Builder

1. Open NEWWORK platform: http://localhost:3001
2. Navigate to: `/apps/platform/ai-builder`
3. You should see the AI Builder interface

## Step 7: Build Your First Screen

1. In the chat interface, type:
   ```
   Create a simple lead list screen with columns for name, company, and status
   ```

2. Wait for AI to generate the files (~30 seconds)

3. Review generated files in the "Files" tab

4. Preview the screen in the "Preview" tab (optional)

5. Click "Publish to Platform" when ready

6. Enter:
   - Screen Path: `crm/customers/apps/my-leads`
   - Resource URL: `/apps/crm/my-leads`

7. Click "Publish Screen"

8. Your screen is now live at: `http://localhost:3001/apps/crm/my-leads`

## Troubleshooting

### FORGE Not Running
```bash
# Check logs
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge
pnpm run dev

# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Publish Service Not Running
```bash
# Check logs
cd gravity-business-apps/src/business-apps/platform/apps/ai-builder/server
npm start

# Check if port 3002 is in use
lsof -i :3002
```

### Repository Not Indexed
```bash
# Check indexing status
curl http://localhost:3000/api/repos/gravbusapps-main/status

# If not found, re-add in FORGE dashboard
# Go to: http://localhost:3001/dashboard
```

### AI Not Responding
1. Check FORGE is running
2. Check repository is indexed (status: "completed")
3. Check browser console for errors
4. Verify FORGE_API_URL in .env

### Publish Fails
1. Check publish service is running
2. Verify PROJECT_ROOT in .env is correct
3. Check Azure credentials are valid
4. Verify screen path format: `module/sub-module/apps/screen-name`

## Next Steps

- Read the full [README.md](./README.md) for advanced features
- Try more complex prompts
- Customize AI behavior
- Set up production deployment

## Support

For issues or questions:
1. Check the [README.md](./README.md)
2. Review FORGE documentation
3. Check gravity-business-apps guidelines

---

**Happy Building! 🚀**

