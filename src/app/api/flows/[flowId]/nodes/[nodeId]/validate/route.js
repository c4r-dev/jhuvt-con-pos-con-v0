import { NextResponse } from 'next/server';
import FlowValidation from '../../../../../models/flowValidation.js';
import connectMongoDB from '../../../../../libs/mongodb.js';

// Save validation to MongoDB
async function saveValidationToDB(flowId, nodeId, validationText) {
  try {
    await connectMongoDB();
    
    // Create a new validation record
    const validation = new FlowValidation({
      flowId: flowId,
      nodeIds: [nodeId], // Single node for individual validation
      validationText: validationText,
      timestamp: new Date()
    });
    
    await validation.save();
    console.log(`DB: Saved validation for flow ${flowId}, node ${nodeId}: "${validationText}"`);
    
    return { success: true, message: 'Validation saved successfully.' };
  } catch (error) {
    console.error('Error saving validation to DB:', error);
    throw new Error('Failed to save validation to database');
  }
}

export async function POST(request, { params }) {
  const { flowId, nodeId } = await params;
  try {
    const { validationText } = await request.json();

    if (!validationText || typeof validationText !== 'string') {
      return NextResponse.json({ success: false, message: 'Validation text is required and must be a string.' }, { status: 400 });
    }

    // TODO: Add user authentication/authorization checks here if necessary

    const result = await saveValidationToDB(flowId, nodeId, validationText);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message, data: { flowId, nodeId, validationText } });
    } else {
      return NextResponse.json({ success: false, message: result.message || 'Failed to save validation.' }, { status: 500 });
    }

  } catch (error) {
    console.error(`Error saving validation for flow ${flowId}, node ${nodeId}:`, error);
    return NextResponse.json({ success: false, message: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
} 