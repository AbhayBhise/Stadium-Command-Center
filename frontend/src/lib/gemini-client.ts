/**
 * Client-side Gemini adapter for when backend is unavailable.
 * Uses direct API calls to Google Generative AI.
 */

export interface GeminiClientResponse {
  text: string;
  error?: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = (window as any).__NEXT_DATA__;
    if (data?.props?.pageProps?.NEXT_PUBLIC_GEMINI_API_KEY) {
      return data.props.pageProps.NEXT_PUBLIC_GEMINI_API_KEY;
    }
  } catch {}
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
}

export async function queryGeminiClient(
  prompt: string,
  systemPrompt?: string,
  userRole: string = 'SPECTATOR'
): Promise<GeminiClientResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { text: '', error: 'Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local' };
  }

  try {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `[SYSTEM] ${systemPrompt}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: `[Role: ${userRole}] ${prompt}` }] });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { text: '', error: `Gemini API error (${response.status}): ${errorBody}` };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      return { text: '', error: `Empty response (finishReason: ${finishReason || 'unknown'})` };
    }

    return { text };
  } catch (err) {
    return { text: '', error: `Client-side Gemini error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Format Gemini raw JSON response into display text.
 */
export function formatGeminiResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.recommendation || parsed.text || parsed.answer || raw;
  } catch {
    return raw;
  }
}
