import { NextResponse } from 'next/server';
import connectToDatabase from '../../../libs/mongodb';
import PositiveControlSubmission from '../../../models/positiveControlSubmission';

// GET - Fetch positive control submissions by sessionId
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    
    const { sessionId } = await params;

    console.log(`[API] Looking for submissions with sessionId: ${sessionId}`);

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // First, let's check all submissions to see what sessionIds exist
    const allSubmissions = await PositiveControlSubmission.find({}, { sessionId: 1, _id: 1 });
    console.log(`[API] All submissions in database:`, allSubmissions.map(s => ({ id: s._id, sessionId: s.sessionId })));

    const submissions = await PositiveControlSubmission.find({ sessionId }).sort({ createdAt: -1 });

    console.log(`[API] Found ${submissions.length} submissions for sessionId: ${sessionId}`);
    console.log(`[API] Submissions found:`, submissions.map(s => ({ id: s._id, sessionId: s.sessionId })));

    return NextResponse.json({
      success: true,
      data: submissions,
      count: submissions.length,
      debug: {
        searchedSessionId: sessionId,
        totalSubmissionsInDb: allSubmissions.length,
        matchingSubmissions: submissions.length
      }
    });

  } catch (error) {
    console.error('Error fetching submissions by session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch submissions', error: error.message },
      { status: 500 }
    );
  }
} 