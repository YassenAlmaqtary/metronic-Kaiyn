export interface SqlAgentAskRequest {
  query: string;
  session_id: string;
  memory_enabled: boolean;
}

export interface SqlAgentAskResponse {
  answer?: string;
  output?: string;
  sql?: string;
  progress?: string | null;
  progress_history?: string[] | null;
  session_id?: string | null;
  memory_warning?: string | null;
}

export interface SqlAgentSessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SqlAgentSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SqlAgentSessionHistory {
  session_id: string;
  title: string;
  messages: SqlAgentSessionMessage[];
}

export type AiAssistantMessageRole = 'user' | 'assistant' | 'system';

export interface AiAssistantMessage {
  id: string;
  role: AiAssistantMessageRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
  memoryWarning?: boolean;
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
