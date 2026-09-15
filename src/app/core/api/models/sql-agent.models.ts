export interface SqlAgentAskRequest {
  query: string;
}

export interface SqlAgentAskResponse {
  output: string;
}

export type AiAssistantMessageRole = 'user' | 'assistant' | 'system';

export interface AiAssistantMessage {
  id: string;
  role: AiAssistantMessageRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
}
