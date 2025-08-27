import connectMongoDB from '../libs/mongodb';
import CustomFlowchart from "../models/customFlowchart";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { flowchart, name, description, submissionInstance, version, createdDate } = await request.json();
  await connectMongoDB();
  await CustomFlowchart.create({ 
    flowchart, 
    name, 
    description, 
    submissionInstance, 
    version, 
    createdDate 
  });
  return NextResponse.json({ message: "Flowchart Submitted Successfully" }, { status: 201 });
}

export async function GET() {
  try {
    await connectMongoDB();
    // All results
    const flowchartData = await CustomFlowchart.find();
    
    return NextResponse.json(flowchartData);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch flowchart data" }, { status: 500 });
  }
}