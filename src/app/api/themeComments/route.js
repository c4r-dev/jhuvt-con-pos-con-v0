import { NextResponse } from 'next/server';
import connectMongoDB from '../libs/mongodb';
import ThemeComment from '@/app/api/models/themeComment';

// Function to get all theme comments by flowId, sessionId, and themeName
export async function GET(request) {
  try {
    // Connect to database
    await connectMongoDB();
    
    // Get query parameters from URL
    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('flowId');
    const sessionId = searchParams.get('sessionId');
    const themeName = searchParams.get('themeName');
    
    if (!flowId || !sessionId || !themeName) {
      return NextResponse.json(
        { error: 'flowId, sessionId, and themeName are all required' },
        { status: 400 }
      );
    }
    
    // Query database for matching comments
    const comments = await ThemeComment.find({ 
      flowId: flowId,
      sessionId: sessionId,
      themeName: themeName 
    }).sort({ createdAt: -1 }); // Sort by newest first
    
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error('Error fetching theme comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theme comments', details: error.message },
      { status: 500 }
    );
  }
}

// Function to create a new theme comment
export async function POST(request) {
  try {
    // Connect to database
    await connectMongoDB();
    
    // Get request body
    const { flowId, sessionId, themeName, commentText } = await request.json();
    
    // Validate required fields
    if (!flowId || !sessionId || !themeName || !commentText) {
      return NextResponse.json(
        { error: 'flowId, sessionId, themeName, and commentText are all required' },
        { status: 400 }
      );
    }
    
    // Create new ThemeComment
    const newComment = new ThemeComment({
      flowId,
      sessionId,
      themeName,
      commentText,
      timestamp: new Date()
    });
    
    // Save to database
    await newComment.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Comment saved successfully',
      data: newComment
    });
  } catch (error) {
    console.error('Error saving theme comment:', error);
    return NextResponse.json(
      { error: 'Failed to save theme comment', details: error.message },
      { status: 500 }
    );
  }
} 