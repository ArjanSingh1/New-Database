
"use client";
import { useState, useEffect } from "react";

type Link = {
  url: string;
  sender: { id: string; name: string; avatar: string };
  timestamp: string;
  slackMessageId: string;
  channel: { id: string; name: string };
};

type Article = {
  title: string;
  summary: string;
  fullArticleUrl: string;
  summaryUrl: string;
  image: string;
  tags: string[];
  keywords: string[];
  scrapedAt: string;
};

export default function Home() {
  const [tab, setTab] = useState<"ai-links" | "b2b-vault">("ai-links");
  // AI Links state
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  // B2B Vault state
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "ai-links" && links.length === 0 && !linksLoading) {
      setLinksLoading(true);
      fetch("/api/slack-links")
        .then((res) => res.json())
        .then((data) => {
          setLinks(data.links || []);
          setLinksError(null);
        })
        .catch(() => setLinksError("Failed to load Slack links."))
        .finally(() => setLinksLoading(false));
    }
    if (tab === "b2b-vault" && articles.length === 0 && !articlesLoading) {
      setArticlesLoading(true);
      fetch("/api/b2b-vault")
        .then((res) => res.json())
        .then((data) => {
          setArticles(data.articles || []);
          setArticlesError(null);
        })
        .catch(() => setArticlesError("Failed to load B2B Vault articles."))
        .finally(() => setArticlesLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-10 px-4">
      <h1 className="text-3xl sm:text-5xl font-bold mb-8 text-center text-gray-900 dark:text-white drop-shadow-lg">Global Link Vault</h1>
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
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-b-lg shadow-lg p-6 min-h-[300px]">
        {tab === "ai-links" ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">AI Links from Slack</h2>
            {linksLoading ? (
              <div className="text-center text-gray-400">Loading links...</div>
            ) : linksError ? (
              <div className="text-center text-red-500">{linksError}</div>
            ) : links.length === 0 ? (
              <div className="text-center text-gray-400">No links found.</div>
            ) : (
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.slackMessageId} className="bg-gray-100 dark:bg-gray-700 rounded p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <img src={link.sender.avatar} alt={link.sender.name} className="w-8 h-8 rounded-full border" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{link.sender.name}</div>
                        <div className="text-xs text-gray-500">{new Date(link.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 sm:ml-6 break-all">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">{link.url}</a>
                    </div>
                  </li>
                ))}
              </ul>
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
              <ul className="space-y-4">
                {articles.map((article, idx) => (
                  <li key={idx} className="bg-gray-100 dark:bg-gray-700 rounded p-4 flex flex-col sm:flex-row sm:items-center gap-2">
                    {article.image && (
                      <img src={article.image} alt={article.title} className="w-16 h-16 object-cover rounded border mb-2 sm:mb-0" />
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
                  </li>
                ))}
              </ul>
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
