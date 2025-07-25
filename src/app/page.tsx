
"use client";
import { useState, useEffect } from "react";
// For calendar, install: npm install react-date-range
// import { DateRange } from 'react-date-range';
// import 'react-date-range/dist/styles.css';
// import 'react-date-range/dist/theme/default.css';


type Link = {
  _id?: string;
  url: string;
  sender: { id: string; name: string; avatar: string };
  timestamp: string;
  slackMessageId: string;
  channel: { id: string; name: string };
  votes: {
    up: number;
    down: number;
    upVoters?: string[];
    downVoters?: string[];
  };
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
  votes: {
    up: number;
    down: number;
    upVoters?: string[];
    downVoters?: string[];
  };
  comments: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
  }>;
};

export default function Home() {
  // State and hooks
  const [tab, setTab] = useState<'ai-links' | 'b2b-vault'>('ai-links');
  const [userName, setUserName] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState('');
  const [commentTexts, setCommentTexts] = useState<{ [id: string]: string }>({});

  // Unique senders for filter dropdown
  const uniqueSenders = Array.from(new Set(links.map(l => l.sender.name)));

  // Filtering logic
  const filteredLinks = links.filter(link => {
    const matchesSender = !senderFilter || link.sender.name === senderFilter;
    const matchesDate = (!fromDate || new Date(link.timestamp) >= new Date(fromDate)) && (!toDate || new Date(link.timestamp) <= new Date(toDate));
    const matchesSearch = !searchTerm || link.url.toLowerCase().includes(searchTerm.toLowerCase()) || (link.comments || []).some(c => c.text.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSender && matchesDate && matchesSearch;
  });
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || article.title.toLowerCase().includes(searchTerm.toLowerCase()) || article.summary.toLowerCase().includes(searchTerm.toLowerCase()) || (article.comments || []).some(c => c.text.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Fetch links from API
  const fetchLinks = async (from?: string, to?: string, sender?: string) => {
    setLinksLoading(true);
    setLinksError('');
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (sender) params.append('sender', sender);
      const res = await fetch(`/api/slack-links?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch links');
      const data = await res.json();
      setLinks(data.links || []);
    } catch (err: any) {
      setLinksError(err.message || 'Error fetching links');
    } finally {
      setLinksLoading(false);
    }
  };

  // Fetch articles from API
  const fetchArticles = async () => {
    setArticlesLoading(true);
    setArticlesError('');
    try {
      const res = await fetch('/api/b2b-vault');
      if (!res.ok) throw new Error('Failed to fetch articles');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err: any) {
      setArticlesError(err.message || 'Error fetching articles');
    } finally {
      setArticlesLoading(false);
    }
  };

  // Voting handler
  const handleVote = async (id: string, type: 'up' | 'down', isArticle = false) => {
    if (!userName) return alert('Please enter your name to vote.');
    try {
      const res = await fetch(`/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, user: userName, isArticle })
      });
      if (!res.ok) throw new Error('Failed to vote');
      if (isArticle) fetchArticles();
      else fetchLinks(fromDate, toDate, senderFilter);
    } catch (err) {
      alert('Error voting.');
    }
  };

  // Comment handler
  const handleComment = async (id: string, isArticle = false) => {
    if (!userName) return alert('Please enter your name to comment.');
    const text = commentTexts[id]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, user: userName, text, isArticle })
      });
      if (!res.ok) throw new Error('Failed to comment');
      setCommentTexts(prev => ({ ...prev, [id]: '' }));
      if (isArticle) fetchArticles();
      else fetchLinks(fromDate, toDate, senderFilter);
    } catch (err) {
      alert('Error posting comment.');
    }
  };

  // Initial data load
  useEffect(() => {
    if (tab === 'ai-links') fetchLinks(fromDate, toDate, senderFilter);
    else fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fromDate, toDate, senderFilter]);

  // ...JSX follows...
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center py-8 px-2">
      {/* Topbar */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Global Link Vault</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="px-3 py-1 border rounded text-sm bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-400"
          />
          <button
            className="px-4 py-2 rounded bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition"
            onClick={() => setFiltersOpen((v) => !v)}
            title="Show filters"
          >
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="w-full max-w-5xl flex gap-2 mb-4">
        <button
          className={`flex-1 px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 focus:outline-none ${tab === "ai-links" ? "bg-white dark:bg-gray-800 text-blue-600 shadow" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
          onClick={() => setTab("ai-links")}
        >
          AI Links
        </button>
        <button
          className={`flex-1 px-6 py-2 rounded-t-lg font-semibold transition-colors duration-200 focus:outline-none ${tab === "b2b-vault" ? "bg-white dark:bg-gray-800 text-blue-600 shadow" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}
          onClick={() => setTab("b2b-vault")}
        >
          B2B Vault
        </button>
      </nav>

      {/* Filters Panel */}
      {filtersOpen && (
        <section className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded shadow p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center animate-fade-in">
          {/* Calendar date range picker placeholder */}
          <div className="flex flex-col items-start">
            <label className="text-gray-700 dark:text-gray-200 font-medium mb-1">Date Range</label>
            {/* Replace with <DateRange ... /> for real calendar */}
            <div className="flex gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-2 py-1 border rounded text-sm" />
              <span className="text-gray-400">to</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-2 py-1 border rounded text-sm" />
            </div>
          </div>
          {/* Sender filter */}
          {tab === "ai-links" && (
            <div className="flex flex-col items-start">
              <label className="text-gray-700 dark:text-gray-200 font-medium mb-1">Sender</label>
              <select
                className="px-3 py-1 border rounded text-sm bg-white dark:bg-gray-700"
                value={senderFilter}
                onChange={e => setSenderFilter(e.target.value)}
              >
                <option value="">All senders</option>
                {uniqueSenders.map(sender => (
                  <option key={sender} value={sender}>{sender}</option>
                ))}
              </select>
            </div>
          )}
          {/* Smart search input */}
          <div className="flex flex-col items-start flex-1 min-w-[180px]">
            <label className="text-gray-700 dark:text-gray-200 font-medium mb-1">Smart Search</label>
            <input
              type="text"
              placeholder="Type keywords or a question..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-1 border rounded text-sm w-full bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Refresh button */}
          {tab === "ai-links" && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 transition-colors shadow"
              onClick={() => fetchLinks(fromDate, toDate, senderFilter)}
            >
              Refresh
            </button>
          )}
        </section>
      )}
      
      <main className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[300px]">
        {tab === "ai-links" ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">AI Links from Slack</h2>
            
            {/* Filters removed, now in top bar */}
            
            {linksLoading ? (
              <div className="text-center text-gray-400">Loading links...</div>
            ) : linksError ? (
              <div className="text-center text-red-500">{linksError}</div>
            ) : links.length === 0 ? (
              <div className="text-center text-gray-400">No links found for the selected filters.</div>
            ) : (
              <div className="space-y-4">
                {filteredLinks.map((link) => (
                  <div
                    key={link._id || link.slackMessageId}
                    className="bg-gray-100 dark:bg-gray-700 rounded p-4 shadow-sm hover:shadow-lg transition-shadow group border border-transparent hover:border-blue-400 cursor-pointer"
                    tabIndex={0}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-3">
                        <img src={link.sender.avatar} alt={link.sender.name} className="w-8 h-8 rounded-full border" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{link.sender.name}</div>
                          <div className="text-xs text-gray-500">{new Date(link.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                          title="Open link in new tab"
                        >
                          {link.url}
                        </a>
                      </div>
                    </div>
                    
                    {/* Voting */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleVote(link._id!, 'up')}
                        className={`flex items-center gap-1 hover:text-green-700 text-green-600 group-hover:scale-110 transition-transform`}
                        style={{ fontWeight: link.votes?.upVoters?.includes(userName) ? 'bold' : 'normal' }}
                        disabled={!link._id}
                        title={link.votes?.upVoters?.includes(userName) ? 'Remove upvote' : 'Upvote'}
                      >
                        ↑ {link.votes?.up || 0}
                      </button>
                      <button
                        onClick={() => handleVote(link._id!, 'down')}
                        className={`flex items-center gap-1 hover:text-red-700 text-red-600 group-hover:scale-110 transition-transform`}
                        style={{ fontWeight: link.votes?.downVoters?.includes(userName) ? 'bold' : 'normal' }}
                        disabled={!link._id}
                        title={link.votes?.downVoters?.includes(userName) ? 'Remove downvote' : 'Downvote'}
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
                {filteredArticles.map((article, idx) => (
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
                    onClick={() => {
                      if (article.votes?.upVoters?.includes(userName)) return;
                      handleVote(article._id!, 'up', true);
                    }}
                    className={`flex items-center gap-1 hover:text-green-700 text-green-600`}
                    style={{ fontWeight: article.votes?.upVoters?.includes(userName) ? 'bold' : 'normal' }}
                    disabled={!article._id}
                  >
                    ↑ {article.votes?.up || 0}
                  </button>
                  <button
                    onClick={() => {
                      if (article.votes?.downVoters?.includes(userName)) return;
                      handleVote(article._id!, 'down', true);
                    }}
                    className={`flex items-center gap-1 hover:text-red-700 text-red-600`}
                    style={{ fontWeight: article.votes?.downVoters?.includes(userName) ? 'bold' : 'normal' }}
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
      </main>
      <footer className="mt-10 text-xs text-gray-400 text-center">
        &copy; {new Date().getFullYear()} Global Link Vault. All rights reserved.<br/>
        <span className="text-gray-300">UI powered by Next.js, Tailwind CSS, and OpenAI API (smart search coming soon)</span>
      </footer>
    </div>
  );
}
