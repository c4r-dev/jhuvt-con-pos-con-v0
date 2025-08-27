import { NextResponse } from 'next/server';
import connectToDatabase from '../libs/mongodb';
import SessionFlow from '../models/sessionFlow';

// POST - Save or update a session flow
export async function POST(request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { sessionId, originalFlowId, originalFlowName, modifiedFlowData, validations } = body;

    if (!sessionId || !originalFlowId || !modifiedFlowData) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, originalFlowId, or modifiedFlowData' },
        { status: 400 }
      );
    }

    // Update existing or create new session flow
    const sessionFlow = await SessionFlow.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        originalFlowId,
        originalFlowName: originalFlowName || 'Unnamed Flow',
        modifiedFlowData,
        validations: validations || [],
        lastModified: new Date()
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Session flow saved successfully',
      data: {
        sessionId: sessionFlow.sessionId,
        lastModified: sessionFlow.lastModified
      }
    });

  } catch (error) {
    console.error('Error saving session flow:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save session flow', error: error.message },
      { status: 500 }
    );
  }
} 