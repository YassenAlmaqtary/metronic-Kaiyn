import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../api/token-storage.service';
import { SqlAgentService } from './sql-agent.service';

describe('SqlAgentService stream parsing', () => {
  let service: SqlAgentService;
  let fetchSpy: jasmine.Spy<typeof fetch>;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SqlAgentService,
        { provide: TokenStorageService, useValue: { getToken: () => null } },
      ],
    });
    service = TestBed.inject(SqlAgentService);
    httpTesting = TestBed.inject(HttpTestingController);
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => httpTesting.verify());

  it('sends the conversation session for memory and reads the backend answer', (done) => {
    service.ask('كم العدد؟', 'conversation-123').subscribe({
      next: (response) => {
        expect(response.answer).toBe('العدد 5.');
        done();
      },
      error: (error) => done.fail(String(error)),
    });

    const request = httpTesting.expectOne(
      `${environment.sqlAgent.baseUrl}${environment.sqlAgent.askPath}`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      query: 'كم العدد؟',
      session_id: 'conversation-123',
      memory_enabled: true,
    });
    request.flush({ answer: 'العدد 5.', session_id: 'conversation-123' });
  });

  it('loads the authenticated session list and its saved transcript', (done) => {
    service.listSessions().subscribe({
      next: (sessions) => {
        expect(sessions[0].session_id).toBe('conversation-123');
        service.getSession('conversation-123').subscribe({
          next: (history) => {
            expect(history.messages[0].content).toBe('السؤال');
            done();
          },
          error: (error) => done.fail(String(error)),
        });
        const historyRequest = httpTesting.expectOne(
          `${environment.sqlAgent.baseUrl}/memory/sessions/conversation-123`,
        );
        expect(historyRequest.request.method).toBe('GET');
        historyRequest.flush({
          session_id: 'conversation-123',
          title: 'السؤال',
          messages: [
            {
              role: 'user',
              content: 'السؤال',
              created_at: '2026-11-27T14:00:00Z',
            },
          ],
        });
      },
      error: (error) => done.fail(String(error)),
    });

    const sessionsRequest = httpTesting.expectOne(
      `${environment.sqlAgent.baseUrl}/memory/sessions`,
    );
    expect(sessionsRequest.request.method).toBe('GET');
    sessionsRequest.flush([
      {
        session_id: 'conversation-123',
        title: 'السؤال',
        created_at: '2026-11-27T14:00:00Z',
        updated_at: '2026-11-27T14:00:00Z',
        message_count: 2,
      },
    ]);
  });

  it('deletes one session or all memory using the authenticated memory endpoints', (done) => {
    service.deleteSession('conversation/123').subscribe({
      next: (response) => {
        expect(response.status).toBe('ok');
        service.deleteAllMemory().subscribe({
          next: (allMemoryResponse) => {
            expect(allMemoryResponse.status).toBe('ok');
            done();
          },
          error: (error) => done.fail(String(error)),
        });
        const allMemoryRequest = httpTesting.expectOne(
          `${environment.sqlAgent.baseUrl}/memory/me`,
        );
        expect(allMemoryRequest.request.method).toBe('DELETE');
        allMemoryRequest.flush({ status: 'ok' });
      },
      error: (error) => done.fail(String(error)),
    });

    const sessionRequest = httpTesting.expectOne(
      `${environment.sqlAgent.baseUrl}/memory/sessions/conversation%2F123`,
    );
    expect(sessionRequest.request.method).toBe('DELETE');
    sessionRequest.flush({ status: 'ok' });
  });

  it('emits the generated answer and ignores completion event metadata', (done) => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        streamResponse([
          'data: {"event":"on_chain_end","node":"generate_answer","data":{"question":"كم العدد؟","answer":"العدد 5."}}',
          '',
          'data: {"event":"complete","node":"end"}',
          '',
        ]),
      ),
    );

    const chunks: string[] = [];
    service.askStream('كم العدد؟', 'conversation-123', {
      onChunk: (text) => chunks.push(text),
      onDone: () => {
        expect(chunks).toEqual(['العدد 5.']);
        done();
      },
      onError: (error) => done.fail(String(error)),
    });
  });

  it('emits saved-memory answers from the dedicated graph node', (done) => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        streamResponse([
          'data: {"event":"on_chain_end","node":"memory_answer","data":{"answer":"ذكرت أنك تعمل في المبيعات."}}',
          '',
          'data: {"event":"complete","node":"end"}',
          '',
        ]),
      ),
    );

    const chunks: string[] = [];
    service.askStream('هل تذكر أين أعمل؟', 'conversation-123', {
      onChunk: (text) => chunks.push(text),
      onDone: () => {
        expect(chunks).toEqual(['ذكرت أنك تعمل في المبيعات.']);
        done();
      },
      onError: (error) => done.fail(String(error)),
    });
  });

  it('emits model stream tokens as deltas without exposing event JSON', (done) => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        streamResponse([
          'event: on_chat_model_stream',
          'data: {"chunk":{"content":"عدد "}}',
          '',
          'event: on_chat_model_stream',
          'data: {"chunk":{"content":"الفواتير 5"}}',
          '',
          'event: complete',
          'data: {"node":"end"}',
          '',
        ]),
      ),
    );

    const chunks: Array<{ text: string; mode?: 'delta' | 'cumulative' }> = [];
    service.askStream('كم العدد؟', 'conversation-123', {
      onChunk: (text, mode) => chunks.push({ text, mode }),
      onDone: () => {
        expect(chunks).toEqual([
          { text: 'عدد ', mode: 'delta' },
          { text: 'الفواتير 5', mode: 'delta' },
        ]);
        done();
      },
      onError: (error) => done.fail(String(error)),
    });
  });

  it('emits safe agent progress stages separately from response text', (done) => {
    fetchSpy.and.returnValue(
      Promise.resolve(
        streamResponse([
          'data: {"event":"on_chain_start","node":"agent"}',
          '',
          'data: {"event":"memory_warning","message":"Memory is unavailable; this request is stateless."}',
          '',
          'data: {"event":"on_tool_start","node":"private_sql_tool"}',
          '',
          'data: {"event":"on_tool_end","node":"private_sql_tool"}',
          '',
          'data: {"event":"on_chat_model_start","node":"ChatGroq"}',
          '',
          'data: {"event":"on_chain_end","node":"generate_answer","data":{"answer":"النتيجة 5"}}',
          '',
          'data: {"event":"complete","node":"end"}',
          '',
        ]),
      ),
    );

    const activities: string[] = [];
    const chunks: string[] = [];
    let memoryWarning = false;
    service.askStream('كم العدد؟', 'conversation-123', {
      onActivity: (activity) => activities.push(activity),
      onMemoryWarning: () => (memoryWarning = true),
      onChunk: (text) => chunks.push(text),
      onDone: () => {
        expect(activities).toEqual([
          'analyzing',
          'querying',
          'dataReady',
          'answering',
          'completed',
        ]);
        expect(chunks).toEqual(['النتيجة 5']);
        expect(activities.join(' ')).not.toContain('private_sql_tool');
        expect(memoryWarning).toBeTrue();
        expect(fetchSpy.calls.mostRecent().args[1]?.body).toBe(
          JSON.stringify({
            query: 'كم العدد؟',
            session_id: 'conversation-123',
            memory_enabled: true,
          }),
        );
        done();
      },
      onError: (error) => done.fail(String(error)),
    });
  });
});

function streamResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(lines.join('\n')));
      controller.close();
    },
  });
  return { ok: true, body } as Response;
}
