
"use client";
import { useState, useEffect } from "react";

type Link = {
  _id?: string;
  url: string;
  sender: { id: string; name: string; avatar: string };
  timestamp: string;
  slackMessageId: string;
  channel: { id: string; name: string };
  votes: { up: number; down: number };
  comments: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
  }>;
};

type Article = {
  _id?: string;
  title: string;
  summary: string;
  fullArticleUrl: string;
  summaryUrl: string;
  image: string;
  tags: string[];
  keywords: string[];
  scrapedAt: string;
  votes: { up: number; down: number };
  comments: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
  }>;
};

export default function Home() {
  const [tab, setTab] = useState<"ai-links" | "b2b-vault">("ai-links");
  
  // AI Links state
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState(7);
  const [senderFilter, setSenderFilter] = useState('');
  const [uniqueSenders, setUniqueSenders] = useState<string[]>([]);
  
  // B2B Vault state
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  
  // Comment states
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState('Anonymous');

  const fetchLinks = (days = dayFilter, sender = senderFilter) => {
    setLinksLoading(true);
    const params = new URLSearchParams();
    params.set('days', days.toString());
    if (sender) params.set('sender', sender);
    
    fetch(`/api/slack-links?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLinks(data.links || []);
        setLinksError(null);
        
        // Extract unique senders
        const senders = [...new Set((data.links || []).map((link: Link) => link.sender.name))].filter(Boolean) as string[];
        setUniqueSenders(senders);
      })
      .catch(() => setLinksError("Failed to load Slack links."))
      .finally(() => setLinksLoading(false));
  };

  const fetchArticles = () => {
    setArticlesLoading(true);
    fetch("/api/b2b-vault")
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
        setArticlesError(null);
      })
      .catch(() => setArticlesError("Failed to load B2B Vault articles."))
      .finally(() => setArticlesLoading(false));
  };

  const handleVote = async (id: string, voteType: 'up' | 'down', isArticle = false) => {
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: id, voteType, isArticle }),
      });
      
      if (response.ok) {
        const { votes } = await response.json();
        if (isArticle) {
          setArticles(prev => prev.map(article => 
            article._id === id ? { ...article, votes } : article
          ));
        } else {
          setLinks(prev => prev.map(link => 
            link._id === id ? { ...link, votes } : link
          ));
        }
      } else {
        console.error('Vote failed:', await response.text());
      }
    } catch (error) {
      console.error('Vote failed:', error);
    }
  };

  const handleComment = async (id: string, isArticle = false) => {
    const text = commentTexts[id];
    if (!text?.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: id, user: userName, text, isArticle }),
      });
      
      if (response.ok) {
        const { comment } = await response.json();
        if (isArticle) {
          setArticles(prev => prev.map(article => 
            article._id === id ? { ...article, comments: [...(article.comments || []), comment] } : article
          ));
        } else {
          setLinks(prev => prev.map(link => 
            link._id === id ? { ...link, comments: [...(link.comments || []), comment] } : link
          ));
        }
        setCommentTexts(prev => ({ ...prev, [id]: '' }));
      } else {
        console.error('Comment failed:', await response.text());
      }
    } catch (error) {
      console.error('Comment failed:', error);
    }
  };

  useEffect(() => {
    if (tab === "ai-links") {
      fetchLinks();
    } else if (tab === "b2b-vault" && articles.length === 0) {
      fetchArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl sm:text-5xl font-bold mb-8 text-center text-gray-900 dark:text-white drop-shadow-lg">Global Link Vault</h1>
      
      {/* User Name Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
        />
      </div>
      
      <div className="flex space-x-2 mb-8">
        <button
          className={`px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 focus:outline-none ${tab === "ai-links" ? "bg-white dark:bg-gray-800 text-blue-600 shadow" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
          onClick={() => setTab("ai-links")}
        >
          AI Links
        </button>
        <button
          className={`px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 focus:outline-none ${tab === "b2b-vault" ? "bg-white dark:bg-gray-800 text-blue-600 shadow" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
          onClick={() => setTab("b2b-vault")}
        >
          B2B Vault
        </button>
      </div>
      
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-b-lg shadow-lg p-6 min-h-[300px]">
        {tab === "ai-links" ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">AI Links from Slack</h2>
            
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4 items-center justify-center">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Days:</label>
                <select 
                  value={dayFilter} 
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    setDayFilter(days);
                    fetchLinks(days, senderFilter);
                  }}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Sender:</label>
                <select 
                  value={senderFilter} 
                  onChange={(e) => {
                    setSenderFilter(e.target.value);
                    fetchLinks(dayFilter, e.target.value);
                  }}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">All senders</option>
                  {uniqueSenders.map(sender => (
                    <option key={sender} value={sender}>{sender}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={() => fetchLinks(dayFilter, senderFilter)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            
            {linksLoading ? (
              <div className="text-center text-gray-400">Loading links...</div>
            ) : linksError ? (
              <div className="text-center text-red-500">{linksError}</div>
            ) : links.length === 0 ? (
              <div className="text-center text-gray-400">No links found for the selected filters.</div>
            ) : (
              <div className="space-y-4">
                {links.map((link) => (
                  <div key={link._id || link.slackMessageId} className="bg-gray-100 dark:bg-gray-700 rounded p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-3">
                        <img src={link.sender.avatar} alt={link.sender.name} className="w-8 h-8 rounded-full border" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{link.sender.name}</div>
                          <div className="text-xs text-gray-500">{new Date(link.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all">
                          {link.url}
                        </a>
                      </div>
                    </div>
                    
                    {/* Voting */}
                    <div className="flex items-center gap-4 mt-3">
                      <button 
                        onClick={() => handleVote(link._id!, 'up')}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        disabled={!link._id}
                      >
                        ↑ {link.votes?.up || 0}
                      </button>
                      <button 
                        onClick={() => handleVote(link._id!, 'down')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        disabled={!link._id}
                      >
                        ↓ {link.votes?.down || 0}
                      </button>
                    </div>
                    
                    {/* Comments */}
                    <div className="mt-3">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentTexts[link._id!] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [link._id!]: e.target.value }))}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          disabled={!link._id}
                        />
                        <button 
                          onClick={() => handleComment(link._id!)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                          disabled={!link._id || !commentTexts[link._id!]?.trim()}
                        >
                          Comment
                        </button>
                      </div>
                      {link.comments?.map(comment => (
                        <div key={comment.id} className="text-sm bg-gray-200 dark:bg-gray-600 rounded p-2 mb-1">
                          <strong>{comment.user}:</strong> {comment.text}
                          <div className="text-xs text-gray-500 mt-1">{new Date(comment.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">B2B Vault Articles</h2>
            {articlesLoading ? (
              <div className="text-center text-gray-400">Loading articles...</div>
            ) : articlesError ? (
              <div className="text-center text-red-500">{articlesError}</div>
            ) : articles.length === 0 ? (
              <div className="text-center text-gray-400">No articles found.</div>
            ) : (
              <div className="space-y-4">
                {articles.map((article, idx) => (
                  <div key={article._id || `article-${idx}`} className="bg-gray-100 dark:bg-gray-700 rounded p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {article.image && (
                        <img src={article.image} alt={article.title} className="w-16 h-16 object-cover rounded border" />
                      )}
                      <div className="flex-1">
                        <a href={article.fullArticleUrl || article.summaryUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 underline block mb-1">
                          {article.title}
                        </a>
                        <div className="text-sm text-gray-700 dark:text-gray-200 mb-1">{article.summary}</div>
                        <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                          {article.tags.map((tag) => (
                            <span key={tag} className="bg-blue-100 dark:bg-blue-900 rounded px-2 py-0.5">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Voting */}
                    <div className="flex items-center gap-4 mt-3">
                      <button 
                        onClick={() => handleVote(article._id!, 'up', true)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700"
                        disabled={!article._id}
                      >
                        ↑ {article.votes?.up || 0}
                      </button>
                      <button 
                        onClick={() => handleVote(article._id!, 'down', true)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        disabled={!article._id}
                      >
                        ↓ {article.votes?.down || 0}
                      </button>
                    </div>
                    
                    {/* Comments */}
                    <div className="mt-3">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentTexts[article._id || `article-${idx}`] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [article._id || `article-${idx}`]: e.target.value }))}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          disabled={!article._id}
                        />
                        <button 
                          onClick={() => handleComment(article._id!, true)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                          disabled={!article._id || !commentTexts[article._id || `article-${idx}`]?.trim()}
                        >
                          Comment
                        </button>
                      </div>
                      {article.comments?.map(comment => (
                        <div key={comment.id} className="text-sm bg-gray-200 dark:bg-gray-600 rounded p-2 mb-1">
                          <strong>{comment.user}:</strong> {comment.text}
                          <div className="text-xs text-gray-500 mt-1">{new Date(comment.timestamp).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="mt-10 text-xs text-gray-400 text-center">
        &copy; {new Date().getFullYear()} Global Link Vault. All rights reserved.
      </footer>
    </div>
  );
}
