import connectMongoDB from '../libs/mongodb';
import FTBUserSession from "../models/ftbUserSession";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import ftbData from '../../../../FTB-Data.json';

// GET - Fetch case study data and user session
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const caseStudyId = searchParams.get('caseStudyId');

    await connectMongoDB();

    // If requesting specific case study
    if (caseStudyId) {
      const caseStudy = ftbData.caseStudies.find(cs => cs.id === parseInt(caseStudyId));
      if (!caseStudy) {
        return NextResponse.json({ message: "Case study not found" }, { status: 404 });
      }
      return NextResponse.json({ caseStudy });
    }

    // If sessionId provided, get existing session and aggregate stats
    if (sessionId) {
      const session = await FTBUserSession.findOne({ sessionId });
      if (session) {
        // Calculate aggregate statistics from all sessions
        const aggregateStats = await calculateAggregateStats();
        return NextResponse.json({ 
          session, 
          totalCaseStudies: ftbData.metadata.totalCaseStudies,
          aggregateStats 
        });
      }
    }

    // Create new session
    const newSessionId = uuidv4();
    const newSession = await FTBUserSession.create({
      sessionId: newSessionId,
      caseStudyResults: []
    });

    return NextResponse.json({ 
      session: newSession, 
      totalCaseStudies: ftbData.metadata.totalCaseStudies 
    });

  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}

// Helper function to calculate aggregate statistics
async function calculateAggregateStats() {
  try {
    const allSessions = await FTBUserSession.find({});
    
    const stats = {
      totalSessions: allSessions.length,
      totalCompletedSessions: allSessions.filter(s => s.isCompleted).length,
      caseStudyStats: {},
      averageAttempts: {
        problem: 0,
        solution: 0,
        total: 0
      }
    };

    if (allSessions.length === 0) {
      return stats;
    }

    // Calculate stats for each case study
    ftbData.caseStudies.forEach(caseStudy => {
      const caseStudyResults = allSessions.flatMap(session => 
        session.caseStudyResults.filter(result => result.caseStudyId === caseStudy.id)
      );

      if (caseStudyResults.length > 0) {
        const avgProblemAttempts = caseStudyResults.reduce((sum, result) => sum + result.problemAttempts, 0) / caseStudyResults.length;
        const avgSolutionAttempts = caseStudyResults.reduce((sum, result) => sum + (result.solutionAttempts || 0), 0) / caseStudyResults.length;
        const successRate = (caseStudyResults.filter(result => result.isCorrectProblem && result.isCorrectSolution).length / caseStudyResults.length) * 100;

        stats.caseStudyStats[caseStudy.id] = {
          title: caseStudy.title,
          attempts: caseStudyResults.length,
          averageProblemAttempts: Math.round(avgProblemAttempts * 10) / 10,
          averageSolutionAttempts: Math.round(avgSolutionAttempts * 10) / 10,
          averageTotalAttempts: Math.round((avgProblemAttempts + avgSolutionAttempts) * 10) / 10,
          successRate: Math.round(successRate * 10) / 10
        };
      }
    });

    // Calculate overall averages
    const allResults = allSessions.flatMap(session => session.caseStudyResults);
    if (allResults.length > 0) {
      stats.averageAttempts.problem = Math.round((allResults.reduce((sum, result) => sum + result.problemAttempts, 0) / allResults.length) * 10) / 10;
      stats.averageAttempts.solution = Math.round((allResults.reduce((sum, result) => sum + (result.solutionAttempts || 0), 0) / allResults.length) * 10) / 10;
      stats.averageAttempts.total = Math.round((stats.averageAttempts.problem + stats.averageAttempts.solution) * 10) / 10;
    }

    return stats;
  } catch (error) {
    console.error('Error calculating aggregate stats:', error);
    return {
      totalSessions: 0,
      totalCompletedSessions: 0,
      caseStudyStats: {},
      averageAttempts: { problem: 0, solution: 0, total: 0 }
    };
  }
}

// POST - Submit user responses and update session
export async function POST(request) {
  try {
    const { sessionId, caseStudyId, action, data } = await request.json();
    await connectMongoDB();

    const session = await FTBUserSession.findOne({ sessionId });
    if (!session) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const caseStudy = ftbData.caseStudies.find(cs => cs.id === caseStudyId);
    if (!caseStudy) {
      return NextResponse.json({ message: "Case study not found" }, { status: 404 });
    }

    let response = { success: false, message: "", feedback: "" };

    if (action === 'selectProblem') {
      const { selectedStepId } = data;
      const selectedStep = caseStudy.methodsSteps.find(step => step.id === selectedStepId);
      
      if (!selectedStep) {
        return NextResponse.json({ message: "Invalid step selected" }, { status: 400 });
      }

      const isCorrect = selectedStep.isCorrect;
      const existingResult = session.caseStudyResults.find(r => r.caseStudyId === caseStudyId);

      if (existingResult) {
        // Update existing result
        existingResult.selectedProblemStep = selectedStepId;
        existingResult.isCorrectProblem = isCorrect;
        existingResult.problemAttempts += 1;
      } else {
        // Create new result
        session.caseStudyResults.push({
          caseStudyId,
          caseStudyTitle: caseStudy.title,
          selectedProblemStep: selectedStepId,
          isCorrectProblem: isCorrect,
          problemAttempts: 1
        });
      }

      response = {
        success: true,
        isCorrect,
        feedback: isCorrect ? caseStudy.correctText : caseStudy.incorrectText,
        canProceedToSolutions: isCorrect
      };

    } else if (action === 'selectSolution') {
      const { selectedSolutionId } = data;
      const selectedSolution = caseStudy.solutionCards.find(sol => sol.id === selectedSolutionId);
      
      if (!selectedSolution) {
        return NextResponse.json({ message: "Invalid solution selected" }, { status: 400 });
      }

      const isCorrect = selectedSolution.isCorrect;
      const existingResult = session.caseStudyResults.find(r => r.caseStudyId === caseStudyId);

      if (existingResult) {
        existingResult.selectedSolution = selectedSolutionId;
        existingResult.isCorrectSolution = isCorrect;
        existingResult.solutionAttempts += 1;
        
        if (isCorrect) {
          session.completedStudies += 1;
        }
      }

      response = {
        success: true,
        isCorrect,
        feedback: selectedSolution.feedback,
        canProceedToNext: isCorrect
      };

    } else if (action === 'noConcerns') {
      // Handle "No Concerns" button
      const existingResult = session.caseStudyResults.find(r => r.caseStudyId === caseStudyId);
      
      if (existingResult) {
        existingResult.selectedProblemStep = 'no_concerns';
        existingResult.isCorrectProblem = false; // Assuming all studies in dataset have problems
        existingResult.problemAttempts += 1;
      } else {
        session.caseStudyResults.push({
          caseStudyId,
          caseStudyTitle: caseStudy.title,
          selectedProblemStep: 'no_concerns',
          isCorrectProblem: false,
          problemAttempts: 1
        });
      }

      response = {
        success: true,
        isCorrect: false,
        feedback: "This study does have methodological concerns. Please try selecting a specific step.",
        canProceedToSolutions: false
      };
    }

    // Check if session is complete
    if (session.completedStudies >= ftbData.metadata.totalCaseStudies) {
      session.isCompleted = true;
    }

    await session.save();
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ message: "Failed to process request" }, { status: 500 });
  }
}
