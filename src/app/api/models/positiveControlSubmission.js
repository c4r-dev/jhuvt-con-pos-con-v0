import mongoose, { Schema } from "mongoose";

const positiveControlSubmissionSchema = new Schema(
  {
    originalFlowId: { type: String, required: true },
    originalFlowName: { type: String, required: true },
    sessionId: { type: String, required: false }, // Track which session this submission came from
    modifiedFlowData: { type: Object, required: true }, // Complete ReactFlow data with added control nodes
    validations: [{
      nodeIds: [String],
      nodeLabels: [String],
      validationText: String,
      timestamp: { type: Date, default: Date.now }
    }],
    submissionMetadata: {
      totalNodes: Number,
      totalEdges: Number,
      addedControlNodes: Number,
      totalValidations: Number,
      submittedBy: String, // Can be expanded for user authentication
      submissionDate: { type: Date, default: Date.now }
    },
    notes: { type: String, default: "" }, // Optional notes from the user
  },
  {
    timestamps: true,
  }
);
  
export default mongoose.models.PositiveControlSubmission || mongoose.model("PositiveControlSubmission", positiveControlSubmissionSchema); 