import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { flowData, userInstruction } = await request.json();

    if (!flowData || !userInstruction) {
      return NextResponse.json(
        { error: 'Flow data and user instruction are required' },
        { status: 400 }
      );
    }

    // Build the prompt for OpenAI
    const prompt = `
You are an expert flowchart designer assistant. Your task is to modify a flowchart based on user instructions.

CURRENT FLOWCHART DATA:
${JSON.stringify(flowData, null, 2)}

USER'S INSTRUCTION:
${userInstruction}

FLOWCHART JSON STRUCTURE DETAILS:
This flowchart system uses a JSON structure with the following components:

1. Nodes - Each node can have:
   - Custom labels, text boxes, toggles, dropdowns, and input fields
   - Connection handles on different sides (input/output on top/bottom/left/right)
   - Custom styling (background color, text color)
   - State information (default, active, double-active, important)

2. Node data structure:
   "data": {
     "elements": {
       "label": { "visible": true, "text": "Node Label" },
       "textBoxes": [{ "visible": true, "text": "Text content" }],
       "toggles": [{ "visible": true, "text": "Toggle Label", "value": true/false }],
       "dropdowns": [{ 
         "visible": true, 
         "label": "Dropdown Label", 
         "options": ["Option 1", "Option 2"], 
         "selected": "Option 1" 
       }],
       "inputFields": [{ "visible": true, "placeholder": "Placeholder text", "value": "" }]
     },
     "hasInputHandle": true/false,
     "hasOutputHandle": true/false,
     "hasTopInputHandle": true/false,
     "hasBottomInputHandle": true/false,
     "hasTopOutputHandle": true/false,
     "hasBottomOutputHandle": true/false,
     "bgColor": "#hexcolor",
     "textColor": "#hexcolor",
     "state": "default" | "active" | "double-active",
     "important": true/false
   }

3. Edges - Connect nodes with the following properties:
   - Source node ID and handle
   - Target node ID and handle
   - Unique edge ID

INSTRUCTIONS:
1. Carefully analyze the user's instruction and the current flowchart structure
2. Make ONLY the changes requested by the user
3. Preserve all node IDs, positions, and other properties not mentioned in the user's instruction
4. Ensure all connections between nodes remain valid
5. Return a complete, valid JSON object with the entire modified flowchart

Your response should be a valid JSON object that can replace the current flowchart. Include both nodes and edges arrays, even if only one is modified.

IMPORTANT: YOUR RESPONSE MUST BE ONLY A VALID JSON OBJECT AND NOTHING ELSE. DO NOT INCLUDE ANY EXPLANATION TEXT.
`;

    try {
      // First attempt with gpt-4-turbo and response_format parameter
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are a flowchart design assistant that transforms flowcharts based on text instructions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      
      // Parse the response content
      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);
      
      // Return the transformed flowchart
      return NextResponse.json(parsedContent);
      
    } catch (modelError) {
      console.error('Error with gpt-4-turbo model, trying alternative:', modelError);
      
      // Fall back to using gpt-3.5-turbo without response_format parameter
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are a flowchart design assistant. Always respond with valid JSON only, no extra text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      });
      
      // Get the response content and ensure it's valid JSON
      const fallbackContent = fallbackResponse.choices[0].message.content;
      
      // Extract JSON from the response (in case model adds extra text)
      let jsonString = fallbackContent;
      
      // Try to find JSON if surrounded by backticks or text
      const jsonMatch = fallbackContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         fallbackContent.match(/```\s*([\s\S]*?)\s*```/) ||
                         fallbackContent.match(/(\{[\s\S]*\})/);
                         
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
      }
      
      try {
        const parsedFallbackContent = JSON.parse(jsonString);
        return NextResponse.json(parsedFallbackContent);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON from model response: ${parseError.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error transforming flowchart with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to transform flowchart', details: error.message },
      { status: 500 }
    );
  }
} 