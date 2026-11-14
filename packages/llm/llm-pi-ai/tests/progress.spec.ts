import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { BlockAssembler } from '@deepseek-ai/dsh-llm'
import LlmRuntime, { createUserMessage, type TurnProgress } from '@deepseek-ai/dsh-llm'
import * as LlmPiAi from '@deepseek-ai/dsh-llm-pi-ai'
import { createProgressFetch, parseVaultAiProgressLine } from '../src/progress.ts'

const servers: Server[] = []

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve) => {
    server.close(() => { resolve() })
  })))
})

describe('parseVaultAiProgressLine', () => {
  it('parses valid progress comment lines with LF or CRLF and clamps pct', () => {
    expect(parseVaultAiProgressLine(': vaultai-progress {"processed":500,"total":1000,"pct":50,"cache":false}\r')).toEqual({
      processed: 500,
      total: 1000,
      pct: 50,
      cache: false,
    })
    expect(parseVaultAiProgressLine(': vaultai-progress {"processed":1000,"total":1000,"pct":120.4,"cache":true}')).toEqual({
      processed: 1000,
      total: 1000,
      pct: 100,
      cache: true,
    })
  })

  it('ignores non-progress comments and malformed payloads', () => {
    expect(parseVaultAiProgressLine(': ping')).toBeUndefined()
    expect(parseVaultAiProgressLine('data: {"id":"1"}')).toBeUndefined()
    expect(parseVaultAiProgressLine(': vaultai-progress {bad json')).toBeUndefined()
    expect(parseVaultAiProgressLine(': vaultai-progress {"processed":-1,"total":10,"pct":0}')).toBeUndefined()
    expect(parseVaultAiProgressLine(': vaultai-progress {"processed":10,"total":null,"pct":50}')).toBeUndefined()
  })
})

describe('createProgressFetch', () => {
  it('taps SSE comment lines split across chunks without altering downstream bytes', async () => {
    const encoder = new TextEncoder()
    const payload = [
      ': ping\r\n',
      ': vaultai-progress {"processed":256,"total":1024,"pct":25,"cache":false}\n',
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
      ': vaultai-progress {"processed":1024,"total":1024,"pct":100,"cache":true}\r\n',
      'data: [DONE]\n\n',
    ].join('')
    const bytes = encoder.encode(payload)
    const parts = [bytes.subarray(0, 19), bytes.subarray(19, 63), bytes.subarray(63, 120), bytes.subarray(120)]

    const baseFetch: typeof globalThis.fetch = async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of parts) controller.enqueue(part)
        controller.close()
      },
    }), {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    })

    const updates: TurnProgress[] = []
    let heartbeats = 0
    const wrapped = createProgressFetch(
      progress => updates.push(progress),
      () => { heartbeats += 1 },
      baseFetch,
    )

    const response = await wrapped('http://localhost/v1/chat/completions')
    const text = await response.text()
    expect(text).toBe(payload)
    expect(heartbeats).toBe(3)
    expect(updates).toEqual([
      { processed: 256, total: 1024, pct: 25, cache: false },
      { processed: 1024, total: 1024, pct: 100, cache: true },
    ])
  })

  it('passes non-SSE responses straight through untouched', async () => {
    const baseFetch: typeof globalThis.fetch = async () => new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    const onProgress = vi.fn()
    const onHeartbeat = vi.fn()
    const wrapped = createProgressFetch(onProgress, onHeartbeat, baseFetch)
    const response = await wrapped('http://localhost/v1/models')
    expect(await response.text()).toBe('{"ok":true}')
    expect(onProgress).not.toHaveBeenCalled()
    expect(onHeartbeat).not.toHaveBeenCalled()
  })
})

describe('PiAiAdapter SSE prefill progress integration', () => {
  it('forwards : vaultai-progress comments through LlmRuntime.stream before data chunks', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
      })
      res.write(': vaultai-progress {"processed":4096,"total":8192,"pct":50,"cache":false}\n')
      res.write(': vaultai-progress {"processed":8192,"total":8192,"pct":100,"cache":true}\n')
      res.write('data: {"id":"cmpl-1","object":"chat.completion.chunk","created":1,"model":"Qwen3.8-27B-Gufo","choices":[{"index":0,"delta":{"role":"assistant","content":"ready"},"finish_reason":null}]}\n\n')
      res.write('data: {"id":"cmpl-1","object":"chat.completion.chunk","created":1,"model":"Qwen3.8-27B-Gufo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":8192,"completion_tokens":1,"total_tokens":8193}}\n\n')
      res.write('data: [DONE]\n\n')
      res.end()
    })
    servers.push(server)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => { resolve() })
    })
    const port = (server.address() as AddressInfo).port

    vi.stubEnv('PI_TEST_KEY', 'test-key')
    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(LlmPiAi, {
      providers: {
        vaultai: {
          apiKeyEnv: 'PI_TEST_KEY',
          baseURL: `http://127.0.0.1:${port}`,
          api: 'openai-completions',
          models: [
            {
              id: 'Qwen3.8-27B-Gufo',
              reasoningEfforts: { low: 'low' },
              input: ['text'],
              contextWindow: 131072,
              maxTokens: 16384,
            },
          ],
        },
      },
    })

    const progressEvents: TurnProgress[] = []
    const stream = ctx.llm.stream({
      provider: 'vaultai',
      model: 'Qwen3.8-27B-Gufo',
      messages: [createUserMessage({
        content: [{ type: 'text', text: 'hi' }],
        source: { kind: 'plugin', plugin: 'test' },
      })],
      onProgress: progress => progressEvents.push(progress),
    })

    const assembler = new BlockAssembler()
    for await (const chunk of stream) {
      assembler.push(chunk)
    }
    const message = assembler.message({
      kind: 'model',
      provider: 'vaultai',
      model: 'Qwen3.8-27B-Gufo',
    })

    expect(message.content).toEqual([{ type: 'text', text: 'ready' }])
    expect(assembler.finish).toEqual({ kind: 'stop' })
    expect(progressEvents).toEqual([
      { processed: 4096, total: 8192, pct: 50, cache: false },
      { processed: 8192, total: 8192, pct: 100, cache: true },
    ])
  })
})
