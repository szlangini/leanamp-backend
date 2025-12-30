import { env } from '../../../config/env';

type GeminiOptions = {
  model: string;
  maxOutputTokens: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function extractText(payload: GeminiResponse): string | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? '').join('').trim();
  return text.length > 0 ? text : null;
}

async function callGemini(prompt: string, options: GeminiOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  const url = `${env.GEMINI_BASE_URL}/v1beta/models/${options.model}:generateContent?key=${env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens,
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error('GEMINI_REQUEST_FAILED');
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = extractText(payload);
    if (!text) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    return text;
  } catch {
    throw new Error('GEMINI_REQUEST_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGeminiText(prompt: string) {
  return callGemini(prompt, {
    model: env.GEMINI_MODEL_TEXT,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS_TEXT
  });
}

export async function callGeminiVision(prompt: string) {
  return callGemini(prompt, {
    model: env.GEMINI_MODEL_VISION,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS_VISION
  });
}
