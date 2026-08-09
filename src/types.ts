export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  status: 'success' | 'error';
  model?: string;
  prompt?: string;
  response?: string;
  error?: string;
  message?: string;
}

export interface ApiTestLog {
  id: string;
  timestamp: string;
  method: 'POST' | 'GET';
  url: string;
  requestBody: any;
  status: number;
  durationMs: number;
  responseBody: any;
}

export interface GoogleUser {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  model: string;
  api_key_configured: boolean;
  endpoints?: Record<string, string>;
  isServerOnline?: boolean;
}

export interface ServerUrls {
  publicUrl: string;
  lanUrls: string[];
  localhostUrl: string;
}

export interface ServerStatus {
  isServerOnline: boolean;
  status: 'online' | 'shutdown';
  service: string;
  port: number;
  uptimeSeconds: number;
  api_key_configured: boolean;
  mediaStats?: {
    fileCount: number;
    totalMediaSizeMb: string;
  };
  urls?: ServerUrls;
  memory?: {
    freeMb: string;
    totalMb: string;
  };
}
