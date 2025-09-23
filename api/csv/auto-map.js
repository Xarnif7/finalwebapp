import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { headers, sampleRows } = req.body;
    
    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Headers array is required' });
    }

    console.log('[CSV_AUTO_MAP] Processing headers:', headers);
    console.log('[CSV_AUTO_MAP] Sample rows:', sampleRows?.length || 0);

    // AI-powered column mapping
    let mapping = {};
    let usedAI = false;

    try {
      if (process.env.OPENAI_API_KEY && sampleRows && sampleRows.length > 0) {
        // Create prompt for AI mapping
        const prompt = `Analyze these CSV headers and sample data to map them to customer fields:

Headers: ${headers.join(', ')}
Sample data: ${JSON.stringify(sampleRows.slice(0, 3))}

Map these headers to customer fields:
- full_name: Customer's full name
- email: Email address
- phone: Phone number
- service_date: Service/appointment date
- tags: Tags or categories
- notes: Notes or comments
- status: Customer status

Respond with JSON only:
{
  "mapping": {
    "full_name": "header_name_or_null",
    "email": "header_name_or_null", 
    "phone": "header_name_or_null",
    "service_date": "header_name_or_null",
    "tags": "header_name_or_null",
    "notes": "header_name_or_null",
    "status": "header_name_or_null"
  },
  "confidence": 0.85,
  "reasoning": "Brief explanation of mapping decisions"
}`;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at analyzing CSV data and mapping columns to database fields. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (openaiResponse.ok) {
          const aiData = await openaiResponse.json();
          const aiResponse = JSON.parse(aiData.choices[0]?.message?.content || '{}');
          
          if (aiResponse.mapping) {
            mapping = aiResponse.mapping;
            usedAI = true;
            console.log('[CSV_AUTO_MAP] AI mapping successful:', mapping);
          }
        }
      }
    } catch (aiError) {
      console.log('[CSV_AUTO_MAP] AI mapping failed, using heuristic mapping:', aiError.message);
    }

    // Fallback to heuristic mapping if AI failed or wasn't available
    if (!usedAI) {
      mapping = getHeuristicMapping(headers);
      console.log('[CSV_AUTO_MAP] Using heuristic mapping:', mapping);
    }

    // Validate and clean mapping
    const cleanedMapping = {};
    Object.entries(mapping).forEach(([field, header]) => {
      if (header && headers.includes(header)) {
        cleanedMapping[field] = header;
      }
    });

    console.log('[CSV_AUTO_MAP] Final mapping:', cleanedMapping);

    res.status(200).json({
      success: true,
      mapping: cleanedMapping,
      usedAI: usedAI,
      confidence: usedAI ? 0.85 : 0.7,
      availableFields: ['full_name', 'email', 'phone', 'service_date', 'tags', 'notes', 'status']
    });

  } catch (error) {
    console.error('[CSV_AUTO_MAP] Error:', error);
    
    // Fallback to basic heuristic mapping
    const fallbackMapping = getHeuristicMapping(req.body.headers || []);
    
    res.status(200).json({
      success: true,
      mapping: fallbackMapping,
      usedAI: false,
      confidence: 0.6,
      error: 'Using fallback mapping due to processing error',
      availableFields: ['full_name', 'email', 'phone', 'service_date', 'tags', 'notes', 'status']
    });
  }
}

// Heuristic mapping function
function getHeuristicMapping(headers) {
  const mapping = {};
  
  // Common patterns for each field
  const patterns = {
    full_name: ['name', 'full_name', 'fullname', 'customer_name', 'client_name', 'contact_name'],
    email: ['email', 'email_address', 'e_mail', 'mail'],
    phone: ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'contact_number'],
    service_date: ['service_date', 'appointment_date', 'date', 'service_done', 'completed_date', 'job_date'],
    tags: ['tags', 'category', 'type', 'segment', 'classification'],
    notes: ['notes', 'comments', 'description', 'remarks', 'details'],
    status: ['status', 'state', 'active', 'customer_status']
  };

  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
    
    Object.entries(patterns).forEach(([field, patterns]) => {
      if (!mapping[field] && patterns.some(pattern => 
        lowerHeader.includes(pattern) || pattern.includes(lowerHeader)
      )) {
        mapping[field] = header;
      }
    });
  });

  return mapping;
}
