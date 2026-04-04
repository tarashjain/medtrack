import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const prompt = `You are a medical document parser. Analyze this prescription or medical document image and extract the following information. Return ONLY a valid JSON object with no markdown, no explanation, no backticks.

Extract these fields:
- doctorName: Full name of the doctor (include "Dr." prefix if visible). Empty string if not found.
- hospital: Name of the hospital, clinic, or medical facility. Empty string if not found.
- visitDate: Date of the visit in YYYY-MM-DD format. Use today's date if not clearly visible.
- reason: Main reason for visit or primary diagnosis (keep it short, under 10 words). Empty string if not found.
- notes: Key medical notes — medications prescribed, dosage, instructions, follow-up advice. Empty string if not found.

Return exactly this JSON shape:
{"doctorName":"","hospital":"","visitDate":"","reason":"","notes":""}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Gemini API error:', response.status, responseText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}`, detail: responseText },
        { status: 502 }
      );
    }

    const result = JSON.parse(responseText);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('Gemini returned empty response:', JSON.stringify(result));
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 });
    }

    // Strip any markdown fences just in case
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('Failed to parse Gemini JSON:', clean);
      return NextResponse.json({ error: 'AI response was not valid JSON', raw: clean }, { status: 502 });
    }

    return NextResponse.json({ parsed });
  } catch (err) {
    console.error('Parse prescription unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}