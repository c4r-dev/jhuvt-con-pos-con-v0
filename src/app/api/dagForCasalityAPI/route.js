import connectMongoDB from '../libs/mongodb';
import DagForCausalitySubmissions from '../models/dagForCausalitySubmissions';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { sessionId, nodes, edges, nodeCount, edgeCount, createdDate } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ message: 'sessionId is required' }, { status: 400 });
    }

    await connectMongoDB();
    await DagForCausalitySubmissions.create({
      sessionId,
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : [],
      nodeCount: typeof nodeCount === 'number' ? nodeCount : (Array.isArray(nodes) ? nodes.length : 0),
      edgeCount: typeof edgeCount === 'number' ? edgeCount : (Array.isArray(edges) ? edges.length : 0),
      createdDate: createdDate ? new Date(createdDate) : new Date(),
    });
    return NextResponse.json({ message: 'DAG submitted successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to submit DAG' }, { status: 500 });
  }
}

export async function GET(request) {
  // Optional: filter by sessionId if provided as a search param
  try {
    await connectMongoDB();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const query = sessionId ? { sessionId } : {};
    const results = await DagForCausalitySubmissions.find(query).sort({ createdAt: -1 });
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch submissions' }, { status: 500 });
  }
}


