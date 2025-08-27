import mongoose, { Schema } from "mongoose";

const customFlowchartSchema = new Schema(
  {
    flowchart: String,
    name: { type: String, required: true },
    description: { type: String, default: "" },
    submissionInstance: Number,
    createdDate: Date,
    version: Number,
  },

  {
    timestamps: true,
  }
);
  
export default mongoose.models.CustomFlowchart || mongoose.model("CustomFlowchart", customFlowchartSchema);
