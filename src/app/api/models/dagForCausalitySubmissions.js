import mongoose from 'mongoose';

const DagSubmissionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    nodes: { type: Array, default: [] },
    edges: { type: Array, default: [] },
    nodeCount: { type: Number, default: 0 },
    edgeCount: { type: Number, default: 0 },
    createdDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const DagForCausalitySubmissions =
  mongoose.models.DagForCausalitySubmissions ||
  mongoose.model('DagForCausalitySubmissions', DagSubmissionSchema);

export default DagForCausalitySubmissions;


