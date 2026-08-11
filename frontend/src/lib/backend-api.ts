function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const PRODUCTION_BACKEND_FALLBACK = 'https://stadium-command-center.onrender.com';

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
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const frontendPort = window.location.port;
      const backendPort = frontendPort === '3000' ? '4000' : '3000';
      return `${protocol}//${host}:${backendPort}`;
    }
  }

  return PRODUCTION_BACKEND_FALLBACK;
}

export function buildBackendUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}

function getCandidateBaseUrls(): string[] {
  const configured = getConfiguredBaseUrl();
  if (configured) return [configured];

  if (typeof window === 'undefined') {
    return [PRODUCTION_BACKEND_FALLBACK, 'http://localhost:4000', 'http://localhost:3000'];
  }

  const host = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const frontendPort = window.location.port || '80';
  
  // Predict backend port based on frontend port (e.g. if frontend is 3000, backend is likely 4000 or 3001)
  const primaryPort = frontendPort === '3000' ? '4000' : '3000';
  
  const candidates = [
    `${protocol}//${host}:${primaryPort}`,
    `${protocol}//${host}:4000`,
    `${protocol}//${host}:3000`,
    `${protocol}//${host}:3001`,
    PRODUCTION_BACKEND_FALLBACK
  ];
  
  return Array.from(new Set(candidates));
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
