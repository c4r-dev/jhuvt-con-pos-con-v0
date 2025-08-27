import mongoose, { Schema } from "mongoose";

const flowValidationSchema = new Schema(
  {
    flowId: { type: String, required: true },
    nodeIds: [String], // Array of node IDs this validation applies to
    validationText: { type: String, required: true },
    nodeLabels: [String], // Array of node labels for display purposes
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
  
export default mongoose.models.FlowValidation || mongoose.model("FlowValidation", flowValidationSchema); 