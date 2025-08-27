import mongoose, { Schema } from "mongoose";

const sessionFlowSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    originalFlowId: { type: String, required: true },
    originalFlowName: { type: String, required: true },
    modifiedFlowData: { type: Object, required: true }, // Complete ReactFlow data with nodes and edges
    validations: [{
      nodeIds: [String],
      nodeLabels: [String],
      validationText: String,
      timestamp: { type: Date, default: Date.now }
    }],
    lastModified: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SessionFlow || mongoose.model("SessionFlow", sessionFlowSchema); 