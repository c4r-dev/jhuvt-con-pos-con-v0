import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache implementation
// This is an in-memory cache that will be reset if the server restarts
const CACHE = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Function to generate a cache key from comments and flowId
function generateCacheKey(comments, flowId) {
  // Sort comments by ID to ensure consistent key generation
  const sortedComments = [...comments].sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  
  // Create a string representation of the request
  const keyData = {
    flowId,
    comments: sortedComments.map(c => ({
      id: c.id,
      text: c.text,
      commentType: c.commentType,
      nodeLabels: c.nodeLabels
    }))
  };
  
  // Return a stringified version as the cache key
  return JSON.stringify(keyData);
}

// Function to check if a cached entry is still valid (not expired)
function isCacheValid(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) return false;
  
  const now = Date.now();
  const age = now - cacheEntry.timestamp;
  
  return age < CACHE_TTL;
}

export async function POST(request) {
  try {
    const { comments, flowId } = await request.json();

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { error: 'Valid comments array is required' },
        { status: 400 }
      );
    }
    
    // Generate a cache key for this request
    const cacheKey = generateCacheKey(comments, flowId);
    
    // Check if we have a valid cached response
    if (CACHE[cacheKey] && isCacheValid(CACHE[cacheKey])) {
      console.log('Using cached OpenAI response for flowId:', flowId);
      return NextResponse.json(CACHE[cacheKey].data);
    }
    
    // Not in cache or expired, so proceed with API call
    console.log('Calling OpenAI API for flowId:', flowId);
    
    // Construct the prompt for OpenAI with simplified data
    const prompt = `
You are a research analysis assistant helping to categorize concerns about research studies.

TASK:
Analyze the following list of concerns from a research study and group them into thematic categories.

REQUIREMENTS:
1. Group similar concerns based on common themes found in the *text* of the concerns. DO NOT group concerns by their existing \`commentType\` (e.g., BIAS, CONFOUND). The themes should reflect the content and meaning of the concerns themselves.
2. IMPORTANT: AVOID creating themes that simply mirror the existing concern types. For example, do not create themes called "BIAS CONCERNS", "CONFOUNDING FACTORS", "METHODOLOGICAL ISSUES" that simply group all bias-related, confound-related, or methodology-related concerns together.
3. Look for specific research issues, problems, variables, or methodological aspects mentioned in the concern texts themselves, and create themes around those specific issues.
4. Adjust the number of thematic groups based on the input:
   - If there are 3-9 concerns, aim for 3-5 distinct themes.
   - If there are 10-20 concerns, aim for 5-8 distinct themes.
   - If there are more than 20 concerns, aim for 8-15 themes.
   The goal is to find a good balance, avoiding too few themes (overly broad) or too many (overly granular).
5. Assign each group a concise 1-2 word name that is specific and descriptive of the actual issue identified (e.g., "DATA INTEGRITY", "SAMPLE SELECTION", "CONTROL VARIABLES").
6. Strive for a relatively balanced distribution of concerns across the identified themes. Avoid creating a single theme that contains a vast majority of the concerns.
7. DO NOT modify the original content of any concern.
8. Include EVERY concern in a group - do not exclude any.
9. If there are fewer than 3 concerns, still organize them into appropriate themes based on their specific content.

CONCERN DATA FORMAT:
Each concern has these attributes:
- id: Unique identifier
- nodeLabels: Names of the study phases/processes
- commentType: Category of concern (e.g., BIAS, CONFOUND, etc.)
- text: The actual concern text

INPUT CONCERNS:
${JSON.stringify(comments, null, 2)}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "themes": [
    {
      "name": "THEME_NAME",
      "concerns": [ARRAY_OF_ORIGINAL_CONCERN_OBJECTS]
    },
    ...more themes...
  ]
}

Ensure your response is valid JSON that can be parsed directly.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a research analysis assistant that categorizes concerns about research studies.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4, // Low temperature for more consistent responses
      response_format: { type: 'json_object' }, // Ensure JSON format
    });

    // Parse the response content
    const content = response.choices[0].message.content;
    const parsedContent = JSON.parse(content);
    
    // Store in cache
    CACHE[cacheKey] = {
      data: parsedContent,
      timestamp: Date.now()
    };
    
    // Return the categorized concerns
    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error('Error processing concerns with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to process concerns', details: error.message },
      { status: 500 }
    );
  }
}

// Cleanup function to periodically remove expired cache entries
// This runs on a set interval to prevent memory leaks
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

function cleanupCache() {
  const now = Date.now();
  
  Object.keys(CACHE).forEach(key => {
    const entry = CACHE[key];
    if (now - entry.timestamp > CACHE_TTL) {
      // Cache entry has expired, remove it
      delete CACHE[key];
    }
  });
}

// Set up periodic cache cleanup
// This runs in the server context
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);
}
