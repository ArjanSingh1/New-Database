import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  sender: {
    id: String,
    name: String,
    avatar: String,
  },
  channel: {
    id: String,
    name: String,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  slackMessageId: {
    type: String,
    unique: true,
  },
  tags: [String],
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 },
    upVoters: [{ type: String }], // user IDs
    downVoters: [{ type: String }],
  },
  comments: [{
    id: String,
    author: String,
    content: String,
    timestamp: Date,
  }],
}, {
  timestamps: true,
});

linkSchema.index({ url: 1 });
linkSchema.index({ timestamp: -1 });
linkSchema.index({ 'sender.name': 1 });

export const Link = mongoose.models.Link || mongoose.model('Link', linkSchema);
