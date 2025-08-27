import mongoose, { Schema } from "mongoose";

const themeCommentSchema = new Schema(
  {
    flowId: { type: String, required: true },
    sessionId: { type: String, required: true },
    themeName: { type: String, required: true },
    commentText: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);
  
export default mongoose.models.ThemeComment || mongoose.model("ThemeComment", themeCommentSchema); 