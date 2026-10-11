const mongoose = require('mongoose');

const TranscriptItemSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  speaker: {
    type: String,
    enum: ['customer', 'sales_rep', 'system'],
    default: 'customer'
  },
  text: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    default: 0.95
  },
  signal: {
    type: String,
    default: null // e.g. "CLOSING_SIGNAL", "OBJECTION", "INQUIRY"
  }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  storeCode: {
    type: String,
    required: true,
    index: true
  },
  storeName: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    default: 'terminal-01'
  },
  salesRep: {
    type: String,
    default: 'Sales Specialist'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  audioUrl: {
    type: String,
    default: null
  },
  audioFileName: {
    type: String,
    default: null
  },
  transcripts: [TranscriptItemSchema],
  analytics: {
    dealOutcome: {
      type: String,
      enum: ['won', 'lost', 'in_negotiation', 'inquiry_only'],
      default: 'in_negotiation'
    },
    closureProbability: {
      type: Number,
      default: 50
    },
    customerSentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    customerIntent: {
      type: String,
      default: 'Product exploration'
    },
    devicesDiscussed: [{
      type: String
    }],
    objections: [{
      type: String
    }],
    closingSignals: [{
      type: String
    }],
    summary: {
      type: String,
      default: ''
    },
    salesRepPerformance: {
      score: { type: Number, default: 85 },
      strengths: [{ type: String }],
      areasToImprove: [{ type: String }],
      coachingNotes: { type: String, default: '' }
    },
    missedOpportunities: [{
      type: String
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', SessionSchema);
