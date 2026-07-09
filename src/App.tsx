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

// ==========================================
// CLIENT-SIDE SANDBOX MODE FOR IFRAMES
// ==========================================

const getMockDB = () => {
  const existing = localStorage.getItem("sfr_mock_db");
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {}
  }
  
  const defaultDB = {
    users: [
      { id: "usr_active", email: "creator@saas.com", name: "Alex Rivera", createdAt: "2026-07-05T14:41:21.070Z" }
    ],
    instagram_accounts: [
      {
        id: "acc_editorial",
        userId: "usr_active",
        username: "editorial.aesthetic",
        displayName: "Editorial Aesthetic 🏺",
        accessToken: "EA_MOCK_ACCESS_TOKEN_XYZ123",
        profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        createdAt: "2026-07-05T14:41:21.070Z"
      },
      {
        id: "acc_minimalist",
        userId: "usr_active",
        username: "minimalist.curations",
        displayName: "Minimalist Curations 🪵",
        accessToken: "MC_MOCK_ACCESS_TOKEN_ABC789",
        profilePictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        createdAt: "2026-07-06T10:15:30.000Z"
      }
    ],
    media: [
      {
        id: "med_1",
        userId: "usr_active",
        suggestedName: "linen_drape_curator",
        mediaUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        createdAt: "2026-07-05T14:41:21.070Z"
      },
      {
        id: "med_2",
        userId: "usr_active",
        suggestedName: "clay_vessel_minimal",
        mediaUrl: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&auto=format&fit=crop&q=80",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        createdAt: "2026-07-06T09:30:15.000Z"
      },
      {
        id: "med_3",
        userId: "usr_active",
        suggestedName: "scandic_lounge_soft",
        mediaUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        createdAt: "2026-07-07T12:00:00.000Z"
      }
    ],
    scheduled_posts: [
      {
        id: "post_1",
        userId: "usr_active",
        instagramAccountId: "acc_editorial",
        caption: "A quiet space for contemplation. Let the morning light linger on the clay and the cloth. ✨☕️\n\n#slowliving #warmminimalism #aesthetic",
        mediaUrls: ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80"],
        scheduledTime: new Date(Date.now() + 3600000 * 2).toISOString(),
        status: "scheduled",
        createdAt: "2026-07-08T15:20:00.000Z"
      },
      {
        id: "post_2",
        userId: "usr_active",
        instagramAccountId: "acc_minimalist",
        caption: "Raw textures and pure forms. Curation is the art of subtraction.\n\n#designphilosophy #interiorstyling #architecture",
        mediaUrls: ["https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&auto=format&fit=crop&q=80"],
        scheduledTime: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: "published",
        createdAt: "2026-07-08T10:00:00.000Z"
      }
    ],
    settings: {
      timezone: "UTC",
      isBotConnected: true,
      lastHeartbeat: new Date().toISOString(),
      appPublicUrl: window.location.origin,
      customWebhookUrl: "https://sfrwebhook.vercel.app/api/webhook",
      manychatBranding: true
    },
    autoreply_rules: [
      {
        id: "rule_price",
        triggerType: "keyword",
        keywords: ["price", "cost", "pricing", "how much"],
        replyTemplate: "Hello! Our curated collections start at $45. View the full catalog at details.sfrdigitech.com 🏺",
        isActive: true,
        matchCount: 14,
        createdAt: "2026-07-05T14:41:21.070Z"
      },
      {
        id: "rule_collab",
        triggerType: "keyword",
        keywords: ["collab", "work", "partner", "feature"],
        replyTemplate: "We love collaborating with like-minded creators. Please send us your portfolio at collab@sfrdigitech.com! ✨",
        isActive: true,
        matchCount: 8,
        createdAt: "2026-07-06T11:00:00.000Z"
      }
    ],
    autoreply_messages: [
      {
        id: "msg_1",
        username: "clara_design",
        commentId: "c_12345678",
        mediaId: "m_9876543",
        incomingText: "how much for the clay vase?",
        outgoingText: "Hello! Our curated collections start at $45. View the full catalog at details.sfrdigitech.com 🏺",
        matchedRuleId: "rule_price",
        status: "delivered",
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    autoreply_leads: [
      {
        id: "lead_1",
        username: "clara_design",
        fullName: "Clara Benson",
        interestType: "price",
        lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
        status: "nurtured"
      }
    ],
    publish_logs: [
      {
        id: "log_1",
        userId: "usr_active",
        logType: "info",
        message: "Automated scheduler daemon running on high-priority loop.",
        createdAt: new Date(Date.now() - 60000).toISOString()
      }
    ]
  };
  localStorage.setItem("sfr_mock_db", JSON.stringify(defaultDB));
  return defaultDB;
};

const mockFetch = async (url: string, options: any = {}) => {
  const db = getMockDB();
  const path = url.split("?")[0];
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;

  const save = (updated: any) => localStorage.setItem("sfr_mock_db", JSON.stringify(updated));

  await new Promise(r => setTimeout(r, 150));

  let status = 200;
  let data: any = null;

  if (path === "/api/auth/session") {
    data = { user: db.users[0] };
  } else if (path === "/api/auth/login" || path === "/api/auth/register") {
    data = { success: true, user: db.users[0] };
  } else if (path === "/api/auth/logout") {
    data = { success: true };
  } else if (path === "/api/accounts") {
    if (method === "GET") {
      data = db.instagram_accounts;
    }
  } else if (path.startsWith("/api/accounts/")) {
    const id = path.split("/").pop();
    if (method === "DELETE") {
      db.instagram_accounts = db.instagram_accounts.filter((a: any) => a.id !== id);
      save(db);
      data = { success: true };
    } else if (method === "GET") {
      data = db.instagram_accounts.find((a: any) => a.id === id) || db.instagram_accounts[0];
    }
  } else if (path === "/api/connect-oauth") {
    const newAccount = {
      id: "acc_" + Math.random().toString(36).substring(2, 11),
      userId: "usr_active",
      username: body.username || "custom_curator",
      displayName: (body.username || "Custom Curator") + " ✨",
      accessToken: "MOCK_TOKEN_" + Math.random().toString(36).toUpperCase().substring(2, 11),
      profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      createdAt: new Date().toISOString()
    };
    db.instagram_accounts.push(newAccount);
    save(db);
    data = newAccount;
  } else if (path === "/api/media-library") {
    data = db.media;
  } else if (path.startsWith("/api/media-library/")) {
    if (method === "DELETE") {
      const id = path.split("/").pop();
      db.media = db.media.filter((m: any) => m.id !== id);
      save(db);
      data = { success: true };
    }
  } else if (path === "/api/upload-media") {
    const newAsset = {
      id: "med_" + Math.random().toString(36).substring(2, 11),
      userId: "usr_active",
      suggestedName: body?.suggestedName || "uploaded_mood",
      mediaUrl: body?.mediaUrl || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
      mediaType: body?.mediaType || "IMAGE",
      mimeType: body?.mimeType || "image/jpeg",
      createdAt: new Date().toISOString()
    };
    db.media.push(newAsset);
    save(db);
    data = newAsset;
  } else if (path === "/api/posts") {
    if (method === "GET") {
      data = { posts: db.scheduled_posts };
    } else if (method === "POST") {
      const newPost = {
        id: "post_" + Math.random().toString(36).substring(2, 11),
        userId: "usr_active",
        instagramAccountId: body.instagramAccountId || db.instagram_accounts[0]?.id || "acc_editorial",
        caption: body.caption,
        mediaUrls: body.mediaUrls || [],
        scheduledTime: body.scheduledFor,
        status: "scheduled",
        createdAt: new Date().toISOString()
      };
      db.scheduled_posts.push(newPost);
      
      db.publish_logs.unshift({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        userId: "usr_active",
        logType: "info",
        message: `Successfully scheduled new post to @${db.instagram_accounts.find((a: any) => a.id === newPost.instagramAccountId)?.username || "account"}`,
        createdAt: new Date().toISOString()
      });

      save(db);
      data = newPost;
    }
  } else if (path.startsWith("/api/posts/")) {
    const segments = path.split("/");
    const id = segments[3];
    if (method === "DELETE") {
      db.scheduled_posts = db.scheduled_posts.filter((p: any) => p.id !== id);
      save(db);
      data = { success: true };
    } else if (path.endsWith("/duplicate") && method === "POST") {
      const pToDup = db.scheduled_posts.find((p: any) => p.id === id);
      if (pToDup) {
        const dup = {
          ...pToDup,
          id: "post_" + Math.random().toString(36).substring(2, 11),
          caption: pToDup.caption + " (Copy)",
          scheduledTime: new Date(Date.now() + 3600000 * 24).toISOString(),
          status: "scheduled",
          createdAt: new Date().toISOString()
        };
        db.scheduled_posts.push(dup);
        save(db);
        data = dup;
      } else {
        status = 404;
        data = { error: "Post not found" };
      }
    } else if (method === "PUT") {
      db.scheduled_posts = db.scheduled_posts.map((p: any) => p.id === id ? { ...p, ...body } : p);
      save(db);
      data = db.scheduled_posts.find((p: any) => p.id === id);
    }
  } else if (path === "/api/bot/logs") {
    data = db.publish_logs;
  } else if (path === "/api/bot/clear-logs") {
    db.publish_logs = [];
    save(db);
    data = { success: true };
  } else if (path === "/api/bot/settings" || path === "/api/instagram/subscribe-webhook" || path === "/api/bot/diagnostics") {
    if (method === "GET") {
      data = { ...db.settings, botStatus: "online", webhookConnected: true };
    } else {
      db.settings = { ...db.settings, ...body };
      save(db);
      data = db.settings;
    }
  } else if (path === "/api/autoreply/rules") {
    if (method === "GET") {
      data = db.autoreply_rules;
    } else {
      const newRule = {
        id: "rule_" + Math.random().toString(36).substring(2, 11),
        keywords: body.keywords || [],
        triggerType: "keyword",
        replyTemplate: body.replyTemplate,
        isActive: true,
        matchCount: 0,
        createdAt: new Date().toISOString()
      };
      db.autoreply_rules.push(newRule);
      save(db);
      data = newRule;
    }
  } else if (path.startsWith("/api/autoreply/rules/")) {
    const id = path.split("/").pop();
    if (method === "DELETE") {
      db.autoreply_rules = db.autoreply_rules.filter((r: any) => r.id !== id);
      save(db);
      data = { success: true };
    } else if (method === "POST" || method === "PUT") {
      db.autoreply_rules = db.autoreply_rules.map((r: any) => r.id === id ? { ...r, ...body } : r);
      save(db);
      data = db.autoreply_rules.find((r: any) => r.id === id);
    }
  } else if (path === "/api/autoreply/messages") {
    data = db.autoreply_messages;
  } else if (path === "/api/autoreply/leads") {
    data = db.autoreply_leads;
  } else if (path.startsWith("/api/autoreply/leads/")) {
    if (method === "DELETE") {
      const id = path.split("/").pop();
      db.autoreply_leads = db.autoreply_leads.filter((l: any) => l.id !== id);
      save(db);
      data = { success: true };
    }
  } else if (path === "/api/autoreply/clear-leads") {
    db.autoreply_leads = [];
    save(db);
    data = { success: true };
  } else if (path === "/api/autoreply/clear-messages") {
    db.autoreply_messages = [];
    save(db);
    data = { success: true };
  } else if (path === "/api/autoreply/simulate") {
    const incomingText = body.incomingText || "price list";
    const username = body.username || "simulated_user";
    const rule = db.autoreply_rules.find((r: any) => 
      r.isActive && r.keywords.some((kw: string) => incomingText.toLowerCase().includes(kw.toLowerCase()))
    );

    const reply = rule ? rule.replyTemplate : "Thanks for your comment! We will reach out shortly.";
    if (rule) {
      rule.matchCount = (rule.matchCount || 0) + 1;
    }

    const newMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      username,
      commentId: "c_" + Math.random().toString(36).substring(2, 11),
      mediaId: "m_" + Math.random().toString(36).substring(2, 11),
      incomingText,
      outgoingText: reply,
      matchedRuleId: rule ? rule.id : null,
      status: "delivered",
      createdAt: new Date().toISOString()
    };
    db.autoreply_messages.unshift(newMsg);

    if (!db.autoreply_leads.some((l: any) => l.username.toLowerCase() === username.toLowerCase())) {
      db.autoreply_leads.unshift({
        id: "lead_" + Math.random().toString(36).substring(2, 11),
        username,
        fullName: username.split("_").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
        interestType: rule ? rule.id.replace("rule_", "") : "general",
        lastMessageAt: new Date().toISOString(),
        status: "captured"
      });
    } else {
      db.autoreply_leads = db.autoreply_leads.map((l: any) => 
        l.username.toLowerCase() === username.toLowerCase() 
          ? { ...l, lastMessageAt: new Date().toISOString() } 
          : l
      );
    }

    save(db);
    data = { success: true, message: newMsg };
  } else if (path === "/api/gemini/generate-caption") {
    const words = ["slow afternoon", "terracotta tones", "curated space", "morning light", "linen drape", "tactile textures", "scandinavian design", "quiet moments"];
    const randomWords = [...words].sort(() => 0.5 - Math.random()).slice(0, 3).join(", ");
    data = {
      caption: `Capturing the perfect harmony of ${randomWords}. Embracing raw organic beauty and warm minimalist design. 🏺🍂\n\n#warmminimalism #interiorcurator #slowliving`
    };
  } else {
    data = { success: true };
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: {
      get: (h: string) => h.toLowerCase() === "content-type" ? "application/json" : null
    }
  } as any;
};

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem("sfr_demo_active") === "true";
  });
  const [copied, setCopied] = useState(false);

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

  // Replace fetch if demo mode is enabled
  useEffect(() => {
    if (isDemoMode) {
      const originalFetch = window.fetch;
      window.fetch = mockFetch as any;
      const db = getMockDB();
      setCurrentUser(db.users[0]);
      setAccounts(db.instagram_accounts);
      setMedia(db.media);
      setPosts(db.scheduled_posts);
      setLogs(db.publish_logs);
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [isDemoMode]);

  // Fetch Session on Startup
  const checkSession = async () => {
    if (isDemoMode) return;
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
    if (isDemoMode) {
      const db = getMockDB();
      setAccounts(db.instagram_accounts);
      setMedia(db.media);
      setPosts(db.scheduled_posts);
      setLogs(db.publish_logs);
      return;
    }
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
      const iv = setInterval(refreshDatabase, 6000);
      return () => clearInterval(iv);
    }
  }, [currentUser, postsTrigger]);

  const handleEnterDemoMode = () => {
    localStorage.setItem("sfr_demo_active", "true");
    setIsDemoMode(true);
    const db = getMockDB();
    setCurrentUser(db.users[0]);
    setAccounts(db.instagram_accounts);
    setMedia(db.media);
    setPosts(db.scheduled_posts);
    setLogs(db.publish_logs);
  };

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
      if (isDemoMode) {
        localStorage.removeItem("sfr_demo_active");
        setIsDemoMode(false);
        setCurrentUser(null);
        window.location.reload();
        return;
      }
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
              <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl flex flex-col space-y-2.5">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
                {authError.includes("Failed to communicate") && (
                  <div className="text-[11px] text-zinc-400 pl-6 space-y-2">
                    <p>
                      This is usually caused by your browser blocking <strong>third-party cookies</strong> inside the Google AI Studio preview iframe.
                    </p>
                    <p>
                      To fix this, copy the direct URL below and open it in a new browser tab/window:
                    </p>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={window.location.origin}
                        className="bg-[#09090b] border border-[#27272a] text-[10px] font-mono text-zinc-400 rounded px-2.5 py-1.5 w-full select-all focus:outline-none"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white text-[10px] font-mono font-bold rounded transition shrink-0"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
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

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-[#E1306C] to-[#833AB4] hover:opacity-95 text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  {authTab === "login" ? "Enter Control Center" : "Initialize SaaS Profile"}
                </button>

                <button
                  type="button"
                  onClick={handleEnterDemoMode}
                  className="w-full py-3 border border-[#27272a] hover:bg-[#121214] hover:border-zinc-700 text-amber-500 hover:text-amber-400 text-[10px] font-black uppercase tracking-widest font-mono rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>✨ Bypass & Enter Demo Sandbox</span>
                </button>
              </div>
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
            {isDemoMode && (
              <div className="bg-amber-950/20 border-b border-amber-900/30 px-8 py-2.5 text-[11px] text-amber-500 font-mono flex items-center justify-between z-40">
                <span className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>✨ <strong>Demo Sandbox Mode Active</strong> — Connection simulated inside iframe. Changes are saved locally.</span>
                </span>
                <button 
                  onClick={() => {
                    localStorage.removeItem("sfr_demo_active");
                    window.location.reload();
                  }}
                  className="underline text-amber-400 hover:text-amber-300 font-bold transition-all shrink-0 cursor-pointer"
                >
                  Connect Real Database
                </button>
              </div>
            )}
            
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
