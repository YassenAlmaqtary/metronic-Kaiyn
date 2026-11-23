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
  steps?: AiAssistantStep[];
}

export type AiAssistantStepKey =
  | 'analyzing'
  | 'querying'
  | 'dataReady'
  | 'answering'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface AiAssistantStep {
  id: string;
  key: AiAssistantStepKey;
  status: 'active' | 'done' | 'error';
}
