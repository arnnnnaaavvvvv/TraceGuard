import { NetworkError, TimeoutError, ConfigError } from '../types/errors.js';
import type { HttpMethod } from '../types/core.js';

export interface HttpResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly contentType?: string;
  readonly bodyText: string;
  readonly bodyJson?: unknown;
  readonly isJson: boolean;
  readonly malformedJson: boolean;
}

export interface HttpClientOptions {
  readonly timeoutMs: number;
  readonly maxBodySizeBytes: number;
}

export async function executeRequest(
  url: string,
  method: HttpMethod,
  headers: Record<string, string>,
  options: HttpClientOptions
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const rawRes = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      redirect: 'manual',
    });

    const responseHeaders: Record<string, string> = {};
    rawRes.headers.forEach((val, key) => {
      responseHeaders[key.toLowerCase()] = val;
    });

    const contentType = responseHeaders['content-type'];
    const bodyText = await readBodyWithLimit(rawRes, options.maxBodySizeBytes, url, controller.signal);

    const isJsonHeader = !!contentType && contentType.toLowerCase().includes('application/json');
    let bodyJson: unknown = undefined;
    let malformedJson = false;

    if (bodyText.length > 0) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        if (isJsonHeader) {
          malformedJson = true;
        }
      }
    }

    return {
      status: rawRes.status,
      statusText: rawRes.statusText,
      headers: responseHeaders,
      contentType,
      bodyText,
      bodyJson,
      isJson: isJsonHeader && !malformedJson,
      malformedJson,
    };
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    if (controller.signal.aborted || (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted')))) {
      throw new TimeoutError(url, options.timeoutMs);
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new NetworkError(msg, url);
  } finally {
    clearTimeout(timer);
  }
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
  url: string,
  signal?: AbortSignal
): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new Error('This operation was aborted');
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new ConfigError(
            `Response from '${url}' exceeded maximum size limit of ${maxBytes} bytes (${(totalBytes / 1024).toFixed(1)}KB received).`,
            'Increase maxBodySizeBytes in config if this endpoint legitimately produces large payloads.'
          );
        }
        chunks.push(value);
      }
    }
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    if (signal?.aborted || (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted')))) {
      throw err;
    }
    throw new NetworkError(`Failed to read response body: ${err instanceof Error ? err.message : String(err)}`, url);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(combined);
}
