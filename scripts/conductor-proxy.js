import express from 'express'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'
import dotenv from 'dotenv'

// Load environment variables from project root
dotenv.config({ path: new URL('../.env', import.meta.url).pathname })

// Create Express server
const app = express()
const PORT = process.env.PROXY_PORT || 3002

// Configure server to handle large headers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Increase server header size limit
app.maxHttpHeaderSize = 32 * 1024 // 32KB header size limit

// Enable CORS for all routes with more permissive settings
app.use(
  cors({
    origin: '*', // Allow requests from any origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
)

// Add CORS headers to every response
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')

  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.status(204).send()
  }

  next()
})

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Create proxy middleware
const conductorProxy = createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,

  // Increase header size limit in proxy
  proxyTimeout: 60000,
  // Handle headers
  onProxyReq: (proxyReq, req) => {
    // Log and then remove the authorization header
    const authHeader = req.headers.authorization
    if (authHeader) {
      console.log(`Stripping Authorization header (${authHeader.length} bytes) from request`)
      // Remove the Authorization header before forwarding to Conductor
      proxyReq.removeHeader('Authorization')
    }
  },
  // Increase header buffer size
  headerBufferSize: 64 * 1024, // 64KB
  onProxyRes: (proxyRes, req) => {
    // Add CORS headers to response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*'
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true'

    // Log response status
    console.log(`${req.method} ${req.path} → ${proxyRes.statusCode}`)
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err)
    res.status(500).json({ error: 'Proxy error', message: err.message })
  }
})

// Apply proxy middleware to all routes
app.use('/', conductorProxy)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`Conductor API Proxy running on http://localhost:${PORT}`)
  console.log(`Proxying requests to ${process.env.CONDUCTOR_API_URL || 'http://localhost:8080'}`)
  console.log('CORS is enabled for frontend development')
})
