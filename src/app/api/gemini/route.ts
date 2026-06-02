import type { NextRequest } from 'next/server';

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || '';
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, temperature, jsonMode, systemInstruction, file, apiKey } = body;

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const key = (apiKey && apiKey.trim()) ? apiKey.trim() : DEFAULT_API_KEY;
    if (!key) {
      return Response.json({ error: 'Gemini API Key is not configured on the server. Please check your environment variables.' }, { status: 500 });
    }
    let lastError: any = null;

    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const parts: any[] = [];
      if (file) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      }
      parts.push({ text: prompt });

      const payload: any = {
        contents: [{ parts }],
        generationConfig: { temperature: temperature ?? 0.3 },
      };

      if (systemInstruction) {
        payload.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      if (jsonMode) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
          if (response.status === 429 || response.status === 503 || response.status === 404 || errorMsg.includes('high demand') || errorMsg.includes('limit')) {
            lastError = new Error(errorMsg);
            continue;
          }
          return Response.json({ error: errorMsg }, { status: response.status });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          lastError = new Error('No response text from Gemini');
          continue;
        }

        return Response.json({ text });
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    return Response.json(
      { error: lastError?.message || 'All Gemini models failed. Please try again.' },
      { status: 503 }
    );
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
