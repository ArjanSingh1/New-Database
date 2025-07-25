const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 },
    upVoters: [{ type: String }],
    downVoters: [{ type: String }],
  }
}, { strict: false });

const articleSchema = new mongoose.Schema({
  votes: {
    up: { type: Number, default: 0 },
    down: { type: Number, default: 0 },
    upVoters: [{ type: String }],
    downVoters: [{ type: String }],
  }
}, { strict: false });

const Link = mongoose.models.Link || mongoose.model('Link', linkSchema);
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

async function resetVotes() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  await Link.updateMany({}, { $set: { 'votes.up': 0, 'votes.down': 0, 'votes.upVoters': [], 'votes.downVoters': [] } });
  await Article.updateMany({}, { $set: { 'votes.up': 0, 'votes.down': 0, 'votes.upVoters': [], 'votes.downVoters': [] } });
  console.log('All votes reset');
  process.exit(0);
}
resetVotes();
