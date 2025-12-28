export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum ModelId {
  GEMINI_FLASH = 'gemini-3-flash-preview',
  GEMINI_PRO = 'gemini-3-pro-preview',
  IMAGEN = 'imagen-4.0-generate-001',
  GEMINI_EDIT = 'gemini-2.5-flash-image', // For editing
  GEMINI_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  images?: string[]; // Base64 strings
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface N8nAgent {
  id: string;
  name: string;
  webhookUrl: string;
  authToken: string;
  isActive: boolean; // Controls if it appears in the main model selector
}

export interface AppSettings {
  systemInstruction: string;
  n8nAgents: N8nAgent[];
  geminiApiKey: string; // User-provided override
}

export interface N8NResponse {
  text: string;
  output?: any; 
}