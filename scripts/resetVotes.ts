import { connect } from 'mongoose';
import { Link } from '../src/lib/models/Link';
import { Article } from '../src/lib/models/Article';

async function resetVotes() {
  // Use your actual MongoDB URI here or from env
  const uri = process.env.MONGODB_URI || '';
  if (!uri) throw new Error('MONGODB_URI not set');
  await connect(uri);
  await Link.updateMany({}, { $set: { 'votes.up': 0, 'votes.down': 0, 'votes.upVoters': [], 'votes.downVoters': [] } });
  await Article.updateMany({}, { $set: { 'votes.up': 0, 'votes.down': 0, 'votes.upVoters': [], 'votes.downVoters': [] } });
  console.log('All votes reset');
  process.exit(0);
}
resetVotes();
