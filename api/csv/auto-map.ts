import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Types for the request and response
interface AutoMapRequest {
  headers: string[];
  sampleRows: any[];
}

interface ColumnMapping {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  service_date: string | null;
  tags: string | null;
  notes: string | null;
  status: string | null;
}

interface AutoMapResponse {
  mapping: ColumnMapping;
  usedAI: boolean;
  confidence: 'ai' | 'heuristic';
}

// Header synonyms for heuristic mapping
const HEADER_SYNONYMS = {
  full_name: ['name', 'fullname', 'full_name', 'customer', 'customername', 'client', 'contact', 'first last', 'firstandlast'],
  email: ['email', 'e-mail', 'mail', 'emailaddress', 'email_address'],
  phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'tel', 'telephone', 'contactnumber', 'contact_number'],
  service_date: ['service_date', 'servicedate', 'date', 'appointment', 'appt', 'appt_date', 'jobdate', 'workdate'],
  tags: ['tags', 'labels', 'categories', 'groups'],
  notes: ['notes', 'note', 'comments', 'comment', 'details', 'memo', 'description'],
  status: ['status', 'state', 'lifecycle']
};

// Value detection patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\d{10,15}$/,
  date: /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{1,2}-\d{1,2}-\d{4}$/,
  status: /^(active|inactive|archived|do-not-contact)$/i
};

// Redact PII from sample rows
function redactPII(sampleRows: any[]): any[] {
  return sampleRows.map(row => {
    const redacted = { ...row };
    Object.keys(redacted).forEach(key => {
      const value = String(redacted[key] || '');
      if (PATTERNS.email.test(value)) {
        redacted[key] = 'email@example.com';
      } else if (PATTERNS.phone.test(value.replace(/\D/g, ''))) {
        redacted[key] = '555-123-4567';
      }
    });
    return redacted;
  });
}

// Heuristic column mapping
function getHeuristicMapping(headers: string[], sampleRows: any[]): ColumnMapping {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[\s\-]/g, '_'));
  
  const mapping: ColumnMapping = {
    full_name: null,
    email: null,
    phone: null,
    service_date: null,
    tags: null,
    notes: null,
    status: null
  };

  // Find best matches for each field
  Object.entries(HEADER_SYNONYMS).forEach(([field, synonyms]) => {
    let bestMatch: string | null = null;
    let bestScore = 0;

    headers.forEach((header, index) => {
      const normalizedHeader = normalizedHeaders[index];
      let score = 0;

      // Exact match
      if (synonyms.includes(normalizedHeader)) {
        score = 100;
      } else {
        // Partial match
        synonyms.forEach(synonym => {
          if (normalizedHeader.includes(synonym) || synonym.includes(normalizedHeader)) {
            score = Math.max(score, 50);
          }
        });
      }

      // Value pattern matching
      if (sampleRows.length > 0) {
        const values = sampleRows.map(row => row[header]).filter(Boolean);
        if (values.length > 0) {
          switch (field) {
            case 'email':
              if (values.some(v => PATTERNS.email.test(String(v)))) score += 30;
              break;
            case 'phone':
              if (values.some(v => PATTERNS.phone.test(String(v).replace(/\D/g, '')))) score += 30;
              break;
            case 'service_date':
              if (values.some(v => PATTERNS.date.test(String(v)))) score += 30;
              break;
            case 'status':
              if (values.some(v => PATTERNS.status.test(String(v)))) score += 30;
              break;
            case 'tags':
              if (values.some(v => String(v).includes(','))) score += 20;
              break;
            case 'notes':
              if (values.some(v => String(v).length > 50)) score += 20;
              break;
            case 'full_name':
              if (values.some(v => String(v).includes(' ') && String(v).length > 5)) score += 20;
              break;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = header;
      }
    });

    if (bestScore >= 30) { // Only assign if confident enough
      mapping[field as keyof ColumnMapping] = bestMatch;
    }
  });

  return mapping;
}

// AI-powered column mapping
async function getAIMapping(headers: string[], sampleRows: any[]): Promise<ColumnMapping | null> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are a CSV column mapping expert. Given these CSV headers and sample rows, map them to customer fields.

Headers: ${headers.join(', ')}

Sample rows (first 3):
${sampleRows.slice(0, 3).map(row => JSON.stringify(row)).join('\n')}

Map the columns to these customer fields:
- full_name: Customer's full name (required)
- email: Email address
- phone: Phone number
- service_date: Date of service/appointment
- tags: Comma-separated tags or categories
- notes: Additional notes or comments
- status: Customer status (active, inactive, archived)

Return ONLY a JSON object with the mapping, like:
{
  "full_name": "header_name",
  "email": "header_name",
  "phone": "header_name",
  "service_date": "header_name",
  "tags": "header_name",
  "notes": "header_name",
  "status": "header_name"
}

Use null for fields that don't have a clear match. Be smart about synonyms and common variations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return null;

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const mapping = JSON.parse(jsonMatch[0]);
    
    // Validate the mapping
    const requiredFields = ['full_name', 'email', 'phone', 'service_date', 'tags', 'notes', 'status'];
    const validatedMapping: ColumnMapping = {
      full_name: null,
      email: null,
      phone: null,
      service_date: null,
      tags: null,
      notes: null,
      status: null
    };

    requiredFields.forEach(field => {
      if (mapping[field] && headers.includes(mapping[field])) {
        validatedMapping[field as keyof ColumnMapping] = mapping[field];
      }
    });

    return validatedMapping;
  } catch (error) {
    console.error('AI mapping error:', error);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Only allow POST
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body: AutoMapRequest = await request.json();
    
    // Validate request
    if (!body.headers || !Array.isArray(body.headers) || !body.sampleRows || !Array.isArray(body.sampleRows)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (body.headers.length === 0) {
      return NextResponse.json({ error: 'Headers array cannot be empty' }, { status: 400 });
    }

    // Limit sample rows to 5 for security
    const limitedSampleRows = body.sampleRows.slice(0, 5);
    
    // Redact PII from sample rows
    const redactedSampleRows = redactPII(limitedSampleRows);

    // Always get heuristic mapping as fallback
    const heuristicMapping = getHeuristicMapping(body.headers, redactedSampleRows);

    // Try AI mapping if API key is available
    let aiMapping: ColumnMapping | null = null;
    let usedAI = false;

    if (process.env.OPENAI_API_KEY) {
      try {
        aiMapping = await getAIMapping(body.headers, redactedSampleRows);
        usedAI = true;
      } catch (error) {
        console.error('AI mapping failed, using heuristic fallback:', error);
      }
    }

    // Merge mappings: AI takes precedence, heuristic fills gaps
    const finalMapping: ColumnMapping = { ...heuristicMapping };
    
    if (aiMapping) {
      Object.entries(aiMapping).forEach(([field, value]) => {
        if (value && body.headers.includes(value)) {
          finalMapping[field as keyof ColumnMapping] = value;
        }
      });
    }

    const response: AutoMapResponse = {
      mapping: finalMapping,
      usedAI,
      confidence: usedAI && aiMapping ? 'ai' : 'heuristic'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Auto-map endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
