import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return true
    if (origin.includes('.pages.dev') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin
    }
    return false
  },
  credentials: true,
}))

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    status: 'success',
    message: 'Bank API running on Cloudflare Workers',
    timestamp: new Date().toISOString(),
  })
})

// Authentication
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json()
    return c.json({ error: 'Configure MongoDB connection' }, 503)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

app.post('/api/auth/signup', async (c) => {
  try {
    const body = await c.req.json()
    return c.json({ error: 'Configure MongoDB connection' }, 503)
  } catch (e) {
    return c.json({ error: e.message }, 400)
  }
})

app.post('/api/auth/logout', (c) => {
  return c.json({ status: 'success' })
})

// Default 404
app.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default app
