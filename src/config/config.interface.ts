export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
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