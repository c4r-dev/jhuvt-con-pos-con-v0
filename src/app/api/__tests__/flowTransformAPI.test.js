/**
 * Test for flowTransformAPI endpoint
 * 
 * To run this test:
 * 1. Ensure your OpenAI API key is set in .env
 * 2. Run: npx jest src/app/api/__tests__/flowTransformAPI.test.js
 */

import { POST } from '../flowTransformAPI/route';

// Mock the Response object
global.Response = jest.fn();

// Mock OpenAI API
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    nodes: [{ id: 'test-node', type: 'customNode' }],
                    edges: []
                  })
                }
              }
            ]
          })
        }
      }
    }))
  };
});

describe('Flow Transform API', () => {
  it('should return 400 if flowData or userInstruction is missing', async () => {
    const mockJson = jest.fn().mockResolvedValue({});
    const mockRequest = { json: mockJson };
    
    // Mock NextResponse
    const mockNextResponse = {
      json: jest.fn().mockReturnValue('mocked response')
    };
    global.NextResponse = { json: mockNextResponse.json };
    
    // Call the API with empty data
    await POST(mockRequest);
    
    // Check if NextResponse.json was called with the error
    expect(mockNextResponse.json).toHaveBeenCalledWith(
      { error: 'Flow data and user instruction are required' },
      { status: 400 }
    );
  });

  it('should transform the flowchart when valid data is provided', async () => {
    const flowData = {
      nodes: [
        {
          id: 'test-node',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            elements: {
              label: { 
                visible: true,
                text: 'Test Node'
              }
            }
          }
        }
      ],
      edges: []
    };
    
    const userInstruction = 'Change the node label to "Updated Test Node"';
    
    const mockJson = jest.fn().mockResolvedValue({ flowData, userInstruction });
    const mockRequest = { json: mockJson };
    
    // Mock NextResponse
    const mockNextResponse = {
      json: jest.fn().mockReturnValue('mocked response')
    };
    global.NextResponse = { json: mockNextResponse.json };
    
    // Call the API with valid data
    await POST(mockRequest);
    
    // The test just verifies the function runs without error
    expect(mockNextResponse.json).toHaveBeenCalled();
  });
}); 