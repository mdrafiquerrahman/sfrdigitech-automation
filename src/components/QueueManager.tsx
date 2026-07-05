import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Search, 
  Filter, 
  Trash2, 
  Copy, 
  Edit3, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Eye, 
  Layers, 
  Image as ImageIcon, 
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { ScheduledPost, InstagramAccount } from "../types";

interface QueueManagerProps {
  accounts: InstagramAccount[];
  postsUpdatedTrigger: number;
  onPostAction: () => void;
  onSelectPostPreview: (post: ScheduledPost) => void;
}

export default function QueueManager({ accounts, postsUpdatedTrigger, onPostAction, onSelectPostPreview }: QueueManagerProps) {
  // Query state
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed" | "failed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Content states
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit inline states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedTime, setEditedTime] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams({
        status: activeTab,
        search: searchTerm,
        accountId: selectedAccountId,
        page: String(currentPage),
        limit: "5"
      });

      const res = await fetch(`/api/posts?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.totalItems || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, searchTerm, selectedAccountId, currentPage, postsUpdatedTrigger]);

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
      return;
    }
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchPosts();
        onPostAction();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        fetchPosts();
        onPostAction();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditing = (post: ScheduledPost) => {
    setEditingPostId(post.id);
    setEditedCaption(post.caption);
    
    // Format the date to local datetime string format for inputs
    const pDate = new Date(post.scheduledFor);
    const tzOffset = pDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(pDate.getTime() - tzOffset)).toISOString().slice(0, 16);
    setEditedTime(localISOTime);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editedCaption,
          scheduledFor: new Date(editedTime).toISOString()
        })
      });

      if (res.ok) {
        setEditingPostId(null);
        fetchPosts();
        onPostAction();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-emerald-950/40 text-emerald-450 border border-emerald-900/30">
            <CheckCircle size={10} />
            <span>Published</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-rose-950/40 text-rose-400 border border-rose-900/30">
            <XCircle size={10} />
            <span>Failed</span>
          </span>
        );
      case "publishing":
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-blue-950/40 text-blue-400 border border-blue-900/30 animate-pulse">
            <Clock size={10} />
            <span>Posting...</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-amber-950/40 text-amber-500 border border-amber-900/30">
            <Clock size={10} />
            <span>Scheduled</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title block */}
      <div className="border-b border-[#27272a] pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Scheduled Queue</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Explore, search, filter, edit, or duplicate database records.</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Node account Filter */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-zinc-300 rounded-lg pl-3 pr-8 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all">All Creator Nodes</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>@{a.username}</option>
              ))}
            </select>
            <ChevronDown size={11} className="text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search caption text */}
          <div className="relative">
            <Search className="text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" size={12} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search captions..."
              className="bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-white rounded-lg pl-8 pr-3 py-2 w-44 focus:outline-none focus:border-[#E1306C]"
            />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#27272a] pb-px">
        {[
          { id: "all", label: "All Items" },
          { id: "pending", label: "Pending" },
          { id: "completed", label: "Published Feed" },
          { id: "failed", label: "Failures" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`pb-3 px-4 text-[10px] font-bold uppercase tracking-wider font-mono border-b-2 transition cursor-pointer ${
                isActive
                  ? "border-[#E1306C] text-[#E1306C]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Queue Items Loop */}
      <div className="space-y-4">
        {isLoading ? (
          // Beautiful Loading Skeletons
          Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="p-5 border border-[#27272a]/60 rounded-xl bg-[#09090b]/20 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div className="h-3.5 w-24 bg-zinc-800 rounded" />
                </div>
                <div className="h-6 w-16 bg-zinc-800 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-zinc-800 rounded" />
              <div className="h-10 w-full bg-zinc-800 rounded-lg" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#27272a] rounded-xl bg-[#09090b]/10">
            <span className="text-xs text-zinc-500 font-mono block">No scheduled posts found matching criteria.</span>
          </div>
        ) : (
          posts.map((post) => {
            const PostIcon = post.type === "photo" ? ImageIcon : post.type === "carousel" ? Layers : PlayCircle;
            const isEditing = editingPostId === post.id;

            return (
              <div
                key={post.id}
                className="p-5 border border-[#27272a] rounded-xl bg-[#09090b]/40 hover:border-zinc-800 transition flex flex-col md:flex-row md:items-start gap-4"
              >
                {/* Media thumbnail card */}
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-[#27272a] bg-black shrink-0 relative">
                  <img src={post.mediaUrls[0]} alt="Thumbnail" className="w-full h-full object-cover" />
                  {post.mediaUrls.length > 1 && (
                    <div className="absolute top-1 right-1 bg-black/85 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-md border border-zinc-800">
                      +{post.mediaUrls.length - 1} slider
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 p-1 bg-black/75 rounded text-white border border-zinc-800">
                    <PostIcon size={10} />
                  </div>
                </div>

                {/* Post details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-white">@{post.instagramAccountUsername}</span>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">({post.type})</span>
                    </div>
                    <div>{getStatusBadge(post.status)}</div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-1">
                      <textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        rows={2}
                        className="w-full bg-[#09090b] border border-[#27272a] text-xs font-mono text-white rounded-lg p-2.5 focus:outline-none focus:border-[#E1306C]"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">Change Time:</span>
                          <input
                            type="datetime-local"
                            value={editedTime}
                            onChange={(e) => setEditedTime(e.target.value)}
                            className="bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-white rounded p-1"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-mono uppercase tracking-wider rounded transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(post.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono uppercase tracking-wider rounded transition cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 whitespace-pre-wrap font-mono">
                        {post.caption}
                      </p>

                      <div className="flex flex-wrap items-center text-[10px] text-zinc-500 font-mono pt-1 gap-x-4 gap-y-1">
                        <span className="flex items-center space-x-1">
                          <Clock size={11} className="text-zinc-600" />
                          <span>Release: {new Date(post.scheduledFor).toLocaleString()} ({post.timezone})</span>
                        </span>
                        {post.instagramId && (
                          <span className="flex items-center space-x-1 text-emerald-450 font-bold">
                            <CheckCircle size={11} />
                            <span>Feed ID: {post.instagramId}</span>
                          </span>
                        )}
                        {post.error && (
                          <span className="flex items-center space-x-1 text-rose-450 font-bold">
                            <XCircle size={11} />
                            <span>Error: {post.error}</span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="flex md:flex-col items-center justify-end gap-1.5 border-t md:border-t-0 md:border-l border-[#27272a] pt-3.5 md:pt-0 md:pl-4 shrink-0">
                  <button
                    onClick={() => onSelectPostPreview(post)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-[#27272a] transition flex items-center justify-center cursor-pointer"
                    title="Live IG Mockup Preview"
                  >
                    <Eye size={12} />
                  </button>

                  {post.status === "pending" && (
                    <button
                      onClick={() => handleStartEditing(post)}
                      disabled={isEditing}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-[#27272a] transition flex items-center justify-center cursor-pointer"
                      title="Edit Schedule Configurations"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDuplicate(post.id)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-[#27272a] transition flex items-center justify-center cursor-pointer"
                    title="Duplicate Scheduled Block"
                  >
                    <Copy size={12} />
                  </button>

                  <button
                    onClick={() => handleDelete(post.id)}
                    className={`p-2 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                      deleteConfirmId === post.id
                        ? "bg-rose-600 border-rose-500 text-white animate-pulse scale-105"
                        : "bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border-[#27272a]"
                    }`}
                    title={deleteConfirmId === post.id ? "Click again to confirm delete!" : "Delete / De-schedule Post"}
                  >
                    {deleteConfirmId === post.id ? <CheckCircle size={12} /> : <Trash2 size={12} />}
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 border-t border-[#27272a] text-[10px] font-mono text-zinc-500 uppercase">
          <span>Total records: {totalItems}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-[#1c1c20] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-[#1c1c20] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
