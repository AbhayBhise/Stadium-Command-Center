function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getConfiguredBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configured && configured.trim().length > 0) {
    return stripTrailingSlash(configured.trim());
  }
  return null;
}

export function getBackendBaseUrl(): string {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const frontendPort = window.location.port;
    const backendPort = frontendPort === '3000' ? '4000' : '3000';
    return `${protocol}//${window.location.hostname}:${backendPort}`;
  }

  return 'http://localhost:4000';
}

export function buildBackendUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}

function getCandidateBaseUrls(): string[] {
  const configured = getConfiguredBaseUrl();
  if (configured) return [configured];

  if (typeof window === 'undefined') {
    return ['http://localhost:4000', 'http://localhost:3000'];
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.hostname;
  const frontendPort = window.location.port;
  const primaryPort = frontendPort === '3000' ? '4000' : '3000';
  const candidates = [primaryPort, '4000', '3000', '3001'];
  return Array.from(new Set(candidates)).map((port) => `${protocol}//${host}:${port}`);
}

export async function fetchBackend(pathname: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const candidates = getCandidateBaseUrls();

  let lastError: unknown = null;
  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, init);
      if (response.status === 404 || response.status === 405) {
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to reach backend API');
}
