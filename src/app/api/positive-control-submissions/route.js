import { NextResponse } from 'next/server';
import PositiveControlSubmission from '../models/positiveControlSubmission.js';
import FlowValidation from '../models/flowValidation.js';
// import connectMongoDB from '../libs/mongodb.js';
import connectMongoDB from '../libs/mongodb';


export async function POST(request) {
  try {
    const submissionData = await request.json();
    
    const {
      originalFlowId,
      originalFlowName,
      modifiedFlowData,
      validations,
      notes,
      sessionId // Extract sessionId from submission data
    } = submissionData;

    // Validate required fields
    if (!originalFlowId || !originalFlowName || !modifiedFlowData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: originalFlowId, originalFlowName, and modifiedFlowData are required.' 
      }, { status: 400 });
    }

    await connectMongoDB();
    
    // Calculate metadata
    const totalNodes = modifiedFlowData.nodes ? modifiedFlowData.nodes.length : 0;
    const totalEdges = modifiedFlowData.edges ? modifiedFlowData.edges.length : 0;
    const addedControlNodes = modifiedFlowData.nodes ? 
      modifiedFlowData.nodes.filter(node => node.id.startsWith('control-node-')).length : 0;
    const totalValidations = validations ? validations.length : 0;
    
    // Create the submission record
    const submission = new PositiveControlSubmission({
      originalFlowId,
      originalFlowName,
      sessionId,
      modifiedFlowData,
      validations: validations || [],
      submissionMetadata: {
        totalNodes,
        totalEdges,
        addedControlNodes,
        totalValidations,
        submittedBy: 'user', // Can be enhanced with authentication
        submissionDate: new Date()
      },
      notes: notes || ""
    });
    
    const savedSubmission = await submission.save();
    
    console.log(`Positive Control Submission saved for flow ${originalFlowId} with sessionId ${sessionId}:`, {
      submissionId: savedSubmission._id,
      sessionId: sessionId,
      totalNodes,
      addedControlNodes,
      totalValidations
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Positive control submission saved successfully.',
      data: {
        submissionId: savedSubmission._id,
        sessionId: sessionId,
        submissionDate: savedSubmission.submissionMetadata.submissionDate,
        metadata: savedSubmission.submissionMetadata
      }
    });
    
  } catch (error) {
    console.error('Error saving positive control submission:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An internal server error occurred.' 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectMongoDB();
    
    // Get all submissions with basic info (without full flow data for performance)
    const submissions = await PositiveControlSubmission.find({}, {
      originalFlowId: 1,
      originalFlowName: 1,
      sessionId: 1, // Include sessionId for debugging
      submissionMetadata: 1,
      notes: 1,
      createdAt: 1
    }).sort({ createdAt: -1 });
    
    console.log(`[API] Found ${submissions.length} total submissions`);
    console.log(`[API] Submissions with sessionIds:`, submissions.map(s => ({ id: s._id, sessionId: s.sessionId })));
    
    return NextResponse.json({ 
      success: true, 
      data: submissions,
      count: submissions.length 
    });
    
  } catch (error) {
    console.error('Error loading positive control submissions:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An internal server error occurred.',
      data: [] 
    }, { status: 500 });
  }
} 