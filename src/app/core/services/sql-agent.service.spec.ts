import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { TokenStorageService } from '../api/token-storage.service';
import { SqlAgentService } from './sql-agent.service';

describe('SqlAgentService stream parsing', () => {
  let service: SqlAgentService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        SqlAgentService,
        { provide: TokenStorageService, useValue: { getToken: () => null } },
      ],
    });
    service = TestBed.inject(SqlAgentService);
    fetchSpy = spyOn(window, 'fetch');
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
    service.askStream('كم العدد؟', {
      onChunk: (text) => chunks.push(text),
      onDone: () => {
        expect(chunks).toEqual(['العدد 5.']);
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
    service.askStream('كم العدد؟', {
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
    service.askStream('كم العدد؟', {
      onActivity: (activity) => activities.push(activity),
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
