import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnoseFinding } from './groq-diagnosis';

test('reports bounded, redacted Groq details for an HTTP 400 response', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  const previousFetch = globalThis.fetch;
  const previousConsoleError = console.error;
  const loggedErrors: string[] = [];
  let requestedModel: string | undefined;
  let requestCount = 0;

  process.env.GROQ_API_KEY = 'test-only-key';
  delete process.env.GROQ_MODEL;
  globalThis.fetch = async (_input, init) => {
    requestCount += 1;
    if (typeof init?.body === 'string') {
      requestedModel = (JSON.parse(init.body) as { model?: string }).model;
    }
    return new Response(JSON.stringify({
      error: {
        message: 'Invalid request option; Bearer synthetic-secret-value',
      },
    }), { status: 400 });
  };
  console.error = (...values: unknown[]) => loggedErrors.push(values.join(' '));

  try {
    await assert.rejects(
      diagnoseFinding({
        category: 'network',
        severity: 'high',
        title: 'Request failed',
        observed: 'HTTP 404',
        sourceUrl: 'https://example.test/missing',
        runGoal: 'Load the test page',
        sourceEventSeq: 12,
        nearbyEvents: [],
      }),
      (error: unknown) => error instanceof Error
        && error.message.includes('HTTP 400')
        && error.message.includes('Invalid request option')
        && !error.message.includes('synthetic-secret-value'),
    );

    assert.equal(requestedModel, 'openai/gpt-oss-120b');
    assert.equal(requestCount, 1);
    assert.equal(loggedErrors.length, 1);
    assert.match(loggedErrors[0], /HTTP 400/);
    assert.doesNotMatch(loggedErrors[0], /synthetic-secret-value/);
  } finally {
    globalThis.fetch = previousFetch;
    console.error = previousConsoleError;
    if (previousApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});

test('retries JSON validation failures once with a larger bounded token budget', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  const previousMaxTokens = process.env.LLM_MAX_TOKENS;
  const previousFetch = globalThis.fetch;
  const previousConsoleWarn = console.warn;
  const previousConsoleError = console.error;
  const requestedBudgets: number[] = [];
  let warningCount = 0;

  process.env.GROQ_API_KEY = 'test-only-key';
  process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  process.env.LLM_MAX_TOKENS = '400';
  globalThis.fetch = async (_input, init) => {
    if (typeof init?.body === 'string') {
      requestedBudgets.push((JSON.parse(init.body) as { max_completion_tokens: number }).max_completion_tokens);
    }
    if (requestedBudgets.length === 1) {
      return new Response(JSON.stringify({
        error: { message: 'Failed to validate JSON. Please adjust your prompt.' },
      }), { status: 400 });
    }
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'The synthetic request returned an HTTP error.',
            hypotheses: [],
            nextChecks: [],
            limitations: [],
          }),
        },
      }],
    }), { status: 200 });
  };
  console.warn = () => { warningCount += 1; };
  console.error = () => {};

  try {
    const result = await diagnoseFinding({
      category: 'network',
      severity: 'high',
      title: 'Synthetic HTTP 404',
      observed: 'Synthetic GET /missing returned HTTP 404.',
      sourceUrl: 'https://example.test/missing',
      runGoal: 'Load the synthetic test page.',
      sourceEventSeq: 7,
      nearbyEvents: [],
    });

    assert.deepEqual(requestedBudgets, [400, 1024]);
    assert.equal(warningCount, 1);
    assert.equal(result.model, 'openai/gpt-oss-120b');
    assert.match(result.diagnosis.summary, /synthetic request/);
  } finally {
    globalThis.fetch = previousFetch;
    console.warn = previousConsoleWarn;
    console.error = previousConsoleError;
    if (previousApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
    if (previousMaxTokens === undefined) delete process.env.LLM_MAX_TOKENS;
    else process.env.LLM_MAX_TOKENS = previousMaxTokens;
  }
});

test('constrains model evidence references to the exact supplied event IDs', async () => {
  const previousApiKey = process.env.GROQ_API_KEY;
  const previousFetch = globalThis.fetch;
  let allowedReferences: string[] | undefined;

  process.env.GROQ_API_KEY = 'test-only-key';
  globalThis.fetch = async (_input, init) => {
    if (typeof init?.body === 'string') {
      const request = JSON.parse(init.body) as {
        response_format: {
          json_schema: {
            schema: {
              properties: {
                hypotheses: {
                  items: {
                    properties: {
                      evidenceRefs: { items: { enum?: string[] } };
                    };
                  };
                };
              };
            };
          };
        };
      };
      allowedReferences = request.response_format.json_schema.schema.properties
        .hypotheses.items.properties.evidenceRefs.items.enum;
    }

    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'The synthetic request returned an HTTP error.',
            hypotheses: [{
              claim: 'The endpoint may be unavailable.',
              confidence: 0.6,
              evidenceRefs: ['finding', 'run_event:7', 'run_event:5'],
            }],
            nextChecks: [],
            limitations: [],
          }),
        },
      }],
    }), { status: 200 });
  };

  try {
    await assert.rejects(
      diagnoseFinding({
        category: 'network',
        severity: 'high',
        title: 'Synthetic HTTP 404',
        observed: 'Synthetic GET /missing returned HTTP 404.',
        sourceUrl: 'https://example.test/missing',
        runGoal: 'Load the synthetic test page.',
        sourceEventSeq: 7,
        nearbyEvents: [{ seq: 6, type: 'browser.action', summary: 'Loaded the page.' }],
      }),
      /unknown evidence/,
    );
    assert.deepEqual(allowedReferences, ['finding', 'run_event:7', 'run_event:6']);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousApiKey;
  }
});
