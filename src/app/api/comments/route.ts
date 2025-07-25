import { NextRequest } from 'next/server';
import connectDB from '@/lib/database';
import { Link } from '@/lib/models/Link';
import { Article } from '@/lib/models/Article';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { linkId, user, text, isArticle } = await req.json();
    
    if (!linkId || !user || !text) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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

    const comment = {
      id: Date.now().toString(),
      user,
      text,
      timestamp: new Date(),
    };

    item.comments.push(comment);
    await item.save();

    return new Response(JSON.stringify({ 
      success: true, 
      comment 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Comment API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to add comment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
