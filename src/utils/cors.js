const defaultWhitelist = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:9549',
  'https://88c98d580c697d.lhr.life'
]

const envWhitelist = (process.env.CORS_WHITELIST || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)

const whitelist = Array.from(new Set([...defaultWhitelist, ...envWhitelist]))

let allow
if (process.env.NODE_ENV === 'development') {
  allow = '*'
} else {
  allow = function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

const corsOptions = {
  origin: allow
}

module.exports = { corsOptions }
