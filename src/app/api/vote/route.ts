import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';
import { Article } from '@/lib/models/Article';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { linkId, voteType, isArticle, userId } = await req.json();
    if (!linkId || !['up', 'down'].includes(voteType) || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const Model = isArticle ? Article : Link;
    const item = await Model.findById(linkId);
    if (!item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Toggle voting: pressing again removes your vote
    if (voteType === 'up') {
      item.votes.upVoters = item.votes.upVoters || [];
      if (item.votes.upVoters.includes(userId)) {
        // Remove upvote
        item.votes.upVoters = item.votes.upVoters.filter((id: string) => id !== userId);
        item.votes.up = Math.max(0, item.votes.up - 1);
      } else {
        // Add upvote
        item.votes.up += 1;
        item.votes.upVoters.push(userId);
        // Remove from downVoters if present
        if (item.votes.downVoters?.includes(userId)) {
          item.votes.downVoters = item.votes.downVoters.filter((id: string) => id !== userId);
          item.votes.down = Math.max(0, item.votes.down - 1);
        }
      }
    } else {
      item.votes.downVoters = item.votes.downVoters || [];
      if (item.votes.downVoters.includes(userId)) {
        // Remove downvote
        item.votes.downVoters = item.votes.downVoters.filter((id: string) => id !== userId);
        item.votes.down = Math.max(0, item.votes.down - 1);
      } else {
        // Add downvote
        item.votes.down += 1;
        item.votes.downVoters.push(userId);
        // Remove from upVoters if present
        if (item.votes.upVoters?.includes(userId)) {
          item.votes.upVoters = item.votes.upVoters.filter((id: string) => id !== userId);
          item.votes.up = Math.max(0, item.votes.up - 1);
        }
      }
    }
    await item.save();
    return new Response(JSON.stringify({ 
      success: true, 
      votes: item.votes 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vote API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to record vote',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
