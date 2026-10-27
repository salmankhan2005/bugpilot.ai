import { queryLocalDatabase } from '@/lib/local-worker/database';
import { assertLocalWorkerEnabled } from '@/lib/local-worker/security';
import { getCurrentUser } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

const EVENT_POLL_INTERVAL_MS = 750;

interface RouteContext {
  params: Promise<{ runId: string }>;
}

interface EventRow {
  seq: number | null;
  type: string | null;
  actor: string | null;
  summary: string | null;
  payload: Record<string, unknown> | null;
  created_at: Date | null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    assertLocalWorkerEnabled(request);
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: 'Sign in to access run events.' }, { status: 401 });
    const { runId } = await context.params;
    const url = new URL(request.url);
    const expectedProjectId = url.searchParams.get('projectId');
    const lastEventId = request.headers.get('last-event-id') || url.searchParams.get('after') || '0';
    const initialSequence = Number(lastEventId);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(runId)
      || (expectedProjectId !== null && !/^[a-zA-Z0-9_-]{1,100}$/.test(expectedProjectId))
      || !Number.isSafeInteger(initialSequence)
      || initialSequence < 0) {
      return Response.json({ error: 'Invalid run event request.' }, { status: 400 });
    }
    const ownedRun = await queryLocalDatabase<{ id: string }>(
      `SELECT id FROM bp_local_runs
       WHERE id = $1 AND owner_uid = $2
         AND ($3::text IS NULL OR project_id = $3)`,
      [runId, user.uid, expectedProjectId],
    );
    if (!ownedRun.rows[0]) return Response.json({ error: 'Run not found.' }, { status: 404 });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        let lastSequence = initialSequence;
        let closed = false;
        let polling = false;

        const send = (text: string) => {
          if (!closed) controller.enqueue(encoder.encode(text));
        };

        const poll = async () => {
          if (closed || polling) return;
          polling = true;
          try {
            const [events, state] = await Promise.all([
              queryLocalDatabase<EventRow>(
                `SELECT e.seq, e.type, e.actor, e.summary, e.payload, e.created_at
                 FROM bp_local_run_events e
                 JOIN bp_local_runs r ON r.id = e.run_id
                 WHERE e.run_id = $1 AND r.owner_uid = $2
                   AND ($4::text IS NULL OR r.project_id = $4) AND e.seq > $3
                 ORDER BY e.seq ASC
                 LIMIT 100`,
                [runId, user.uid, lastSequence, expectedProjectId],
              ),
              queryLocalDatabase<{
                status: string;
                last_event_seq: number | null;
                last_event_type: string | null;
              }>(
                `SELECT r.status,
                        (SELECT seq FROM bp_local_run_events WHERE run_id = r.id ORDER BY seq DESC LIMIT 1) AS last_event_seq,
                        (SELECT type FROM bp_local_run_events WHERE run_id = r.id ORDER BY seq DESC LIMIT 1) AS last_event_type
                 FROM bp_local_runs r
                 WHERE r.id = $1 AND r.owner_uid = $2
                   AND ($3::text IS NULL OR r.project_id = $3)`,
                [runId, user.uid, expectedProjectId],
              ),
            ]);
            for (const event of events.rows) {
              if (event.seq === null || !event.type || !event.actor || !event.summary || !event.created_at) continue;
              lastSequence = event.seq;
              send(`id: ${event.seq}\ndata: ${JSON.stringify({
                id: `${runId}:${event.seq}`,
                runId,
                seq: event.seq,
                timestamp: event.created_at.toISOString(),
                type: event.type,
                actor: event.actor,
                summary: event.summary,
                payload: event.payload,
              })}\n\n`);
            }
            const run = state.rows[0];
            const terminalEventByStatus: Record<string, string> = {
              completed: 'run.completed',
              failed: 'run.failed',
              cancelled: 'run.cancelled',
              timed_out: 'run.timed_out',
            };
            const terminalEvent = run ? terminalEventByStatus[run.status] : undefined;
            if (events.rows.length < 100
              && run?.last_event_seq !== null
              && run?.last_event_seq !== undefined
              && lastSequence >= run.last_event_seq
              && run.last_event_type === terminalEvent) {
              close();
            }
          } catch (error) {
            console.error('Local run event stream failed:', error);
            send(`event: error\ndata: ${JSON.stringify({ error: 'Run event stream failed.' })}\n\n`);
            close();
          } finally {
            polling = false;
          }
        };

        const timer = setInterval(() => {
          void poll();
          send(': keepalive\n\n');
        }, EVENT_POLL_INTERVAL_MS);

        const close = () => {
          if (closed) return;
          closed = true;
          clearInterval(timer);
          request.signal.removeEventListener('abort', close);
          try {
            controller.close();
          } catch {
            // The stream may already have been closed by the client.
          }
        };

        request.signal.addEventListener('abort', close, { once: true });
        send('retry: 1000\n\n');
        void poll();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open event stream.';
    const status = message.includes('disabled') || message.includes('loopback') ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
