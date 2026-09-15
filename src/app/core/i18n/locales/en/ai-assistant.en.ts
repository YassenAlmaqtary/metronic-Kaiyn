export const aiAssistantEn = {
  'aiAssistant.title': 'Smart assistant',
  'aiAssistant.subtitle': 'Ask about data and reports in natural language',
  'aiAssistant.open': 'Open smart assistant',
  'aiAssistant.welcome':
    'Hi — I am your Kayian ERP assistant. Ask about stock, invoices, or accounts. Always verify answers before acting on them.',
  'aiAssistant.placeholder': 'Type your question...',
  'aiAssistant.send': 'Send',
  'aiAssistant.cancel': 'Stop',
  'aiAssistant.clear': 'Clear chat',
  'aiAssistant.thinking': 'Analyzing... this may take up to a minute',
  'aiAssistant.error': 'Could not get a response from the assistant',
  'aiAssistant.corsOrNetwork':
    'Could not reach the SQL agent — ensure it is running on port 8050 and restart ng serve after proxy changes',
  'aiAssistant.unauthorized':
    'The agent rejected the token — ensure the SQL agent accepts the same Kayian ERP JWT',
  'aiAssistant.proxyMissing':
    'SQL agent proxy is not loaded — stop the server on 4200 and restart, or open http://localhost:4201',
  'aiAssistant.emptyResponse': 'The assistant returned no content.',
  'aiAssistant.disclaimer': 'Answers are assistive only — verify data before decisions.',
  'aiAssistant.suggestion.stock': 'What are the top 5 moving items this month?',
  'aiAssistant.suggestion.accounts': 'Summarize the account groups',
  'aiAssistant.suggestion.invoices': 'How many unpaid sales invoices are there?',
  'aiAssistant.you': 'You',
  'aiAssistant.assistant': 'Assistant',
} as const;
