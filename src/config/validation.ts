import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_SSL: Joi.string().valid('true', 'false').default('true'),
  DATABASE_SYNCHRONIZE: Joi.string().valid('true', 'false').default('false'),
  DATABASE_LOGGING: Joi.string().valid('true', 'false').default('false'),
  
  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // Stripe - Made optional for initial setup
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  
  // Frontend
  FRONTEND_URL: Joi.string().uri().required(),
  ALLOWED_ORIGINS: Joi.string().optional(),
  
  // Email (optional)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  
  // Supabase
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_KEY: Joi.string().required(),
});