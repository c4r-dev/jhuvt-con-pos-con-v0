import { NextResponse } from 'next/server';
import connectToDatabase from '../../libs/mongodb';
import SessionFlow from '../../models/sessionFlow';

// GET - Fetch a session flow by sessionId
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    const sessionFlow = await SessionFlow.findOne({ sessionId });

    if (!sessionFlow) {
      return NextResponse.json(
        { success: false, message: 'Session flow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: sessionFlow.sessionId,
        originalFlowId: sessionFlow.originalFlowId,
        originalFlowName: sessionFlow.originalFlowName,
        modifiedFlowData: sessionFlow.modifiedFlowData,
        validations: sessionFlow.validations,
        lastModified: sessionFlow.lastModified
      }
    });

  } catch (error) {
    console.error('Error fetching session flow:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch session flow', error: error.message },
      { status: 500 }
    );
  }
} 