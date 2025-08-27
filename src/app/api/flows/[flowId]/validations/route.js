import { NextResponse } from 'next/server';
import FlowValidation from '../../../models/flowValidation.js';
import connectMongoDB from '../../../libs/mongodb.js';

export async function GET(request, { params }) {
  const { flowId } = await params;
  
  try {
    await connectMongoDB();
    
    // Find all validations for this flow
    const validations = await FlowValidation.find({ flowId: flowId }).sort({ timestamp: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: validations,
      count: validations.length 
    });
    
  } catch (error) {
    console.error(`Error loading validations for flow ${flowId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An internal server error occurred.',
      data: [] 
    }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { flowId } = await params;
  
  try {
    const { nodeIds, validationText, nodeLabels } = await request.json();

    if (!validationText || typeof validationText !== 'string') {
      return NextResponse.json({ success: false, message: 'Validation text is required and must be a string.' }, { status: 400 });
    }

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one node ID is required.' }, { status: 400 });
    }

    await connectMongoDB();
    
    // Create a new validation record for multiple nodes
    const validation = new FlowValidation({
      flowId: flowId,
      nodeIds: nodeIds,
      nodeLabels: nodeLabels || [],
      validationText: validationText,
      timestamp: new Date()
    });
    
    await validation.save();
    console.log(`DB: Saved multi-node validation for flow ${flowId}, nodes ${nodeIds.join(', ')}: "${validationText}"`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Validation saved successfully.',
      data: validation 
    });
    
  } catch (error) {
    console.error(`Error saving validation for flow ${flowId}:`, error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An internal server error occurred.' 
    }, { status: 500 });
  }
} 