export default () => ({
  port: parseInt(process.env.PORT as string, 10) || 3000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'memories_db',
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  supabase: {
    url: process.env.DATABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
});