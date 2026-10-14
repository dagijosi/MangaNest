export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export async function fetchText(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
    referer?: string;
    timeoutMs?: number;
  }
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/json,*/*',
      ...options?.headers,
    };
    if (options?.referer) {
      headers.Referer = options.referer;
    }

    const res = await fetch(url, {
      method: options?.method ?? 'GET',
      headers,
      body: options?.body,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http')) return trimmed;
  return `https://${trimmed}`;
}

export function absolutizeUrl(baseUrl: string, href: string): string {
  if (!href) return baseUrl;
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  const base = normalizeBaseUrl(baseUrl);
  return href.startsWith('/') ? `${base}${href}` : `${base}/${href}`;
}
