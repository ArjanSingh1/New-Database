import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
  },
  fullArticleUrl: {
    type: String,
    required: true,
  },
  summaryUrl: {
    type: String,
  },
  image: {
    type: String,
  },
  tags: [String],
  keywords: [String],
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 },
  },
  comments: [{
    id: String,
    author: String,
    content: String,
    timestamp: Date,
  }],
  shares: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

articleSchema.index({ title: 'text', summary: 'text', tags: 'text' });
articleSchema.index({ scrapedAt: -1 });
articleSchema.index({ tags: 1 });

export const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
