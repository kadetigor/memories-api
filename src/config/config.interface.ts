export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
    ssl: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  frontend: {
    url: string;
    allowedOrigins: string[];
  };
}