import type { TurnProgress } from '@deepseek-ai/dsh-llm'

const PROGRESS_PREFIX = ': vaultai-progress '

/**
 * Parse a `: vaultai-progress {...}` SSE comment line emitted by VaultLM-Dashboard.
 * @param line - Raw SSE line (with optional trailing `\r`).
 * @returns Parsed prompt-processing progress, or `undefined` for non-progress or malformed lines.
 */
export function parseVaultAiProgressLine(line: string): TurnProgress | undefined {
  const trimmed = line.endsWith('\r') ? line.slice(0, -1) : line
  if (!trimmed.startsWith(PROGRESS_PREFIX)) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed.slice(PROGRESS_PREFIX.length))
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as Record<string, unknown>
  const { processed, total, pct, cache } = record
  if (
    typeof processed !== 'number'
    || typeof total !== 'number'
    || typeof pct !== 'number'
    || !Number.isFinite(processed)
    || !Number.isFinite(total)
    || !Number.isFinite(pct)
    || processed < 0
    || total < 0
  ) {
    return undefined
  }
  const clampedPct = Math.max(0, Math.min(100, Math.round(pct)))
  return {
    processed,
    total,
    pct: clampedPct,
    cache: Boolean(cache),
  }
}

/**
 * Wrap `fetch` to tap `text/event-stream` responses for SSE comments
 * (`: ping`, `: vaultai-progress {...}`) without altering downstream bytes.
 * @param onProgress - Optional callback invoked for each parsed `: vaultai-progress` comment.
 * @param onHeartbeat - Optional callback invoked for any SSE comment heartbeat line starting with `:`.
 * @param baseFetch - Underlying `fetch` implementation to wrap.
 * @returns A wrapped `fetch` function passing all non-SSE and SSE bytes through unchanged.
 */
export function createProgressFetch(
  onProgress?: (progress: TurnProgress) => void,
  onHeartbeat?: () => void,
  baseFetch: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch {
  if (onProgress === undefined && onHeartbeat === undefined) return baseFetch
  return async (input, init) => {
    const response = await baseFetch(input, init)
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!response.body || !contentType.includes('text/event-stream')) {
      return response
    }
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    const inspectLine = (rawLine: string): void => {
      if (!rawLine.startsWith(':')) return
      try {
        onHeartbeat?.()
      } catch {
        // Ignore listener errors so SSE streaming continues unimpeded.
      }
      if (onProgress === undefined) return
      const progress = parseVaultAiProgressLine(rawLine)
      if (progress !== undefined) {
        try {
          onProgress(progress)
        } catch {
          // Ignore progress consumer errors so SSE streaming continues unimpeded.
        }
      }
    }
    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        buffer += decoder.decode(chunk, { stream: true })
        let newlineIdx = buffer.indexOf('\n')
        while (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx)
          buffer = buffer.slice(newlineIdx + 1)
          inspectLine(line)
          newlineIdx = buffer.indexOf('\n')
        }
      },
      flush() {
        buffer += decoder.decode()
        if (buffer.length > 0) {
          inspectLine(buffer)
          buffer = ''
        }
      },
    })
    return new Response(response.body.pipeThrough(transform), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
