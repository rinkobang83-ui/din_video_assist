export interface Suggestion {
  label: string;
  description?: string;
  value?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  suggestions?: Suggestion[]; // List of suggestion objects
  isTyping?: boolean;
  sceneImage?: string; // If the message includes a generated image
  timestamp: number;
}

export interface Scene {
  id: string;
  number: number;
  description: string;
  visualPrompt: string;
  audioPrompt: string;
  duration: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
}

export interface MetaPrompt {
  en: string;
  ko: string;
}

export interface ProjectState {
  title: string;
  status: 'planning' | 'scripting' | 'visualizing' | 'complete';
  scenes: Scene[];
  metaPrompt: MetaPrompt | null; // The final output in both languages
}

export enum GeminiModel {
  CHAT = 'gemini-3-flash-preview',
  IMAGE = 'gemini-2.5-flash-image',
}