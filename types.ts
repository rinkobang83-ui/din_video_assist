export interface Suggestion {
  label: string;
  value: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  suggestions?: string[]; // List of quick reply options
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

export interface ProjectState {
  title: string;
  status: 'planning' | 'scripting' | 'visualizing' | 'complete';
  scenes: Scene[];
  metaPrompt: string; // The final output
}

export enum GeminiModel {
  CHAT = 'gemini-3-flash-preview',
  IMAGE = 'gemini-2.5-flash-image',
}