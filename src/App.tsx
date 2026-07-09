import React, { useState, useEffect } from "react";
import { 
  Instagram, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Key, 
  Clock, 
  AlertCircle,
  Eye,
  CheckCircle,
  X,
  UserCheck,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, InstagramAccount, MediaAsset, ScheduledPost, PublishLog } from "./types";

// Modular Imports
import Sidebar from "./components/Sidebar";
import DashboardOverview from "./components/DashboardOverview";
import AutoReplyPanel from "./components/AutoReplyPanel";
import PostComposer from "./components/PostComposer";
import CalendarView from "./components/CalendarView";
import QueueManager from "./components/QueueManager";
import MediaLibrary from "./components/MediaLibrary";
import PythonServicePanel from "./components/PythonServicePanel";
import CodeExplorer from "./components/CodeExplorer";
import SettingsPanel from "./components/SettingsPanel";
import OAuthModal from "./components/OAuthModal";
import InstagramPreview from "./components/InstagramPreview";

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  // App Layout navigation
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "composer" | "calendar" | "autoreply" | "queue" | "media" | "daemon" | "code" | "settings"
  >("dashboard");

  // Database lists
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [postsTrigger, setPostsTrigger] = useState(0);

  // Time ticking clock state
  const [clockStr, setClockStr] = useState("");

  // Prefilled date for Calendar selection to Composer
  const [prefilledComposerDate, setPrefilledComposerDate] = useState<string | undefined>(undefined);

  // Modal open states
  const [isOAuthOpen, setIsOAuthOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);

  // Clock updating loop
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockStr(d.toLocaleTimeString([], { hour12: false }));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Fetch Session on Startup
  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pull all database list elements
  const refreshDatabase = async () => {
    try {
      const [accRes, medRes, postsRes, logsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/media-library"),
        fetch("/api/posts?status=all&limit=100"),
        fetch("/api/bot/logs")
      ]);

      const isJson = (res: Response) => {
        const ct = res.headers.get("content-type");
        return ct ? ct.includes("application/json") : false;
      };

      if (accRes.ok && isJson(accRes)) {
        setAccounts(await accRes.json());
      }
      if (medRes.ok && isJson(medRes)) {
        setMedia(await medRes.json());
      }
      if (postsRes.ok && isJson(postsRes)) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
      if (logsRes.ok && isJson(logsRes)) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      console.error("Failed to sync client state with database:", err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshDatabase();
      // Periodically poll database every 6 seconds for live scheduler daemon events simulation
      const iv = setInterval(refreshDatabase, 6000);
      return () => clearInterval(iv);
    }
  }, [currentUser, postsTrigger]);

  // Auth submits
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail || !authPassword) {
      setAuthError("Please fill in email and password credentials.");
      return;
    }

    const endpoint = authTab === "register" ? "/api/auth/register" : "/api/auth/login";
    const bodyPayload = authTab === "register" 
      ? { email: authEmail, password: authPassword, name: authName }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        refreshDatabase();
      } else {
        const data = await res.json();
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setAuthError("Failed to communicate with authentication server.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setAccounts([]);
      setMedia([]);
      setPosts([]);
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  // OAuth connect handler
  const handleOAuthConnect = async (accData: { 
    username: string; 
    displayName: string; 
    profilePicture?: string;
    isReal?: boolean;
    instagramBusinessAccountId?: string;
    accessToken?: string;
    messagingAccessToken?: string;
  }) => {
    try {
      const res = await fetch("/api/connect-oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accData)
      });

      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Disconnect OAuth node
  const handleDisconnectAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalendarSelectDate = (dateStr: string) => {
    setPrefilledComposerDate(dateStr);
    setActiveTab("composer");
  };

  const triggerPostActionSync = () => {
    setPostsTrigger(prev => prev + 1);
  };

  // Clear python daemon log table
  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/bot/clear-logs", { method: "POST" });
      if (res.ok) {
        refreshDatabase();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex font-sans antialiased">
      
      {/* AUTHENTICATION GATE */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-radial from-zinc-900 to-black">
          {/* Neon background circle glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E1306C]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#121214] border border-[#27272a] rounded-2xl p-8 shadow-2xl space-y-6 relative z-10"
          >
            {/* SaaS Banner */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-stone-700 via-stone-850 to-stone-950 flex items-center justify-center mx-auto shadow-lg border border-stone-800">
                <Instagram size={24} className="text-white animate-pulse" />
              </div>
              <h1 className="text-xl font-black font-display tracking-tight text-white uppercase pt-2">
                SFR DigiTech<span className="text-stone-400">.Automation</span>
              </h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Premium Publishing Control Center</p>
            </div>

            {/* Auth Tab Picker */}
            <div className="grid grid-cols-2 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
              <button
                onClick={() => { setAuthTab("login"); setAuthError(""); }}
                className={`py-2 text-[10px] font-black uppercase tracking-widest font-mono rounded-lg transition duration-150 cursor-pointer ${
                  authTab === "login" ? "bg-[#E1306C] text-white" : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthTab("register"); setAuthError(""); }}
                className={`py-2 text-[10px] font-black uppercase tracking-widest font-mono rounded-lg transition duration-150 cursor-pointer ${
                  authTab === "register" ? "bg-[#E1306C] text-white" : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex flex-col space-y-2">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
                {authError.includes("Failed to communicate") && (
                  <div className="text-[11px] text-zinc-400 pl-6 space-y-1.5">
                    <p>
                      This is usually caused by your browser blocking <strong>third-party cookies</strong> inside the Google AI Studio preview iframe.
                    </p>
                    <p>
                      To fix this, please open the application directly in a new tab:
                    </p>
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#E1306C] hover:opacity-90 text-white font-mono text-[10px] uppercase tracking-widest font-black rounded-lg transition-all"
                    >
                      <span>🚀 Open in New Tab</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authTab === "register" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#E1306C]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="creator@saas.com"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#E1306C]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#E1306C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#E1306C] to-[#833AB4] hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                {authTab === "login" ? "Enter Control Center" : "Initialize SaaS Profile"}
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-[10px] text-zinc-650 font-mono flex items-center justify-center space-x-1 uppercase">
                <Lock size={10} />
                <span>Encrypted secure channel</span>
              </span>
            </div>
          </motion.div>
        </div>
      ) : (
        
        // SECURE PLATFORM INTERFACE
        <div className="flex-1 flex">
          {/* Sidebar Left navigation */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab !== "composer") {
                setPrefilledComposerDate(undefined); // Clear prefilled date on tab shift
              }
            }}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenOAuth={() => setIsOAuthOpen(true)}
          />

          {/* Main workspace container */}
          <main className="flex-1 min-w-0 pl-64 flex flex-col min-h-screen">
            
            {/* Dynamic workspace header */}
            <header className="h-16 border-b border-[#27272a] px-8 flex justify-between items-center bg-[#09090b] z-30">
              <div className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">
                  Prisma schema synchronization: online
                </span>
              </div>

              {/* GMT Clock display */}
              <div className="flex items-center space-x-2 text-zinc-450 font-mono text-[10px] uppercase bg-[#121214] border border-[#27272a] px-3.5 py-1.5 rounded-xl">
                <Clock size={11} className="text-zinc-500" />
                <span>UTC CLOCK: {clockStr}</span>
              </div>
            </header>

            {/* Dynamic pages viewport render */}
            <div className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "dashboard" && (
                    <DashboardOverview
                      accounts={accounts}
                      logs={logs}
                      onDisconnectAccount={handleDisconnectAccount}
                      onOpenOAuth={() => setIsOAuthOpen(true)}
                      onNavigateToTab={(tab) => setActiveTab(tab as any)}
                      onRefresh={refreshDatabase}
                    />
                  )}

                  {activeTab === "composer" && (
                    <PostComposer
                      accounts={accounts}
                      mediaLibrary={media}
                      prefilledDate={prefilledComposerDate}
                      onPostScheduled={() => {
                        triggerPostActionSync();
                        setActiveTab("queue");
                      }}
                      onDeleteAsset={refreshDatabase}
                    />
                  )}

                  {activeTab === "calendar" && (
                    <CalendarView
                      posts={posts}
                      onSelectPost={(p) => setPreviewPost(p)}
                      onSelectDateToCreate={handleCalendarSelectDate}
                    />
                  )}

                  {activeTab === "autoreply" && (
                    <AutoReplyPanel
                      accounts={accounts}
                    />
                  )}

                  {activeTab === "queue" && (
                    <QueueManager
                      accounts={accounts}
                      postsUpdatedTrigger={postsTrigger}
                      onPostAction={triggerPostActionSync}
                      onSelectPostPreview={(p) => setPreviewPost(p)}
                    />
                  )}

                  {activeTab === "media" && (
                    <MediaLibrary
                      media={media}
                      onUploadSuccess={refreshDatabase}
                    />
                  )}

                  {activeTab === "daemon" && (
                    <PythonServicePanel
                      logs={logs}
                      onClearLogs={handleClearLogs}
                      onRefresh={refreshDatabase}
                    />
                  )}

                  {activeTab === "code" && (
                    <CodeExplorer />
                  )}

                  {activeTab === "settings" && (
                    <SettingsPanel
                      onRefresh={refreshDatabase}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* SIMULATED OAUTH link MODAL */}
          <OAuthModal
            isOpen={isOAuthOpen}
            onClose={() => setIsOAuthOpen(false)}
            onConnect={handleOAuthConnect}
          />

          {/* INSTAGRAM LIVE SIMULATOR POPUP PREVIEW */}
          {previewPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm bg-[#121214] border border-[#27272a] rounded-2xl overflow-hidden relative shadow-2xl"
              >
                {/* Close Button top-right */}
                <button
                  onClick={() => setPreviewPost(null)}
                  className="absolute top-4 right-4 z-50 p-2 bg-black/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition cursor-pointer"
                >
                  <X size={15} />
                </button>

                <div className="p-6">
                  <InstagramPreview
                    post={{
                      type: previewPost.type,
                      caption: previewPost.caption,
                      media: previewPost.mediaUrls
                    }}
                    username={previewPost.instagramAccountUsername || "creator"}
                  />
                </div>
              </motion.div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
