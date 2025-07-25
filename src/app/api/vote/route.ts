import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';
import { Article } from '@/lib/models/Article';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { linkId, voteType, isArticle } = await req.json();
    
    if (!linkId || !['up', 'down'].includes(voteType)) {
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

    if (voteType === 'up') {
      item.votes.up += 1;
    } else {
      item.votes.down += 1;
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
