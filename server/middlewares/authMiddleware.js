import { getAuth } from '@clerk/express'

// Goal: avoid 302 redirects for API calls and instead return JSON,
// while still ensuring req.auth has a valid userId for downstream controllers.
export const protect = (req, res, next) => {
  try {
    const { userId, sessionId } = getAuth(req) || {}

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Normalize req.auth so existing controllers
    // that do `const { userId } = req.auth;` continue to work.
    req.auth = { userId, sessionId }

    return next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(401).json({ message: 'Unauthorized' })
  }
}