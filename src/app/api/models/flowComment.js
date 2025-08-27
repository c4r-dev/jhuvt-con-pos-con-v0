import mongoose, { Schema } from "mongoose";

const flowCommentSchema = new Schema(
  {
    flowId: { type: String, required: true },
    sessionId: { type: String, required: true },
    text: { type: String, required: true },
    commentType: { type: String, required: true },
    nodeIds: [String],
    nodeLabels: [String],
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
  
export default mongoose.models.FlowComment || mongoose.model("FlowComment", flowCommentSchema); 