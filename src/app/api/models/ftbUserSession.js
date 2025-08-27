import mongoose, { Schema } from "mongoose";

const ftbUserSessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    caseStudyResults: [{
      caseStudyId: {
        type: Number,
        required: true
      },
      caseStudyTitle: {
        type: String,
        required: true
      },
      selectedProblemStep: {
        type: String,
        required: true
      },
      isCorrectProblem: {
        type: Boolean,
        required: true
      },
      problemAttempts: {
        type: Number,
        default: 1
      },
      selectedSolution: {
        type: String,
        required: false
      },
      isCorrectSolution: {
        type: Boolean,
        required: false
      },
      solutionAttempts: {
        type: Number,
        default: 0
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalScore: {
      type: Number,
      default: 0
    },
    completedStudies: {
      type: Number,
      default: 0
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const FTBUserSession = mongoose.models.FTBUserSession || mongoose.model("FTBUserSession", ftbUserSessionSchema);

export default FTBUserSession; 