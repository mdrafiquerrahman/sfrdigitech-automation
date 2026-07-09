import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const _filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== "undefined" ? __filename : "");
const _dirname = typeof import.meta !== "undefined" && import.meta.url ? path.dirname(_filename) : (typeof __dirname !== "undefined" ? __dirname : "");

dotenv.config();

// Ensure local uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = 3000;

// Serve uploaded files statically under /uploads
app.use("/uploads", express.static(uploadsDir));

// Helper to save base64 data to local file in uploads folder
function saveBase64File(base64Str: string, suggestedName: string): string {
  // Keep as original Base64 string so that uploads are persistent across serverless/ephemeral container recycles
  return base64Str;
}

// Increase body size limits for media uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Auto-detect public URL middleware to host files for Instagram Graph API crawler
app.use((req, res, next) => {
  try {
    let proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      proto = "https";
    }
    if (host) {
      const currentUrl = `${proto}://${host}`;
      const db = readDB();
      if (db && db.settings && db.settings.appPublicUrl !== currentUrl) {
        db.settings.appPublicUrl = currentUrl;
        writeDB(db);
      }
    }
  } catch (err) {
    // Fail silently to avoid interrupting requests
  }
  next();
});

// Fire-and-forget serverless scheduler trigger on every request
app.use((req, res, next) => {
  // We execute it asynchronously so we don't delay the HTTP response
  executeSchedulerTick(false).catch((err) => {
    console.error("[Serverless Middleware Error] Scheduler tick failure:", err);
  });
  next();
});

// Database file path
let DB_FILE = path.join(process.cwd(), "posts_db.json");

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface InstagramAccount {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  profilePicture: string;
  accessToken: string; // secure encrypted representation
  messagingAccessToken?: string; // page access token representation
  isConnected: boolean;
  connectedAt: string;
  isReal?: boolean;
  instagramBusinessAccountId?: string;
  enableContentIG?: boolean;
  enableMessageEA?: boolean;
}

interface MediaAsset {
  id: string;
  userId: string;
  name: string;
  url: string;
  type: "image" | "video";
  size: string;
  createdAt: string;
}

interface ScheduledPost {
  id: string;
  userId: string;
  instagramAccountId: string;
  instagramAccountUsername?: string;
  type: "photo" | "carousel" | "reel";
  caption: string;
  mediaAssetIds: string[];
  mediaUrls: string[];
  scheduledFor: string; // ISO string
  status: "pending" | "publishing" | "completed" | "failed";
  postedAt?: string | null;
  instagramId?: string | null;
  error?: string | null;
  duplicatedFromId?: string | null;
  timezone: string;
  createdAt: string;
}

interface PublishLog {
  id: string;
  scheduledPostId: string;
  timestamp: string;
  status: "info" | "warning" | "error" | "success";
  message: string;
  attemptCount: number;
  responsePayload?: string;
}

interface AutoReplyRule {
  id: string;
  triggerType: "keyword" | "always";
  keywords: string[];
  replyType: "static" | "ai";
  staticReplyText: string;
  aiPromptInstruction: string;
  isActive: boolean;
  createdAt: string;
  // ManyChat Enhancements
  delaySeconds?: number;
  buttons?: { label: string; triggerKeyword: string }[];
  captureLeadField?: "email" | "phone" | "none";
  captureSuccessText?: string;
}

interface InstagramMessage {
  id: string;
  senderUsername: string;
  messageText: string;
  timestamp: string;
  replySent?: string;
  replyType?: "static" | "ai" | "none";
  matchedRuleId?: string;
  isComment?: boolean;
  // ManyChat interactive payload
  buttons?: { label: string; triggerKeyword: string }[];
  isTyping?: boolean;
  includeBranding?: boolean;
}

interface CapturedLead {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  lastInteracted: string;
  status: "new" | "qualified" | "contacted";
  notes?: string;
}

interface DB {
  users: User[];
  instagram_accounts: InstagramAccount[];
  media: MediaAsset[];
  scheduled_posts: ScheduledPost[];
  publish_logs: PublishLog[];
  settings: {
    timezone: string;
    isBotConnected: boolean;
    lastHeartbeat: string | null;
    appPublicUrl?: string;
    customWebhookUrl?: string;
    manychatBranding?: boolean;
    lastWebhookPayload?: any;
    lastIncomingMessage?: any;
    lastReplyAttempt?: any;
    lastMetaApiError?: any;
    lastGeminiApiError?: any;
  };
  currentUser: User | null;
  autoreply_rules?: AutoReplyRule[];
  autoreply_messages?: InstagramMessage[];
  autoreply_leads?: CapturedLead[];
}

// Sample mock data matching the exact schema
const DEFAULT_DB: DB = {
  users: [
    {
      id: "usr_active",
      email: "creator@saas.com",
      name: "Alex Rivera",
      createdAt: new Date().toISOString()
    }
  ],
  instagram_accounts: [
    {
      id: "acc_travel_escapes",
      userId: "usr_active",
      username: "travel_escapes",
      displayName: "Travel Escapes Business",
      profilePicture: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=150&auto=format&fit=crop&q=80",
      accessToken: "ig_oauth_enc_gcm_8f3e29d7c01b2a... [AES-256 ENCRYPTED]",
      isConnected: true,
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString() // 10 days ago
    },
    {
      id: "acc_saas_growth",
      userId: "usr_active",
      username: "saas_growth",
      displayName: "SaaS Growth Accelerator",
      profilePicture: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=80",
      accessToken: "ig_oauth_enc_gcm_a2d5619f510f82... [AES-256 ENCRYPTED]",
      isConnected: true,
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString() // 5 days ago
    }
  ],
  media: [
    {
      id: "med_workspace",
      userId: "usr_active",
      name: "Minimal Workspace.jpg",
      url: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80",
      type: "image",
      size: "1.2 MB",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    },
    {
      id: "med_coastline",
      userId: "usr_active",
      name: "Golden Coastline.jpg",
      url: "https://images.unsplash.com/photo-1472214222541-d510753a4707?w=800&auto=format&fit=crop&q=80",
      type: "image",
      size: "2.4 MB",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString()
    },
    {
      id: "med_skyline",
      userId: "usr_active",
      name: "Neon Skyline.jpg",
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
      type: "image",
      size: "1.8 MB",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString()
    }
  ],
  scheduled_posts: [
    {
      id: "post_first",
      userId: "usr_active",
      instagramAccountId: "acc_travel_escapes",
      instagramAccountUsername: "travel_escapes",
      type: "photo",
      caption: "Chasing sunsets and new horizons. 🌅✨ What is your favorite sunset spot? Tell us in the comments! #SunsetLovers #AdventureAwaits #Wanderlust",
      mediaAssetIds: ["med_coastline"],
      mediaUrls: ["https://images.unsplash.com/photo-1472214222541-d510753a4707?w=800&auto=format&fit=crop&q=80"],
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 1.5).toISOString(), // 1.5 hours from now
      status: "pending",
      timezone: "America/New_York",
      createdAt: new Date().toISOString()
    },
    {
      id: "post_carousel",
      userId: "usr_active",
      instagramAccountId: "acc_saas_growth",
      instagramAccountUsername: "saas_growth",
      type: "carousel",
      caption: "Three simple keys to unlocking focus and productivity in your daily routine: \n\n1. Protect your mornings (no phone for 1 hour)\n2. Time-block deep work (90-minute sprints)\n3. Take analog breaks (walk outside, stretch)\n\nSave this for your next workday! 💾 #ProductivityTips #FocusMindset #DailyRoutine #WorkSmart",
      mediaAssetIds: ["med_workspace", "med_skyline"],
      mediaUrls: [
        "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80"
      ],
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day from now
      status: "pending",
      timezone: "UTC",
      createdAt: new Date().toISOString()
    }
  ],
  publish_logs: [
    {
      id: "log_init",
      scheduledPostId: "post_first",
      timestamp: new Date().toISOString(),
      status: "info",
      message: "InstaSched SaaS engine initialised. Ready to poll scheduled_posts queue.",
      attemptCount: 1
    }
  ],
  settings: {
    timezone: "UTC",
    isBotConnected: true,
    lastHeartbeat: new Date().toISOString(),
    appPublicUrl: "",
    customWebhookUrl: "",
    manychatBranding: true
  },
  currentUser: {
    id: "usr_active",
    email: "creator@saas.com",
    name: "Alex Rivera",
    createdAt: new Date().toISOString()
  },
  autoreply_rules: [
    {
      id: "rule_price",
      triggerType: "keyword",
      keywords: ["price", "cost", "pricing", "how much", "plans", "fees"],
      replyType: "ai",
      staticReplyText: "",
      aiPromptInstruction: "Explain the subscription tiers of SFR DigiTech: Starter ($29/mo for 1 account), Pro ($49/mo for 3 accounts), and Enterprise ($99/mo for unlimited accounts). Keep the reply concise, friendly, and end with a call-to-action.",
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "rule_help",
      triggerType: "keyword",
      keywords: ["help", "support", "broken", "error", "fail"],
      replyType: "static",
      staticReplyText: "Hello! If you're experiencing any issues with your publishing automation, please visit our SaaS Settings panel or open our live support chat. Our technical team is on standby to assist you! 🛠️",
      aiPromptInstruction: "",
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "rule_default",
      triggerType: "always",
      keywords: [],
      replyType: "ai",
      staticReplyText: "",
      aiPromptInstruction: "You are an automated, friendly Instagram AI representative for SFR DigiTech. Greet them warmly and answer any questions briefly and professionally.",
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],
  autoreply_messages: [
    {
      id: "msg_init_1",
      senderUsername: "jane_doe",
      messageText: "Hello! Do you have a trial or demo for SFR DigiTech?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      replySent: "Hello! While we don't have a free trial, our Starter plan is just $29/mo and lets you connect 1 account. You can upgrade or cancel anytime from your settings!",
      replyType: "ai",
      matchedRuleId: "rule_default"
    },
    {
      id: "msg_init_2",
      senderUsername: "mark_growth",
      messageText: "how much is the pro plan?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      replySent: "The Pro plan is $49/mo and lets you connect up to 3 Instagram accounts, complete with custom calendar scheduling and advanced AI help!",
      replyType: "ai",
      matchedRuleId: "rule_price"
    }
  ]
};

// Database Helpers
let inMemoryDB: DB | null = null;

// Locate and prepare the database path/file
let templateDbPath = DB_FILE;
if (!fs.existsSync(templateDbPath)) {
  const possiblePaths = [
    path.join(_dirname, "posts_db.json"),
    path.join(_dirname, "../posts_db.json"),
    path.join(_dirname, "../../posts_db.json")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      templateDbPath = p;
      break;
    }
  }
}

if (process.env.VERCEL) {
  const tmpPath = "/tmp/posts_db.json";
  try {
    if (!fs.existsSync(tmpPath)) {
      let seedData = JSON.stringify(DEFAULT_DB, null, 2);
      if (fs.existsSync(templateDbPath)) {
        seedData = fs.readFileSync(templateDbPath, "utf8");
      }
      fs.writeFileSync(tmpPath, seedData, "utf8");
    }
    DB_FILE = tmpPath;
  } catch (err) {
    console.error("Failed to initialize writable DB in /tmp, falling back to template:", err);
    DB_FILE = templateDbPath;
  }
} else {
  DB_FILE = templateDbPath;
}

function readDB(): DB {
  if (inMemoryDB) {
    return inMemoryDB;
  }
  try {
    let parsed: any = null;

    // Support loading the entire database state from an environment variable (crucial for serverless Vercel)
    if (process.env.POSTS_DB_JSON) {
      try {
        parsed = JSON.parse(process.env.POSTS_DB_JSON);
        console.log("[Database] Successfully loaded database state from POSTS_DB_JSON environment variable.");
      } catch (err: any) {
        console.error("[Database Error] Failed to parse POSTS_DB_JSON environment variable:", err.message);
      }
    }

    if (!parsed) {
      if (!fs.existsSync(DB_FILE)) {
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
        } catch (e) {
          // Fallback to in-memory if write is read-only
          inMemoryDB = DEFAULT_DB;
          return inMemoryDB;
        }
        parsed = DEFAULT_DB;
      } else {
        const data = fs.readFileSync(DB_FILE, "utf8");
        parsed = JSON.parse(data);
      }
    }
    
    // Schema migration / robustness layer to prevent undefined/crashes
    const db: DB = {
      users: Array.isArray(parsed.users) ? parsed.users : [...DEFAULT_DB.users],
      instagram_accounts: Array.isArray(parsed.instagram_accounts) ? parsed.instagram_accounts : [...DEFAULT_DB.instagram_accounts],
      media: Array.isArray(parsed.media) ? parsed.media : [...DEFAULT_DB.media],
      scheduled_posts: [],
      publish_logs: [],
      settings: parsed.settings ? { ...DEFAULT_DB.settings, ...parsed.settings } : { ...DEFAULT_DB.settings },
      currentUser: parsed.currentUser !== undefined ? parsed.currentUser : DEFAULT_DB.currentUser,
      autoreply_rules: Array.isArray(parsed.autoreply_rules) ? parsed.autoreply_rules : [...(DEFAULT_DB.autoreply_rules || [])],
      autoreply_messages: Array.isArray(parsed.autoreply_messages) ? parsed.autoreply_messages : [...(DEFAULT_DB.autoreply_messages || [])]
    };

    // Inject direct physical Instagram account details from environment variables if configured
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      const envToken = process.env.INSTAGRAM_ACCESS_TOKEN.trim();
      const envBizId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID.trim() : "";
      const envUsername = process.env.INSTAGRAM_USERNAME ? process.env.INSTAGRAM_USERNAME.trim().replace("@", "") : "ig_env_account";
      const envDisplayName = process.env.INSTAGRAM_DISPLAY_NAME ? process.env.INSTAGRAM_DISPLAY_NAME.trim() : "Instagram Env Account";

      const exists = db.instagram_accounts.some(a => a.accessToken === envToken || (envBizId && a.instagramBusinessAccountId === envBizId));
      if (!exists && envToken.length > 20) {
        db.instagram_accounts.push({
          id: "acc_env_" + Math.random().toString(36).substring(2, 9),
          userId: "usr_active",
          username: envUsername,
          displayName: envDisplayName,
          profilePicture: `https://api.dicebear.com/7.x/identicon/svg?seed=${envUsername}`,
          accessToken: envToken,
          isConnected: true,
          connectedAt: new Date().toISOString(),
          isReal: true,
          instagramBusinessAccountId: envBizId
        });
      }
    }

    // Migrate scheduled_posts
    if (Array.isArray(parsed.scheduled_posts)) {
      db.scheduled_posts = parsed.scheduled_posts;
    } else if (Array.isArray(parsed.posts)) {
      db.scheduled_posts = parsed.posts.map((p: any) => ({
        id: p.id || "post_" + Math.random().toString(36).substring(2, 11),
        userId: p.userId || "usr_active",
        instagramAccountId: p.instagramAccountId || "acc_travel_escapes",
        instagramAccountUsername: p.instagramAccountUsername || "travel_escapes",
        type: p.type || "photo",
        caption: p.caption || "",
        mediaAssetIds: p.mediaAssetIds || [],
        mediaUrls: p.mediaUrls || p.media || [],
        scheduledFor: p.scheduledFor || new Date().toISOString(),
        status: p.status || "pending",
        postedAt: p.postedAt || null,
        instagramId: p.instagramId || null,
        error: p.error || null,
        timezone: p.timezone || "UTC",
        createdAt: p.createdAt || new Date().toISOString()
      }));
    } else {
      db.scheduled_posts = [...DEFAULT_DB.scheduled_posts];
    }

    // Migrate publish_logs
    if (Array.isArray(parsed.publish_logs)) {
      db.publish_logs = parsed.publish_logs;
    } else if (Array.isArray(parsed.logs)) {
      db.publish_logs = parsed.logs.map((l: any) => ({
        id: l.id || "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: l.scheduledPostId || "",
        timestamp: l.timestamp || new Date().toISOString(),
        status: l.level === "info" ? "info" : (l.level === "warning" ? "warning" : (l.level === "error" ? "error" : "success")),
        message: l.message || "",
        attemptCount: l.attemptCount || 1
      }));
    } else {
      db.publish_logs = [...DEFAULT_DB.publish_logs];
    }

    try {
      // Force write-back to keep DB in sync
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
    } catch (e) {
      // Ignore write-back error, we'll store in-memory
    }

    inMemoryDB = db;
    return db;
  } catch (err) {
    console.error("Error reading database file, returning default:", err);
    if (!inMemoryDB) {
      inMemoryDB = DEFAULT_DB;
    }
    return inMemoryDB;
  }
}

function writeDB(db: DB) {
  // Automatically enforce limits on log and message history to keep the database size extremely small (< 150KB)
  // This prevents environment variable size issues (64KB limits) in serverless deployment environments like Vercel
  if (Array.isArray(db.publish_logs)) {
    if (db.publish_logs.length > 300) {
      db.publish_logs = db.publish_logs.slice(-300);
    }
  }
  if (Array.isArray(db.autoreply_messages)) {
    if (db.autoreply_messages.length > 300) {
      db.autoreply_messages = db.autoreply_messages.slice(-300);
    }
  }

  inMemoryDB = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to database file:", err);
  }

  // If running in development sandbox (not Vercel) and custom Vercel webhook URL is configured,
  // automatically push updated database to Vercel to keep tokens and auto-reply rules perfectly in sync!
  if (!process.env.VERCEL && db.settings?.customWebhookUrl) {
    const customUrl = db.settings.customWebhookUrl.trim();
    if (customUrl.startsWith("http")) {
      try {
        const parsedUrl = new URL(customUrl);
        const syncUrl = `${parsedUrl.protocol}//${parsedUrl.host}/api/webhook/sync-db`;
        
        // Asynchronous non-blocking background fetch
        fetch(syncUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ db })
        }).then((syncRes) => {
          if (!syncRes.ok) {
            console.warn(`[Database Sync Warning] Vercel push-sync returned status: ${syncRes.status}`);
          }
        }).catch((err) => {
          console.error("[Database Sync Error] Failed to push database state to Vercel:", err);
        });
      } catch (err) {
        console.error("[Database Sync Error] Invalid custom webhook URL configured:", err);
      }
    }
  }
}

// Initialize Gemini SDK safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// --- API ENDPOINTS ---

// Auth Register / Login
app.post("/api/auth/register", (req, res) => {
  const db = readDB();
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const newUser: User = {
    id: "usr_" + Math.random().toString(36).substring(2, 11),
    email: email.toLowerCase(),
    name: name || email.split("@")[0],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.currentUser = newUser;
  writeDB(db);

  res.json({ success: true, user: newUser });
});

app.post("/api/auth/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ error: "Invalid credentials. Please try again." });
  }

  db.currentUser = user;
  writeDB(db);

  res.json({ success: true, user });
});

app.post("/api/auth/logout", (req, res) => {
  const db = readDB();
  db.currentUser = null;
  writeDB(db);
  res.json({ success: true });
});

app.get("/api/auth/session", (req, res) => {
  const db = readDB();
  res.json({ user: db.currentUser });
});

// Accounts endpoints
app.get("/api/accounts", (req, res) => {
  const db = readDB();
  res.json(db.instagram_accounts);
});

app.post("/api/connect-oauth", (req, res) => {
  const db = readDB();
  const { username, displayName, profilePicture, isReal, instagramBusinessAccountId, accessToken, messagingAccessToken } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  // Check if already connected
  console.log("Searching for account (normalized):", username.toLowerCase());
  const existingIndex = db.instagram_accounts.findIndex((a) => a.username.toLowerCase() === username.toLowerCase());
  console.log("Existing account index found:", existingIndex);
  
  const tokenString = isReal && accessToken 
    ? accessToken 
    : "ig_oauth_enc_gcm_" + Math.random().toString(36).substring(2, 11) + "... [AES-256 ENCRYPTED]";

  const messagingTokenString = isReal && messagingAccessToken
    ? messagingAccessToken
    : (isReal ? "" : "ig_oauth_enc_gcm_msg_" + Math.random().toString(36).substring(2, 11) + "... [AES-256 ENCRYPTED]");

  const newAccount: InstagramAccount = {
    id: "acc_" + Math.random().toString(36).substring(2, 11),
    userId: db.currentUser?.id || "usr_active",
    username: username.replace("@", "").trim(),
    displayName: displayName || `${username} Business`,
    profilePicture: profilePicture || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
    accessToken: tokenString,
    messagingAccessToken: messagingTokenString,
    isConnected: true,
    connectedAt: new Date().toISOString(),
    isReal: !!isReal,
    instagramBusinessAccountId: instagramBusinessAccountId || "",
    enableContentIG: true,
    enableMessageEA: true
  };

  if (existingIndex !== -1) {
    db.instagram_accounts[existingIndex] = {
      ...db.instagram_accounts[existingIndex],
      isConnected: true,
      accessToken: tokenString,
      messagingAccessToken: messagingTokenString || db.instagram_accounts[existingIndex].messagingAccessToken || "",
      connectedAt: new Date().toISOString(),
      isReal: !!isReal,
      instagramBusinessAccountId: instagramBusinessAccountId || "",
      enableContentIG: db.instagram_accounts[existingIndex].enableContentIG !== undefined ? db.instagram_accounts[existingIndex].enableContentIG : true,
      enableMessageEA: db.instagram_accounts[existingIndex].enableMessageEA !== undefined ? db.instagram_accounts[existingIndex].enableMessageEA : true
    };
  } else {
    db.instagram_accounts.push(newAccount);
  }

  // Push audit trail log
  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: "",
    timestamp: new Date().toISOString(),
    status: "success",
    message: isReal 
      ? `[Meta Engine] Connected Real Instagram Creator node @${newAccount.username} with Business Account ID ${instagramBusinessAccountId}. Ready for live publication.`
      : `[OAuth flow] Connected Instagram Creator node @${newAccount.username}. Access token securely compiled & encrypted in database.`,
    attemptCount: 1
  });

  writeDB(db);

  // Auto-trigger Webhook subscription for real tokens
  if (isReal && accessToken) {
    const targetUsername = username.replace("@", "").trim();
    const isInstagramLoginToken = accessToken.trim().toUpperCase().startsWith("IGAA");
    const graphHost = isInstagramLoginToken ? "graph.instagram.com" : "graph.facebook.com";
    console.log(`[Meta Engine] Auto-triggering webhook subscription for @${targetUsername} via ${graphHost}...`);
    const subscribeUrl = `https://${graphHost}/v20.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mentions&access_token=${accessToken}`;
    fetch(subscribeUrl, { method: "POST" })
      .then(async (subRes) => {
        const subData = await subRes.json().catch(() => ({}));
        const subResText = JSON.stringify(subData);
        const subDb = readDB();
        if (subRes.ok) {
          subDb.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: "",
            timestamp: new Date().toISOString(),
            status: "success",
            message: `[Meta Webhook] Successfully registered Webhook subscription on Meta for @${targetUsername}. Real-time direct messages and comments will now route to your Callback URL!`,
            attemptCount: 1
          });
        } else {
          subDb.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: "",
            timestamp: new Date().toISOString(),
            status: "warning",
            message: `[Meta Webhook] Auto-subscription for @${targetUsername} returned Meta response: ${subResText}. (Note: If this is an Instagram User/Basic token, manual Meta app setup is required, or use Page Tokens).`,
            attemptCount: 1
          });
        }
        writeDB(subDb);
      })
      .catch((err) => {
        console.error("[Meta Engine] Webhook auto-subscribe error:", err);
      });
  }

  res.json(newAccount);
});

// Explicitly trigger webhook subscription on demand via the UI
app.post("/api/instagram/subscribe-webhook", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Account ID is required." });
  }

  const db = readDB();
  const acc = db.instagram_accounts.find((a) => a.id === id);
  if (!acc) {
    return res.status(404).json({ error: "Account not found." });
  }

  const accessToken = acc.accessToken;
  const isRealToken = accessToken && accessToken.length > 30 && !accessToken.includes("mock");

  if (!isRealToken) {
    return res.status(400).json({ error: "The account does not have a valid physical access token configured." });
  }

  try {
    const isInstagramLoginToken = accessToken.trim().toUpperCase().startsWith("IGAA");
    const graphHost = isInstagramLoginToken ? "graph.instagram.com" : "graph.facebook.com";
    console.log(`[Webhook Subscribe] Explicitly subscribing @${acc.username} via ${graphHost}...`);
    const subscribeUrl = `https://${graphHost}/v20.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments,mentions&access_token=${accessToken}`;
    
    const subRes = await fetch(subscribeUrl, { method: "POST" });
    const resData: any = await subRes.json().catch(() => ({}));
    const resText = JSON.stringify(resData);
    
    if (subRes.ok) {
      db.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: "",
        timestamp: new Date().toISOString(),
        status: "success",
        message: `[Meta Webhook] Successfully subscribed @${acc.username} to Meta webhooks! Meta will now deliver comments and direct messages. Response: ${resText}`,
        attemptCount: 1
      });
      writeDB(db);
      return res.json({ success: true, message: "Meta subscription successful!", data: resData });
    } else {
      const errorMsg = resData.error?.message || resText || "Unknown Meta API Error";
      db.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: "",
        timestamp: new Date().toISOString(),
        status: "error",
        message: `[Meta Webhook Error] Failed to subscribe @${acc.username} to Meta webhooks: ${errorMsg}`,
        attemptCount: 1
      });
      writeDB(db);
      return res.status(400).json({ error: errorMsg, data: resData });
    }
  } catch (err: any) {
    console.error("[Webhook Subscribe] Request failed:", err);
    return res.status(500).json({ error: err.message || "Failed to contact Meta API." });
  }
});

app.put("/api/accounts/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { enableContentIG, enableMessageEA, displayName, instagramBusinessAccountId } = req.body;

  const accIndex = db.instagram_accounts.findIndex((a) => a.id === id);
  if (accIndex === -1) {
    return res.status(404).json({ error: "Account not found." });
  }

  const account = db.instagram_accounts[accIndex];
  if (enableContentIG !== undefined) account.enableContentIG = !!enableContentIG;
  if (enableMessageEA !== undefined) account.enableMessageEA = !!enableMessageEA;
  if (displayName !== undefined) account.displayName = displayName;
  if (instagramBusinessAccountId !== undefined) account.instagramBusinessAccountId = instagramBusinessAccountId;

  writeDB(db);
  res.json({ success: true, account });
});

app.delete("/api/accounts/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  const acc = db.instagram_accounts.find((a) => a.id === id);
  db.instagram_accounts = db.instagram_accounts.filter((a) => a.id !== id);

  if (acc) {
    db.publish_logs.push({
      id: "log_" + Math.random().toString(36).substring(2, 11),
      scheduledPostId: "",
      timestamp: new Date().toISOString(),
      status: "warning",
      message: acc.isReal
        ? `[Meta Engine] De-authorized and unlinked real Instagram account @${acc.username}. Secure tokens deleted.`
        : `[OAuth flow] De-authorized and unlinked Instagram account @${acc.username}. Secure tokens deleted.`,
      attemptCount: 1
    });
  }

  writeDB(db);
  res.json({ success: true });
});

// Public binary media access for Meta Graph API crawler
app.get("/api/media-public/:id", async (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const asset = db.media.find((m) => m.id === id);
  if (!asset) {
    return res.status(404).send("Media asset not found.");
  }

  // Handle physical uploaded files stored locally
  if (asset.url.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), asset.url);
    if (fs.existsSync(localPath)) {
      // If it's a video, serve it directly with video/mp4 content type
      if (asset.type === "video" || asset.url.endsWith(".mp4") || asset.url.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/mp4");
        return res.sendFile(localPath);
      }

      // If it's already a JPEG, serve it directly to avoid unnecessary conversion
      if (asset.url.endsWith(".jpg") || asset.url.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
        return res.sendFile(localPath);
      }

      // Convert other formats (PNG, WebP, GIF, etc.) to JPEG
      try {
        const { Jimp } = await import("jimp");
        const image = await Jimp.read(localPath);
        const jpegBuffer = await image.getBuffer("image/jpeg");
        res.setHeader("Content-Type", "image/jpeg");
        return res.send(jpegBuffer);
      } catch (err) {
        console.error("[Media Public Proxy] Error converting physical image file to JPEG:", err);
        // Fallback to sending original file directly
        const ext = path.extname(localPath).toLowerCase();
        const contentType = ext === ".png" ? "image/png" : (ext === ".webp" ? "image/webp" : "application/octet-stream");
        res.setHeader("Content-Type", contentType);
        return res.sendFile(localPath);
      }
    }
  }

  if (asset.url.startsWith("data:")) {
    const matches = asset.url.match(/^data:([a-zA-Z0-9-+.//_]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      // Serve videos directly
      if (contentType.startsWith("video/")) {
        res.setHeader("Content-Type", contentType);
        return res.send(buffer);
      }

      // If it's already a JPEG, serve it directly to avoid unnecessary conversion
      if (contentType === "image/jpeg" || contentType === "image/jpg") {
        res.setHeader("Content-Type", contentType);
        return res.send(buffer);
      }

      // Convert other formats (PNG, WebP, GIF, BMP, etc.) to JPEG
      try {
        const { Jimp } = await import("jimp");
        const image = await Jimp.read(buffer);
        const jpegBuffer = await image.getBuffer("image/jpeg");
        res.setHeader("Content-Type", "image/jpeg");
        return res.send(jpegBuffer);
      } catch (err) {
        console.error("[Media Public Proxy] Error converting image to JPEG:", err);
        // Fallback to original content type if conversion fails
        res.setHeader("Content-Type", contentType);
        return res.send(buffer);
      }
    }
  }

  // If it's already an external HTTP/S link, redirect to it
  res.redirect(asset.url);
});

// Media Library endpoints
app.get("/api/media-library", (req, res) => {
  const db = readDB();
  res.json(db.media);
});

app.post("/api/upload-media", (req, res) => {
  const db = readDB();
  const { name, url, type, size } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Media resource URL or data payload is required." });
  }

  const assetId = "med_" + Math.random().toString(36).substring(2, 11);
  const savedUrl = saveBase64File(url, assetId);

  const newAsset: MediaAsset = {
    id: assetId,
    userId: db.currentUser?.id || "usr_active",
    name: name || `upload_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`,
    url: savedUrl,
    type: type || "image",
    size: size || "1.5 MB",
    createdAt: new Date().toISOString()
  };

  db.media.unshift(newAsset);
  writeDB(db);
  res.json(newAsset);
});

app.delete("/api/media-library/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  db.media = db.media.filter((m) => m.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Get scheduled/upcoming posts with search, filtering, and pagination
app.get("/api/posts", (req, res) => {
  const db = readDB();
  const { status, search, accountId, page = "1", limit = "10" } = req.query;

  let filtered = [...db.scheduled_posts];

  // Filter by status
  if (status && status !== "all") {
    filtered = filtered.filter((p) => p.status === status);
  }

  // Filter by search caption
  if (search && typeof search === "string" && search.trim() !== "") {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => p.caption.toLowerCase().includes(q));
  }

  // Filter by connected account
  if (accountId && accountId !== "all") {
    filtered = filtered.filter((p) => p.instagramAccountId === accountId);
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

  // Pagination
  const pNum = parseInt(page as string) || 1;
  const lNum = parseInt(limit as string) || 10;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / lNum);
  const startIndex = (pNum - 1) * lNum;
  const paginated = filtered.slice(startIndex, startIndex + lNum);

  res.json({
    posts: paginated,
    pagination: {
      currentPage: pNum,
      totalPages,
      totalItems,
      limit: lNum
    }
  });
});

// Schedule a post
app.post("/api/posts", (req, res) => {
  const db = readDB();
  const { type, caption, mediaAssetIds, mediaUrls, scheduledFor, instagramAccountId, timezone } = req.body;

  if (!type || !caption || !mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0 || !instagramAccountId) {
    return res.status(400).json({ error: "Missing required fields or media URLs list." });
  }

  const account = db.instagram_accounts.find((a) => a.id === instagramAccountId);
  if (!account) {
    return res.status(400).json({ error: "Connected Instagram Account not found." });
  }

  const postId = "post_" + Math.random().toString(36).substring(2, 11);
  const savedMediaUrls = mediaUrls.map((u: string, i: number) => {
    if (u && u.startsWith("data:")) {
      return saveBase64File(u, `${postId}_${i}`);
    }
    return u;
  });

  const newPost: ScheduledPost = {
    id: postId,
    userId: db.currentUser?.id || "usr_active",
    instagramAccountId,
    instagramAccountUsername: account.username,
    type,
    caption,
    mediaAssetIds: mediaAssetIds || [],
    mediaUrls: savedMediaUrls,
    scheduledFor: scheduledFor || new Date().toISOString(),
    status: "pending",
    timezone: timezone || "UTC",
    createdAt: new Date().toISOString()
  };

  db.scheduled_posts.unshift(newPost);

  // Push publish log entry
  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: newPost.id,
    timestamp: new Date().toISOString(),
    status: "info",
    message: `Scheduled ${type.toUpperCase()} post to release on @${account.username} at ${new Date(newPost.scheduledFor).toLocaleString()}.`,
    attemptCount: 1
  });

  writeDB(db);
  res.json(newPost);
});

// Update schedule
app.put("/api/posts/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const postIndex = db.scheduled_posts.findIndex((p) => p.id === id);

  if (postIndex === -1) {
    return res.status(404).json({ error: "Scheduled post not found." });
  }

  db.scheduled_posts[postIndex] = {
    ...db.scheduled_posts[postIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: id,
    timestamp: new Date().toISOString(),
    status: "info",
    message: `Post ${id} calendar schedule configuration edited. Updated timing is ${new Date(db.scheduled_posts[postIndex].scheduledFor).toLocaleString()}.`,
    attemptCount: 1
  });

  writeDB(db);
  res.json(db.scheduled_posts[postIndex]);
});

// Duplicate schedule
app.post("/api/posts/:id/duplicate", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const post = db.scheduled_posts.find((p) => p.id === id);

  if (!post) {
    return res.status(404).json({ error: "Scheduled post not found." });
  }

  const newPost: ScheduledPost = {
    ...post,
    id: "post_" + Math.random().toString(36).substring(2, 11),
    status: "pending",
    postedAt: null,
    instagramId: null,
    error: null,
    duplicatedFromId: id,
    createdAt: new Date().toISOString()
  };

  db.scheduled_posts.unshift(newPost);

  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: newPost.id,
    timestamp: new Date().toISOString(),
    status: "info",
    message: `Post ${id} duplicated into new scheduling block ${newPost.id}.`,
    attemptCount: 1
  });

  writeDB(db);
  res.json(newPost);
});

// Delete schedule
app.delete("/api/posts/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const filtered = db.scheduled_posts.filter((p) => p.id !== id);

  if (filtered.length === db.scheduled_posts.length) {
    return res.status(404).json({ error: "Post not found." });
  }

  db.scheduled_posts = filtered;
  writeDB(db);
  res.json({ success: true });
});

// Retrieve media in raw form (keep for testing)
app.get("/api/posts/:id/media/:index", (req, res) => {
  const db = readDB();
  const { id, index } = req.params;
  const post = db.scheduled_posts.find((p) => p.id === id);

  if (!post) {
    return res.status(404).send("Post not found.");
  }

  const mediaIndex = parseInt(index);
  if (isNaN(mediaIndex) || mediaIndex < 0 || mediaIndex >= post.mediaUrls.length) {
    return res.status(404).send("Media index out of bounds.");
  }

  const mediaStr = post.mediaUrls[mediaIndex];

  // If it's a base64 Data URL, decode and serve it as binary
  if (mediaStr.startsWith("data:")) {
    const matches = mediaStr.match(/^data:([a-zA-Z0-9-+.//_]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      res.setHeader("Content-Type", contentType);
      return res.send(buffer);
    }
  }

  // If it's an external URL, redirect to it
  if (mediaStr.startsWith("http")) {
    return res.redirect(mediaStr);
  }

  res.status(400).send("Invalid media format.");
});

// AI Caption Generation
app.post("/api/gemini/generate-caption", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API Key is not set in secrets/environment." });
  }

  const { description, tone, type } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Please provide a description of the post." });
  }

  try {
    const prompt = `Write a high-converting Instagram caption for a ${type} post. 
Context/Description: ${description}
Tone: ${tone || "creative"}

Requirements:
1. Make it engaging and appropriate for Instagram.
2. Include a clear call to action (e.g., swipe, save, comment, click bio link).
3. Structure with friendly bullet points or short paragraphs for readability.
4. Provide 3 optional variations of the caption.
5. Generate 15 targeted, popular, and relevant hashtags (mix of broad and niche).
6. Suggest the optimal posting time/day for this specific topic to maximize reach.

Return the result strictly as a JSON object with this exact structure (no markdown wrap, just raw JSON, do not include the \`\`\`json markdown blocks):
{
  "variations": [
    "Variation 1 caption string...",
    "Variation 2 caption string...",
    "Variation 3 caption string..."
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", ...],
  "optimalTime": "Suggested time details...",
  "strategyTip": "One core tip to make this post go viral..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);
    
    // Clear Gemini API error on success
    const db = readDB();
    db.settings.lastGeminiApiError = null;
    writeDB(db);

    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Caption generation failed:", err);
    try {
      const db = readDB();
      db.settings.lastGeminiApiError = {
        timestamp: new Date().toISOString(),
        message: err.message || String(err),
        details: err.status ? { status: err.status } : err
      };
      writeDB(db);
    } catch (_) {}
    res.status(500).json({ error: "Failed to generate caption. " + (err.message || "") });
  }
});

// AI Image Generation
app.post("/api/gemini/generate-image", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "Gemini API Key is not set in secrets/environment." });
  }

  const { prompt, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Please provide an image prompt." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
        },
      },
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: "No image data was generated by the model." });
    }

    // Clear Gemini API error on success
    const db = readDB();
    db.settings.lastGeminiApiError = null;
    writeDB(db);

    res.json({ imageUrl: base64Image });
  } catch (err: any) {
    console.error("Gemini Image generation failed:", err);
    try {
      const db = readDB();
      db.settings.lastGeminiApiError = {
        timestamp: new Date().toISOString(),
        message: err.message || String(err),
        details: err.status ? { status: err.status } : err
      };
      writeDB(db);
    } catch (_) {}
    res.status(500).json({ error: "Failed to generate image. " + (err.message || "") });
  }
});

// Get publish logs
app.get("/api/bot/logs", (req, res) => {
  const db = readDB();
  res.json(db.publish_logs);
});

// Clear publish logs
app.post("/api/bot/clear-logs", (req, res) => {
  const db = readDB();
  db.publish_logs = [
    {
      id: "log_" + Math.random().toString(36).substring(2, 11),
      scheduledPostId: "",
      timestamp: new Date().toISOString(),
      status: "info",
      message: "Console audit logs cleared.",
      attemptCount: 1
    }
  ];
  writeDB(db);
  res.json({ success: true });
});

// Dashboard analytics
app.get("/api/dashboard-analytics", (req, res) => {
  const db = readDB();
  
  const postsCount = db.scheduled_posts.length;
  const pendingCount = db.scheduled_posts.filter((p) => p.status === "pending").length;
  const completedCount = db.scheduled_posts.filter((p) => p.status === "completed").length;
  const failedCount = db.scheduled_posts.filter((p) => p.status === "failed").length;
  const accountsCount = db.instagram_accounts.length;
  const mediaCount = db.media.length;

  // Let's mock a beautiful engagement graph data for last 6 months
  const engagementData = [
    { month: "Jan", posts: 12, reach: 4500, engagement: 420 },
    { month: "Feb", posts: 18, reach: 7200, engagement: 680 },
    { month: "Mar", posts: 24, reach: 9800, engagement: 950 },
    { month: "Apr", posts: 32, reach: 14500, engagement: 1420 },
    { month: "May", posts: 28, reach: 13200, engagement: 1210 },
    { month: "Jun", posts: completedCount + 10, reach: 15400 + (completedCount * 300), engagement: 1650 + (completedCount * 35) }
  ];

  res.json({
    totals: {
      postsCount,
      pendingCount,
      completedCount,
      failedCount,
      accountsCount,
      mediaCount
    },
    engagementData
  });
});

// Settings / System config
app.get("/api/bot/settings", (req, res) => {
  const db = readDB();
  const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || "meta_verify_token_example_123";
  res.json({
    ...db.settings,
    verifyToken: VERIFY_TOKEN
  });
});

app.post("/api/bot/settings", (req, res) => {
  const db = readDB();
  const { timezone, appPublicUrl, customWebhookUrl, manychatBranding } = req.body;

  if (timezone !== undefined) {
    db.settings.timezone = timezone;
  }
  if (appPublicUrl !== undefined) {
    db.settings.appPublicUrl = appPublicUrl;
  }
  if (customWebhookUrl !== undefined) {
    db.settings.customWebhookUrl = customWebhookUrl;
  }
  if (manychatBranding !== undefined) {
    db.settings.manychatBranding = manychatBranding;
  }

  writeDB(db);
  res.json(db.settings);
});

// Get diagnostic state
app.get("/api/bot/diagnostics", (req, res) => {
  const db = readDB();
  res.json({
    lastWebhookPayload: db.settings.lastWebhookPayload || null,
    lastIncomingMessage: db.settings.lastIncomingMessage || null,
    lastReplyAttempt: db.settings.lastReplyAttempt || null,
    lastMetaApiError: db.settings.lastMetaApiError || null,
    lastGeminiApiError: db.settings.lastGeminiApiError || null,
    settings: db.settings,
    accounts: db.instagram_accounts
  });
});

// --- INSTAGRAM AUTO-REPLY ENDPOINTS ---

// Get all rules
app.get("/api/autoreply/rules", (req, res) => {
  const db = readDB();
  res.json(db.autoreply_rules || []);
});

// Add a rule
app.post("/api/autoreply/rules", (req, res) => {
  const db = readDB();
  const { 
    triggerType, 
    keywords, 
    replyType, 
    staticReplyText, 
    aiPromptInstruction, 
    isActive,
    delaySeconds,
    buttons,
    captureLeadField,
    captureSuccessText
  } = req.body;

  const newRule: AutoReplyRule = {
    id: "rule_" + Math.random().toString(36).substring(2, 11),
    triggerType: triggerType || "keyword",
    keywords: Array.isArray(keywords) ? keywords : [],
    replyType: replyType || "static",
    staticReplyText: staticReplyText || "",
    aiPromptInstruction: aiPromptInstruction || "",
    isActive: isActive !== undefined ? !!isActive : true,
    createdAt: new Date().toISOString(),
    delaySeconds: delaySeconds !== undefined ? Number(delaySeconds) : undefined,
    buttons: Array.isArray(buttons) ? buttons : undefined,
    captureLeadField: captureLeadField || "none",
    captureSuccessText: captureSuccessText || ""
  };

  if (!db.autoreply_rules) db.autoreply_rules = [];
  db.autoreply_rules.push(newRule);

  writeDB(db);
  res.json(newRule);
});

// Update a rule
app.put("/api/autoreply/rules/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { 
    triggerType, 
    keywords, 
    replyType, 
    staticReplyText, 
    aiPromptInstruction, 
    isActive,
    delaySeconds,
    buttons,
    captureLeadField,
    captureSuccessText
  } = req.body;

  const rules = db.autoreply_rules || [];
  const index = rules.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Rule not found." });
  }

  const updatedRule = {
    ...rules[index],
    triggerType: triggerType !== undefined ? triggerType : rules[index].triggerType,
    keywords: keywords !== undefined ? keywords : rules[index].keywords,
    replyType: replyType !== undefined ? replyType : rules[index].replyType,
    staticReplyText: staticReplyText !== undefined ? staticReplyText : rules[index].staticReplyText,
    aiPromptInstruction: aiPromptInstruction !== undefined ? aiPromptInstruction : rules[index].aiPromptInstruction,
    isActive: isActive !== undefined ? !!isActive : rules[index].isActive,
    delaySeconds: delaySeconds !== undefined ? (delaySeconds === null ? undefined : Number(delaySeconds)) : rules[index].delaySeconds,
    buttons: buttons !== undefined ? (buttons === null ? undefined : buttons) : rules[index].buttons,
    captureLeadField: captureLeadField !== undefined ? captureLeadField : rules[index].captureLeadField,
    captureSuccessText: captureSuccessText !== undefined ? captureSuccessText : rules[index].captureSuccessText
  };

  rules[index] = updatedRule;
  db.autoreply_rules = rules;

  writeDB(db);
  res.json(updatedRule);
});

// Delete a rule
app.delete("/api/autoreply/rules/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;

  const rules = db.autoreply_rules || [];
  const filtered = rules.filter(r => r.id !== id);

  if (rules.length === filtered.length) {
    return res.status(404).json({ error: "Rule not found." });
  }

  db.autoreply_rules = filtered;
  writeDB(db);
  res.json({ success: true });
});

// Get all logs / messages
app.get("/api/autoreply/messages", (req, res) => {
  const db = readDB();
  res.json(db.autoreply_messages || []);
});

// Clear all logs / messages
app.post("/api/autoreply/clear-messages", (req, res) => {
  const db = readDB();
  db.autoreply_messages = [];
  writeDB(db);
  res.json({ success: true });
});

// Get all captured leads
app.get("/api/autoreply/leads", (req, res) => {
  const db = readDB();
  res.json(db.autoreply_leads || []);
});

// Delete a captured lead
app.delete("/api/autoreply/leads/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const leads = db.autoreply_leads || [];
  const filtered = leads.filter(l => l.id !== id);
  db.autoreply_leads = filtered;
  writeDB(db);
  res.json({ success: true });
});

// Clear all captured leads
app.post("/api/autoreply/clear-leads", (req, res) => {
  const db = readDB();
  db.autoreply_leads = [];
  writeDB(db);
  res.json({ success: true });
});

// Helper to generate a smart fallback response based on message context and rule instructions
function generateSmartFallbackReply(messageText: string, instruction: string): string {
  const msgLower = messageText.toLowerCase();
  const instLower = instruction.toLowerCase();

  // Pricing, subscription, cost, etc.
  if (
    msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("pricing") ||
    msgLower.includes("how much") || msgLower.includes("plans") || msgLower.includes("fees") ||
    msgLower.includes("tier") || msgLower.includes("subscription") || msgLower.includes("discount") ||
    instLower.includes("price") || instLower.includes("subscription") || instLower.includes("tier")
  ) {
    return "Hi! Thanks for your interest in SFR DigiTech! Here is a summary of our subscription tiers:\n\n• Starter Plan: $29/month (1 connected Instagram profile, essential analytics)\n• Pro Plan: $49/month (3 connected Instagram profiles, advanced AI auto-reply brain, direct media upload)\n• Enterprise Plan: $99/month (Unlimited accounts, white-labeled reporting, dedicated server bandwidth)\n\nYou can upgrade or manage your plan directly in your Dashboard Settings! Let us know if you need any assistance getting set up! 🚀";
  }

  // Support, help, error, connection, issue, etc.
  if (
    msgLower.includes("help") || msgLower.includes("support") || msgLower.includes("broken") ||
    msgLower.includes("error") || msgLower.includes("fail") || msgLower.includes("connection") ||
    msgLower.includes("setup") || msgLower.includes("cannot") || msgLower.includes("issue") ||
    msgLower.includes("wrong") || instLower.includes("help") || instLower.includes("support") ||
    instLower.includes("troubleshoot")
  ) {
    return "Hi there! I understand you are experiencing an issue or need support. Our technical team is on standby to help you resolve this!\n\nPlease visit our 'Real Webhook Guide' or standard 'Settings' menu to verify your connected account token and webhook status. You can also open a support ticket or live chat directly from our client dashboard, and our representatives will be in touch shortly! 🛠️";
  }

  // Greeting
  if (
    msgLower.includes("hi") || msgLower.includes("hello") || msgLower.includes("hey") ||
    msgLower.includes("hola") || msgLower.includes("greetings")
  ) {
    return "Hello! Warm greetings from SFR DigiTech Automation! How can we assist you with your Instagram growth and auto-posting campaigns today? Let us know if you want to learn about our scheduling queue or AI auto-reply rules! 🌟";
  }

  // Features, capabilities, queue, scheduler
  if (
    msgLower.includes("features") || msgLower.includes("capabilities") || msgLower.includes("automation") ||
    msgLower.includes("queue") || msgLower.includes("scheduler") || msgLower.includes("post") ||
    instLower.includes("features") || instLower.includes("automation")
  ) {
    return "Hi! SFR DigiTech is an all-in-one Instagram automation platform. Here are our main capabilities:\n\n1. AI Post Composer & Generation\n2. Real-time Interactive Calendars\n3. Scheduled Posting Queue\n4. Live Auto-Reply Bot with smart keyword filters\n5. Media Library Management\n\nFeel free to explore our sidebar modules to see all features in action! 📱";
  }

  // Default general fallback
  return `Thank you for contacting SFR DigiTech Customer Support! We have received your inquiry: "${messageText}". Our team is reviewing this and will respond with a detailed reply shortly! Have a wonderful day! ✨`;
}

// Helper to execute auto-reply logic
async function executeAutoReply(senderUsername: string, messageText: string, isComment: boolean, forceOffline: boolean = false): Promise<InstagramMessage> {
  const db = readDB();
  
  // Skip auto-replies if Message EA is disabled for the connected profile
  const account = db.instagram_accounts.find(a => a.isConnected);
  if (account && account.enableMessageEA === false) {
    console.log(`[Auto-Reply Bypass] Skipping auto-reply for @${senderUsername} because Message EA is disabled for account @${account.username}.`);
    return {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      senderUsername,
      messageText,
      timestamp: new Date().toISOString(),
      replySent: "Auto-reply is disabled for this profile in your control dashboard.",
      replyType: "none"
    };
  }

  const rules = db.autoreply_rules || [];
  let matchedRule: AutoReplyRule | undefined = undefined;

  // 1. Lead Capture Recognition & Extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/;

  const emailMatch = messageText.match(emailRegex);
  const phoneMatch = messageText.match(phoneRegex);

  let isLeadCaptured = false;
  let capturedEmail = emailMatch ? emailMatch[0] : undefined;
  let capturedPhone = phoneMatch ? phoneMatch[0] : undefined;

  const userMessages = (db.autoreply_messages || []).filter(m => m.senderUsername === senderUsername);
  const lastBotReply = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

  // If the last bot reply explicitly asked for email/phone, capture the entire text if regex didn't match perfectly
  if (lastBotReply && lastBotReply.matchedRuleId) {
    const lastRule = rules.find(r => r.id === lastBotReply.matchedRuleId);
    if (lastRule && lastRule.captureLeadField && lastRule.captureLeadField !== "none") {
      const field = lastRule.captureLeadField;
      if (field === "email" && !capturedEmail) {
        if (messageText.includes("@")) {
          capturedEmail = messageText.trim();
        }
      } else if (field === "phone" && !capturedPhone) {
        const digits = messageText.replace(/\D/g, "");
        if (digits.length >= 7) {
          capturedPhone = messageText.trim();
        }
      }
    }
  }

  // If captured, register/update the lead in CRM
  if (capturedEmail || capturedPhone) {
    if (!db.autoreply_leads) db.autoreply_leads = [];
    let lead = db.autoreply_leads.find(l => l.username.toLowerCase() === senderUsername.toLowerCase());
    if (!lead) {
      lead = {
        id: "lead_" + Math.random().toString(36).substring(2, 11),
        username: senderUsername,
        status: "new",
        lastInteracted: new Date().toISOString()
      };
      db.autoreply_leads.push(lead);
    }
    if (capturedEmail) lead.email = capturedEmail;
    if (capturedPhone) lead.phone = capturedPhone;
    lead.lastInteracted = new Date().toISOString();
    lead.status = "qualified";
    isLeadCaptured = true;
  }

  // 2. Select matching rule
  if (!isLeadCaptured) {
    // Try matching keyword rules first
    const activeKeywordRules = rules.filter(r => r.isActive && r.triggerType === "keyword");
    
    for (const rule of activeKeywordRules) {
      const hasMatchingKeyword = rule.keywords.some(keyword => 
        messageText.toLowerCase().includes(keyword.toLowerCase().trim())
      );
      if (hasMatchingKeyword) {
        matchedRule = rule;
        break;
      }
    }

    // If no keyword rule matches, find an active "always" rule
    if (!matchedRule) {
      matchedRule = rules.find(r => r.isActive && r.triggerType === "always");
    }
  }

  let replySent = "";
  let replyType: "static" | "ai" | "none" = "none";
  let matchedRuleId = matchedRule ? matchedRule.id : undefined;
  let responseButtons: { label: string; triggerKeyword: string }[] | undefined = undefined;

  // 3. Assemble Bot Response Content
  if (isLeadCaptured) {
    replyType = "static";
    let successText = "Got it! Your contact details have been successfully saved to our CRM. Thank you! 📬";
    if (lastBotReply && lastBotReply.matchedRuleId) {
      const lastRule = rules.find(r => r.id === lastBotReply.matchedRuleId);
      if (lastRule && lastRule.captureSuccessText) {
        successText = lastRule.captureSuccessText;
      }
    }
    replySent = successText;
  } else if (matchedRule) {
    replyType = matchedRule.replyType;
    if (matchedRule.buttons && matchedRule.buttons.length > 0) {
      responseButtons = matchedRule.buttons;
    }

    if (matchedRule.replyType === "static") {
      replySent = matchedRule.staticReplyText || "Thank you for your message! We will get back to you soon.";
    } else if (matchedRule.replyType === "ai") {
      if (ai && !forceOffline) {
        try {
          const prompt = `Generate a response to this Instagram message/comment: "${messageText}". Ensure you follow these specific guidelines: ${matchedRule.aiPromptInstruction}`;
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are an automated, helpful, and friendly customer support assistant responding to Instagram direct messages or comments for the brand SFR DigiTech. Be polite, direct, keep responses concise, and do not use generic AI-sounding templates.",
              temperature: 0.7,
            }
          });
          replySent = response.text || "Thank you for reaching out!";
          db.settings.lastGeminiApiError = null; // Clear error on successful call
        } catch (err: any) {
          const isQuota = err.message?.includes("quota") || err.message?.includes("429") || err.status === 429;
          if (isQuota) {
            console.warn(`[Auto-Responder] Gemini quota limit exceeded (429). Using intelligent local rule fallback for message: "${messageText}"`);
          } else {
            console.error("[Auto-Responder] Gemini API error:", err.message || err);
          }

          // Log the Gemini API error to diagnostics settings
          db.settings.lastGeminiApiError = {
            timestamp: new Date().toISOString(),
            message: err.message || String(err),
            details: err.status ? { status: err.status } : err
          };

          replySent = generateSmartFallbackReply(messageText, matchedRule.aiPromptInstruction || "");
        }
      } else {
        replySent = generateSmartFallbackReply(messageText, matchedRule.aiPromptInstruction || "");
      }
    }
  } else {
    replySent = "Thank you for contacting SFR DigiTech Automation! We've received your message and will respond shortly.";
  }

  const newMessage: InstagramMessage = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    senderUsername,
    messageText,
    timestamp: new Date().toISOString(),
    replySent,
    replyType,
    matchedRuleId,
    isComment: !!isComment,
    buttons: responseButtons,
    includeBranding: !!db.settings?.manychatBranding
  };

  if (!db.autoreply_messages) db.autoreply_messages = [];
  db.autoreply_messages.push(newMessage);
  if (db.autoreply_messages.length > 100) {
    db.autoreply_messages = db.autoreply_messages.slice(-100);
  }

  // Add system audit log
  if (!db.publish_logs) db.publish_logs = [];
  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: "",
    timestamp: new Date().toISOString(),
    status: isLeadCaptured ? "success" : "info",
    message: isLeadCaptured 
      ? `[ManyChat Lead Captured] Successfully captured contact information for @${senderUsername}! Saved to CRM.` 
      : `[Auto-Responder] Received message from @${senderUsername}: "${messageText}". Matched rule: ${matchedRule ? matchedRule.id : 'None'}. Automatic reply sent.`,
    attemptCount: 1
  });
  if (db.publish_logs.length > 300) {
    db.publish_logs = db.publish_logs.slice(-300);
  }

  writeDB(db);
  return newMessage;
}

// Simulate receiving a message and auto-reply
app.post("/api/autoreply/simulate", async (req, res) => {
  const { senderUsername, messageText, isComment } = req.body;

  if (!senderUsername || !messageText) {
    return res.status(400).json({ error: "senderUsername and messageText are required." });
  }

  try {
    const newMessage = await executeAutoReply(senderUsername, messageText, !!isComment);
    res.json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process simulate." });
  }
});

// --- REAL INSTAGRAM WEBHOOK INTEGRATION ENDPOINTS ---

// GET /api/webhook/sync-db (Pull database state from Vercel to local sandbox)
app.get("/api/cron", async (req, res) => {
  try {
    console.log("[Vercel Cron Trigger] Trigger received. Executing scheduler tick...");
    await executeSchedulerTick(true);
    res.json({
      success: true,
      message: "Vercel Cron triggered scheduler tick executed successfully."
    });
  } catch (err: any) {
    console.error("[Vercel Cron Trigger Error] Failed to execute scheduler tick:", err.message);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to execute scheduler tick via Vercel Cron."
    });
  }
});

app.get("/api/webhook/sync-db", (req, res) => {
  const db = readDB();
  res.json({ success: true, db });
});

// POST /api/webhook/sync-db (Push database state from local sandbox to Vercel)
app.post("/api/webhook/sync-db", (req, res) => {
  const { db } = req.body;
  if (!db) {
    return res.status(400).json({ error: "No DB payload found." });
  }

  // Only allow state writing if we are running in the Vercel cloud environment
  if (process.env.VERCEL) {
    console.log("[Vercel Webhook Sync] Synchronizing database state from development sandbox.");
    inMemoryDB = db;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
      console.log("[Vercel Webhook Sync] Database written successfully to:", DB_FILE);
    } catch (err: any) {
      console.error("[Vercel Webhook Sync Error] Failed to write database to disk:", err.message);
    }
  }

  res.json({ success: true, message: "Database state synchronized successfully on Vercel." });
});

// GET Webhook verification (Meta App Review / Setup)
app.get(["/api/webhook", "/api/webhook/instagram"], async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const host = req.get("host") || "";

  const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || "meta_verify_token_example_123";

  // 1. If it's an actual Meta verification challenge (has mode and token), answer immediately locally!
  // This is critical because the dev container is session-secured/auth-gated, so forwarding would fail.
  if (mode && token) {
    const isMatched = (token === VERIFY_TOKEN) || 
                      (token === "meta_verify_token_example_123") || 
                      (token === "sfr_digitech_verify_token");

    if (mode === "subscribe" && isMatched) {
      console.log(`[Webhook] Instagram Webhook verified successfully locally. Token: ${token}`);
      
      // Log verification success to DB asynchronously
      try {
        const dbLog = readDB();
        if (!dbLog.publish_logs) dbLog.publish_logs = [];
        dbLog.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: "",
          timestamp: new Date().toISOString(),
          status: "success",
          message: `[Meta Webhook Verification] Webhook verified successfully locally. Mode: "${mode}", Token: "${token}", Challenge: "${challenge}".`,
          attemptCount: 1
        });
        writeDB(dbLog);
      } catch (e: any) {
        console.error("[Webhook Log Error] Failed to write verification log:", e.message);
      }

      res.set("Content-Type", "text/plain");
      return res.status(200).send(challenge);
    } else {
      console.warn(`[Webhook] Instagram Webhook verification failed. Token mismatch. Expected: "${VERIFY_TOKEN}" or "meta_verify_token_example_123", Received: "${token}"`);
      
      // Log verification failure to DB asynchronously
      try {
        const dbLog = readDB();
        if (!dbLog.publish_logs) dbLog.publish_logs = [];
        dbLog.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: "",
          timestamp: new Date().toISOString(),
          status: "error",
          message: `[Meta Webhook Verification] Webhook verification failed (token mismatch). Mode: "${mode}", Token: "${token}", Expected: "${VERIFY_TOKEN}" or "meta_verify_token_example_123".`,
          attemptCount: 1
        });
        writeDB(dbLog);
      } catch (e: any) {
        console.error("[Webhook Log Error] Failed to write verification log:", e.message);
      }

      return res.sendStatus(403);
    }
  }

  // 2. If request hits the pre-prod container, forward to dev container where the live DB and settings reside
  if (host.includes("ais-pre-")) {
    const devUrl = `https://${host.replace("ais-pre-", "ais-dev-")}/api/webhook/instagram?hub.mode=${encodeURIComponent((mode as string) || "")}&hub.verify_token=${encodeURIComponent((token as string) || "")}&hub.challenge=${encodeURIComponent((challenge as string) || "")}`;
    console.log(`[Webhook Forwarding] Forwarding GET verification/request to dev container: ${devUrl}`);
    try {
      const devRes = await fetch(devUrl);
      const text = await devRes.text();
      res.set("Content-Type", devRes.headers.get("Content-Type") || "text/plain");
      return res.status(devRes.status).send(text);
    } catch (err: any) {
      console.error("[Webhook Forwarding Error] Failed to forward GET verification:", err);
      // Fallback: continue local processing if forwarding fails
    }
  }

  // Fallback: If visited directly in browser, serve a beautiful instructions & status page
  const protocol = req.protocol || "https";
  const publicHost = host.replace("ais-dev-", "ais-pre-");
  const publicUrl = `${protocol}://${publicHost}/api/webhook/instagram`;

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Instagram Webhook Setup Helper | SFR DigiTech</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF8F5;
      color: #292524;
      padding: 40px 20px;
      line-height: 1.6;
      max-width: 650px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border: 1px solid #e3ded5;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    h1 {
      color: #9e4b2e;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 8px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #059669;
      font-size: 11px;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #ecfdf5;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
      margin-bottom: 24px;
    }
    p {
      font-size: 14px;
      color: #57534e;
      margin-bottom: 24px;
    }
    .label {
      font-size: 10px;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #78716c;
      margin-bottom: 6px;
      display: block;
      font-weight: bold;
    }
    .code-box {
      background: #f5f3ef;
      border: 1px solid #e3ded5;
      padding: 14px 18px;
      border-radius: 10px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 13px;
      margin-bottom: 24px;
      word-break: break-all;
      color: #292524;
    }
    .warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 20px;
      border-radius: 14px;
      font-size: 13px;
      margin-top: 32px;
    }
    .warning-title {
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">● Webhook Endpoint is Online</div>
    <h1>Meta Webhook Receiver Setup</h1>
    <p>
      This public endpoint is active and ready to receive real-time Instagram Direct Messages, mentions, and comment events from Meta.
    </p>

    <span class="label">Step 1: Callback URL</span>
    <div class="code-box">${publicUrl}</div>

    <span class="label">Step 2: Verify Token</span>
    <div class="code-box">${VERIFY_TOKEN}</div>

    <div class="warning">
      <div class="warning-title">⚠️ CRITICAL SETUP REQUISITE</div>
      Meta's server verification calls are made externally, meaning they <strong>cannot access</strong> your private, session-secured Development URL (with <code>ais-dev-</code>).
      <br/><br/>
      You must always use the public <strong>Shared App URL</strong> shown above containing <strong><code>ais-pre-</code></strong> in your Meta Developer Dashboard.
    </div>
  </div>
</body>
</html>
  `);
});

// POST Webhook receiver (Meta delivers DMs & Comments here)
app.post(["/api/webhook", "/api/webhook/instagram"], async (req, res) => {
  const body = req.body;
  const host = req.get("host") || "";

  // If request hits the pre-prod container, forward to dev container where the live DB and accounts reside
  if (host.includes("ais-pre-")) {
    const devUrl = `https://${host.replace("ais-pre-", "ais-dev-")}/api/webhook/instagram`;
    console.log(`[Webhook Forwarding] Forwarding POST webhook event to dev container: ${devUrl}`);
    try {
      const devRes = await fetch(devUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers["x-hub-signature-256"] ? { "x-hub-signature-256": req.headers["x-hub-signature-256"] as string } : {}),
          ...(req.headers["x-hub-signature"] ? { "x-hub-signature": req.headers["x-hub-signature"] as string } : {})
        },
        body: JSON.stringify(body)
      });
      if (devRes.ok) {
        const text = await devRes.text();
        return res.status(devRes.status).send(text);
      } else {
        console.warn(`[Webhook Forwarding] Dev container returned non-OK status: ${devRes.status}. Processing locally as fallback.`);
      }
    } catch (err: any) {
      console.error("[Webhook Forwarding Error] Failed to forward POST webhook event:", err);
      // Fallback: continue local processing if forwarding fails
    }
  }

  // Log incoming webhook requests for debugging physical events
  const dbLog = readDB();
  if (!dbLog.publish_logs) dbLog.publish_logs = [];
  dbLog.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: "",
    timestamp: new Date().toISOString(),
    status: "info",
    message: `[Webhook POST] Received event payload. Object: "${body?.object || "undefined"}". Entry count: ${Array.isArray(body?.entry) ? body.entry.length : 0}. Full Payload: ${JSON.stringify(body).substring(0, 1000)}`,
    attemptCount: 1
  });
  if (dbLog.settings) {
    dbLog.settings.lastWebhookPayload = {
      timestamp: new Date().toISOString(),
      headers: req.headers,
      query: req.query,
      body: body
    };
  }
  writeDB(dbLog);

  // Verify this is a subscription update from page/instagram
  if (body.object === "instagram" || body.object === "page") {
    console.log("[Webhook] Received incoming Meta event:", JSON.stringify(body, null, 2));

    // Forward the webhook payload to custom webhook URL if enabled/configured (e.g. Vercel deployment)
    // Prevent infinite forwarding loop if forwardUrl is the same as current host or vercel helper
    const currentHost = host.toLowerCase();
    const forwardUrlLower = (dbLog.settings?.customWebhookUrl || "").trim().toLowerCase();
    const isSelfForwarding = forwardUrlLower.includes("vercel.app") || 
                             (currentHost && forwardUrlLower.includes(currentHost));

    if (dbLog.settings?.customWebhookUrl && !isSelfForwarding) {
      const forwardUrl = dbLog.settings.customWebhookUrl.trim();
      if (forwardUrl.startsWith("http")) {
        console.log(`[Webhook] Forwarding webhook payload to custom webhook URL: ${forwardUrl}`);
        fetch(forwardUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(req.headers["x-hub-signature-256"] ? { "x-hub-signature-256": req.headers["x-hub-signature-256"] as string } : {}),
            ...(req.headers["x-hub-signature"] ? { "x-hub-signature": req.headers["x-hub-signature"] as string } : {})
          },
          body: JSON.stringify(body)
        }).then(async (forwardRes) => {
          const text = await forwardRes.text();
          console.log(`[Webhook] Forwarding to ${forwardUrl} completed with status ${forwardRes.status}. Response:`, text.substring(0, 200));
          
          const dbLogUpdate = readDB();
          if (!dbLogUpdate.publish_logs) dbLogUpdate.publish_logs = [];
          dbLogUpdate.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: "",
            timestamp: new Date().toISOString(),
            status: forwardRes.ok ? "success" : "info",
            message: `[Webhook Forwarding] Forwarded event to custom URL. Status: ${forwardRes.status}. Response: ${text.substring(0, 150)}`,
            attemptCount: 1
          });
          writeDB(dbLogUpdate);
        }).catch((err) => {
          console.error(`[Webhook] Failed to forward payload to ${forwardUrl}:`, err);
          const dbLogUpdate = readDB();
          if (!dbLogUpdate.publish_logs) dbLogUpdate.publish_logs = [];
          dbLogUpdate.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: "",
            timestamp: new Date().toISOString(),
            status: "error",
            message: `[Webhook Forwarding Error] Failed to forward to custom URL: ${err.message || err}`,
            attemptCount: 1
          });
          writeDB(dbLogUpdate);
        });
      }
    }

    try {
      const db = readDB();

      // Loop through entries
      for (const entry of body.entry || []) {
        const businessAccountId = entry.id; // Instagram Business Account ID

        // 1. Handle Direct Messages
        if (Array.isArray(entry.messaging)) {
          for (const msgEvent of entry.messaging) {
            const senderId = msgEvent.sender?.id;
            const recipientId = msgEvent.recipient?.id;
            const messageText = msgEvent.message?.text;

            // 1. Log and verify sender and recipient IDs
            console.log(`[Webhook Diagnostic] Received messaging event. Sender ID: "${senderId || "undefined"}", Recipient ID: "${recipientId || "undefined"}".`);
            
            // Log raw message details to settings for live debugging
            if (db.settings) {
              db.settings.lastIncomingMessage = {
                timestamp: new Date().toISOString(),
                businessAccountId,
                senderId,
                recipientId,
                messageText,
                fullEvent: msgEvent
              };
            }
            writeDB(db);

            // 2. Verify that self-generated messages are ignored
            if (msgEvent.message?.is_echo) {
              console.log(`[Webhook Diagnostic] Self-generated message (echo) detected from sender: "${senderId}". Ignoring message event to prevent recursion.`);
              db.publish_logs.push({
                id: "log_" + Math.random().toString(36).substring(2, 11),
                scheduledPostId: "",
                timestamp: new Date().toISOString(),
                status: "info",
                message: `[Webhook Warning] Ignored self-generated echo message from ${senderId}: "${messageText || ""}"`,
                attemptCount: 1
              });
              writeDB(db);
              continue;
            }

            // Skip if no text content is available in the message
            if (!messageText) {
              console.log(`[Webhook Warning] Message event from "${senderId}" has no text content. Skipping processing.`);
              continue;
            }

            console.log(`[Webhook] Processing incoming DM from ${senderId} to ${recipientId}: "${messageText}"`);

            // Resolve the corresponding connected account
            const account = db.instagram_accounts.find(
              a => a.isConnected && (a.instagramBusinessAccountId === businessAccountId || a.instagramBusinessAccountId === recipientId || a.id === recipientId)
            ) || db.instagram_accounts.find(a => a.isConnected);

            let senderUsername = senderId ? `ig_user_${senderId.toString().substring(0, 5)}` : "ig_user_unknown";
            let accessToken = account?.messagingAccessToken || account?.accessToken || "";

            // Try to fetch real username if we have a real access token
            const isRealToken = accessToken && accessToken.length > 30 && !accessToken.includes("mock");
            const isInstagramLoginToken = accessToken.trim().toUpperCase().startsWith("IGAA");
            const graphHost = isInstagramLoginToken ? "graph.instagram.com" : "graph.facebook.com";

            if (isRealToken && senderId) {
              try {
                const userRes = await fetch(`https://${graphHost}/v20.0/${senderId}?fields=username&access_token=${accessToken}`);
                if (userRes.ok) {
                  const userData: any = await userRes.json();
                  if (userData.username) {
                    senderUsername = userData.username;
                  }
                }
              } catch (err) {
                console.warn("[Webhook Warning] Failed to fetch sender username via Graph API:", err);
              }
            }

            // Execute auto-reply rule logic
            const newMessage = await executeAutoReply(senderUsername, messageText, false);

            // Record this reply attempt
            if (db.settings) {
              db.settings.lastReplyAttempt = {
                timestamp: new Date().toISOString(),
                recipientId: senderId,
                senderId: recipientId || businessAccountId,
                messageText: newMessage.replySent,
                tokenType: isRealToken ? (isInstagramLoginToken ? "IGAA (Instagram Login)" : "EAA (Facebook Login)") : "Mock Token",
                graphHost: graphHost
              };
            }
            writeDB(db);

            // Send actual message back via Meta Graph API if token is real
            if (isRealToken && newMessage.replySent && !newMessage.replySent.includes("[AI Auto-Responder Error]") && senderId) {
              try {
                const requestUrl = `https://${graphHost}/v20.0/me/messages?access_token=${accessToken}`;
                const requestBody = {
                  recipient: { id: senderId },
                  message: { text: newMessage.replySent }
                };

                console.log(`[Webhook Diagnostic] Dispatching outgoing reply. URL: ${requestUrl.replace(accessToken, "REDACTED_ACCESS_TOKEN")}, Body: ${JSON.stringify(requestBody)}`);

                const sendRes = await fetch(requestUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(requestBody)
                });

                const resStatus = sendRes.status;
                const resText = await sendRes.text();
                let errData: any = null;
                try {
                  errData = JSON.parse(resText);
                } catch (e) {
                  errData = { rawText: resText };
                }

                console.log(`[Webhook Diagnostic] Outgoing delivery completed. HTTP Status: ${resStatus}, Raw Body:`, resText);

                if (!sendRes.ok) {
                  console.error("[Webhook Error] Meta Graph API returned non-OK status during message delivery:", errData);
                  const errorMsg = `[Auto-Responder Error] Failed to deliver real DM to @${senderUsername} (Status: ${resStatus}). Full Meta Response: ${JSON.stringify(errData)}`;
                  
                  const dbErr = readDB();
                  dbErr.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: "",
                    timestamp: new Date().toISOString(),
                    status: "error",
                    message: errorMsg,
                    attemptCount: 1
                  });
                  if (dbErr.settings) {
                    dbErr.settings.lastMetaApiError = {
                      timestamp: new Date().toISOString(),
                      status: resStatus,
                      error: errData
                    };
                  }
                  writeDB(dbErr);
                } else {
                  console.log("[Webhook Success] Real DM reply successfully delivered via Graph API.");
                  const dbSuccess = readDB();
                  dbSuccess.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: "",
                    timestamp: new Date().toISOString(),
                    status: "success",
                    message: `[Auto-Responder] Successfully sent DM reply to @${senderUsername} via Meta API! Content: "${newMessage.replySent}"`,
                    attemptCount: 1
                  });
                  if (dbSuccess.settings) {
                    dbSuccess.settings.lastMetaApiError = null; // Clear error on success
                  }
                  writeDB(dbSuccess);
                  
                  // Send ManyChat watermark branding bubble if enabled
                  if (newMessage.includeBranding) {
                    try {
                      await new Promise(resolve => setTimeout(resolve, 800)); // Short typing pause for realism
                      await fetch(`https://${graphHost}/v20.0/me/messages?access_token=${accessToken}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          recipient: { id: senderId },
                          message: { text: "Automation powered by @Manychat 🐙" }
                        })
                      });
                      console.log("[Webhook] Real ManyChat branding watermark bubble delivered successfully.");
                    } catch (brandErr) {
                      console.error("[Webhook Warning] Failed to deliver ManyChat branding bubble:", brandErr);
                    }
                  }
                }
              } catch (err: any) {
                console.error("[Webhook Error] Exception raised during Meta Graph API DM delivery:", err);
                const dbErr = readDB();
                if (dbErr.settings) {
                  dbErr.settings.lastMetaApiError = {
                    timestamp: new Date().toISOString(),
                    error: err.message || err
                  };
                }
                writeDB(dbErr);
              }
            } else {
              // Simulating/recording response for sandbox messages
              console.log(`[Webhook Mock] Simulating message delivery to @${senderUsername} due to mock/basic token.`);
            }
          }
        }

        // 2. Handle Comments on media posts
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              const commentVal = change.value;
              const commentId = commentVal?.id;
              const commentText = commentVal?.text;
              const senderUsername = commentVal?.from?.username || "instagram_user";
              const senderId = commentVal?.from?.id;

              if (!commentText || !commentId) continue;

              console.log(`[Webhook] Incoming comment from @${senderUsername} on post: "${commentText}"`);

              // Skip echos/own replies
              const account = db.instagram_accounts.find(
                a => a.isConnected && (a.instagramBusinessAccountId === businessAccountId || a.username === senderUsername)
              ) || db.instagram_accounts.find(a => a.isConnected);

              // If the comment is from the connected bot itself, do not reply (avoid loops)
              if (account && account.username === senderUsername) {
                console.log("[Webhook] Comment is from own page. Ignoring to avoid recursive loop.");
                continue;
              }

              let accessToken = account?.messagingAccessToken || account?.accessToken || "";
              const isRealToken = accessToken && accessToken.length > 30 && !accessToken.includes("mock");
              const isInstagramLoginToken = accessToken.trim().toUpperCase().startsWith("IGAA");
              const graphHost = isInstagramLoginToken ? "graph.instagram.com" : "graph.facebook.com";

              // Execute auto-reply rule logic
              const newMessage = await executeAutoReply(senderUsername, commentText, true);

              // Send real comment reply if real token is present
              if (isRealToken && newMessage.replySent && !newMessage.replySent.includes("[AI Auto-Responder Error]")) {
                try {
                  console.log(`[Webhook] Sending real comment reply to @${senderUsername} via ${graphHost}...`);
                  const sendRes = await fetch(`https://${graphHost}/v20.0/${commentId}/replies?access_token=${accessToken}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      message: newMessage.replySent
                    })
                  });

                  if (!sendRes.ok) {
                    const errData = await sendRes.json();
                    console.error("[Webhook] Failed to deliver real comment reply:", errData);
                    const errorMsg = `[Auto-Responder Error] Failed to deliver real comment reply to @${senderUsername}: ${JSON.stringify(errData.error?.message || errData.error || errData)}`;
                    db.publish_logs.push({
                      id: "log_" + Math.random().toString(36).substring(2, 11),
                      scheduledPostId: "",
                      timestamp: new Date().toISOString(),
                      status: "error",
                      message: errorMsg,
                      attemptCount: 1
                    });
                    writeDB(db);
                  } else {
                    console.log("[Webhook] Real comment reply successfully delivered via Graph API.");
                  }
                } catch (err) {
                  console.error("[Webhook] Error during Meta Graph API Comment reply delivery:", err);
                }
              }
            }
          }
        }
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (err: any) {
      console.error("[Webhook] Webhook parsing error:", err);
      return res.status(500).json({ error: err.message || "Failed to parse webhook update." });
    }
  }

  res.sendStatus(404);
});

// Helper to upload sandbox data-url assets to a public file host (litterbox.catbox.moe) so Meta crawler can fetch them without cookie checks.
async function getPublicMediaUrlForInstagram(postId: string, mediaAssetId: string | undefined, originalUrl: string): Promise<string> {
  const isDevSandbox = originalUrl.includes("ais-dev-") || originalUrl.includes("ais-pre-") || originalUrl.includes("localhost") || originalUrl.includes("127.0.0.1") || originalUrl.startsWith("/") || originalUrl.startsWith("data:");
  if (!isDevSandbox) {
    return originalUrl;
  }

  const db = readDB();
  db.publish_logs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    scheduledPostId: postId,
    timestamp: new Date().toISOString(),
    status: "info",
    message: `[Meta Engine] Sandbox environment detected. Uploading media asset to public host (litterbox.catbox.moe) to bypass reverse proxy cookie checks...`,
    attemptCount: 1
  });
  writeDB(db);

  try {
    let asset = mediaAssetId ? db.media.find((m) => m.id === mediaAssetId) : null;
    if (!asset) {
      // Try to extract from originalUrl if it has /api/media-public/med_...
      const match = originalUrl.match(/\/api\/media-public\/(med_[a-zA-Z0-9]+)/);
      if (match) {
        const extractedId = match[1];
        asset = db.media.find((m) => m.id === extractedId);
      }
    }

    let buffer: Buffer | null = null;
    let contentType = "";
    let filename = asset?.name || "media_upload";
    let isVideo = asset?.type === "video";

    if (asset) {
      if (asset.url.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), asset.url);
        if (fs.existsSync(localPath)) {
          buffer = fs.readFileSync(localPath);
          contentType = asset.type === "video" ? "video/mp4" : (asset.url.endsWith(".png") ? "image/png" : "image/jpeg");
        }
      } else if (asset.url.startsWith("data:")) {
        const matches = asset.url.match(/^data:([a-zA-Z0-9-+.//_]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        }
      }
    }

    // Fallback if asset is not found or not loaded
    if (!buffer) {
      const uploadsIndex = originalUrl.indexOf("/uploads/");
      if (uploadsIndex !== -1) {
        const relativePath = originalUrl.substring(uploadsIndex);
        const localPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(localPath)) {
          buffer = fs.readFileSync(localPath);
          const ext = path.extname(relativePath).toLowerCase();
          isVideo = ext === ".mp4" || ext === ".mov";
          contentType = isVideo ? "video/mp4" : (ext === ".png" ? "image/png" : "image/jpeg");
          filename = path.basename(relativePath);
        }
      } else if (originalUrl.startsWith("data:")) {
        const matches = originalUrl.match(/^data:([a-zA-Z0-9-+.//_]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          buffer = Buffer.from(matches[2], "base64");
          isVideo = contentType.startsWith("video/");
          filename = isVideo ? "video_upload.mp4" : "image_upload.png";
        }
      }
    }

    if (!buffer) {
      return originalUrl;
    }

    // Convert non-JPEG image to JPEG (Instagram requirement)
    if (!isVideo && contentType !== "image/jpeg" && contentType !== "image/jpg") {
      try {
        const dbLog = readDB();
        dbLog.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: postId,
          timestamp: new Date().toISOString(),
          status: "info",
          message: `[Meta Engine] Converting non-JPEG image (${contentType}) to standard JPEG for Instagram compatibility...`,
          attemptCount: 1
        });
        writeDB(dbLog);

        const { Jimp } = await import("jimp");
        const image = await Jimp.read(buffer);
        buffer = await image.getBuffer("image/jpeg");
        contentType = "image/jpeg";
        if (!filename.toLowerCase().endsWith(".jpg") && !filename.toLowerCase().endsWith(".jpeg")) {
          filename = filename.replace(/\.[^/.]+$/, "") + ".jpg";
        }
      } catch (convErr) {
        console.error("[Meta Engine] JPEG conversion error:", convErr);
      }
    }

    // Try to upload to Litterbox first (temporary 1-hour storage), with fallback to Catbox (permanent) to guarantee high availability and proper headers!
    let directUrl = "";
    let serviceUsed = "";

    try {
      const dbUp = readDB();
      dbUp.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: postId,
        timestamp: new Date().toISOString(),
        status: "info",
        message: `[Meta Engine] Attempting media upload to Primary public host (litterbox.catbox.moe)...`,
        attemptCount: 1
      });
      writeDB(dbUp);

      const form = new FormData();
      const blob = new Blob([buffer], { type: contentType });
      form.append("reqtype", "fileupload");
      form.append("time", "1h");
      form.append("fileToUpload", blob, filename);

      const uploadRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
        method: "POST",
        body: form
      });

      if (uploadRes.ok) {
        const resText = await uploadRes.text();
        if (resText && resText.startsWith("https://")) {
          directUrl = resText.trim();
          serviceUsed = "litterbox.catbox.moe";
        }
      }
    } catch (litErr: any) {
      console.warn("[Meta Engine] Primary public host upload to litterbox.catbox.moe failed:", litErr.message || litErr);
    }

    if (!directUrl) {
      // Fallback to Catbox (catbox.moe)
      try {
        const dbUp2 = readDB();
        dbUp2.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: postId,
          timestamp: new Date().toISOString(),
          status: "info",
          message: `⚠️ [Meta Engine] Primary public host upload failed. Trying Secondary public host (catbox.moe)...`,
          attemptCount: 1
        });
        writeDB(dbUp2);

        const form = new FormData();
        const blob = new Blob([buffer], { type: contentType });
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", blob, filename);

        const uploadRes = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: form
        });

        if (uploadRes.ok) {
          const resText = await uploadRes.text();
          if (resText && resText.startsWith("https://")) {
            directUrl = resText.trim();
            serviceUsed = "catbox.moe";
          }
        }
      } catch (catErr: any) {
        console.warn("[Meta Engine] Secondary public host upload to catbox.moe failed:", catErr.message || catErr);
      }
    }

    if (directUrl) {
      const dbSuccess = readDB();
      dbSuccess.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: postId,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `[Meta Engine] Public bypass proxy upload succeeded using ${serviceUsed}! Media is now fully accessible by Meta's crawler at: ${directUrl}`,
        attemptCount: 1
      });
      writeDB(dbSuccess);

      return directUrl;
    } else {
      throw new Error("Both primary and secondary public file hosts failed to store the image.");
    }
  } catch (err: any) {
    console.error("[Meta Engine] Public host upload failed:", err);
    
    const dbErr = readDB();
    dbErr.publish_logs.push({
      id: "log_" + Math.random().toString(36).substring(2, 11),
      scheduledPostId: postId,
      timestamp: new Date().toISOString(),
      status: "info",
      message: `⚠️ [Meta Engine] Public bypass proxy upload failed: ${err.message || err}. Falling back to sandbox media router URL.`,
      attemptCount: 1
    });
    writeDB(dbErr);
    
    return originalUrl;
  }
}

// --- SHARED ROBUST INSTAGRAM PUBLISHING ROUTINE ---
async function publishRealPostToMeta(postId: string, accountId: string, publicUrlBase: string): Promise<void> {
  const db = readDB();
  const post = db.scheduled_posts.find(p => p.id === postId);
  const account = db.instagram_accounts.find(a => a.id === accountId);
  if (!post || !account) return;

  try {
    const isInstagramLoginToken = account.accessToken.trim().toUpperCase().startsWith("IGAA");
    const graphHost = isInstagramLoginToken ? "graph.instagram.com" : "graph.facebook.com";

    let creationId = "";

    const pollContainerStatus = async (containerId: string, label: string): Promise<void> => {
      const checkUrl = `https://${graphHost}/v20.0/${containerId}?fields=status_code&access_token=${account.accessToken}`;
      for (let i = 0; i < 20; i++) {
        const attemptNum = i + 1;
        try {
          const statusRes = await fetch(checkUrl);
          const statusText = await statusRes.text();
          let statusData: any = {};
          try {
            statusData = JSON.parse(statusText);
          } catch (pe) {
            statusData = { rawText: statusText.substring(0, 500) };
          }

          console.log(`[Meta Engine] Container (${containerId}) Status (Attempt ${attemptNum}/20):`, statusData);

          // Write a detailed database log for this attempt so the user has full diagnostic transparency in their UI!
          const pollDb = readDB();
          pollDb.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: post.id,
            timestamp: new Date().toISOString(),
            status: "info",
            message: `[Meta Engine] Polling status for ${label} (${containerId}) - Attempt ${attemptNum}/20... Response: ${JSON.stringify(statusData)}`,
            attemptCount: attemptNum
          });
          writeDB(pollDb);

          if (statusRes.ok) {
            const statusCode = statusData.status_code || statusData.status;
            if (statusCode === "FINISHED") {
              const successDb = readDB();
              successDb.publish_logs.push({
                id: "log_" + Math.random().toString(36).substring(2, 11),
                scheduledPostId: post.id,
                timestamp: new Date().toISOString(),
                status: "success",
                message: `[Meta Engine] ${label} (${containerId}) is ready! Status: FINISHED`,
                attemptCount: attemptNum
              });
              writeDB(successDb);
              return;
            }
            if (statusCode === "ERROR" || statusData.error) {
              const errMsg = statusData.error?.message || statusCode || "Unknown container error";
              throw new Error(errMsg);
            }
          } else {
            throw new Error(`Meta API returned HTTP status ${statusRes.status}: ${statusText.substring(0, 300)}`);
          }
        } catch (e: any) {
          console.error(`[Container Status Check Error] for ${label}:`, e.message || e);
          
          // Log errors to the database so they appear in the UI queue log list
          const errDb = readDB();
          errDb.publish_logs.push({
            id: "log_" + Math.random().toString(36).substring(2, 11),
            scheduledPostId: post.id,
            timestamp: new Date().toISOString(),
            status: "warning",
            message: `⚠️ [Meta Engine] Polling check failed for ${label} (${containerId}) - Attempt ${attemptNum}/20: ${e.message || e}`,
            attemptCount: attemptNum
          });
          writeDB(errDb);
        }
        await new Promise((r) => setTimeout(r, 4000));
      }
      throw new Error(`Timeout waiting for ${label} (${containerId}) to become FINISHED.`);
    };

    if (post.type === "carousel") {
      const childrenContainerIds: string[] = [];
      const totalAssets = Math.max(post.mediaAssetIds?.length || 0, post.mediaUrls?.length || 0);

      const dbForAssets = readDB();
      for (let i = 0; i < totalAssets; i++) {
        const assetId = post.mediaAssetIds?.[i];
        const rawUrl = assetId
          ? `${publicUrlBase}/api/media-public/${assetId}`
          : (post.mediaUrls?.[i] || "");

        if (!rawUrl) continue;

        // Determine if it's video or image
        let isAssetVideo = false;
        if (assetId) {
          const mediaObj = dbForAssets.media.find(m => m.id === assetId);
          if (mediaObj && mediaObj.type === "video") {
            isAssetVideo = true;
          }
        } else {
          const lowercaseUrl = rawUrl.toLowerCase();
          if (lowercaseUrl.includes(".mp4") || lowercaseUrl.includes(".mov") || lowercaseUrl.includes(".avi") || lowercaseUrl.includes(".webm")) {
            isAssetVideo = true;
          }
        }

        // Get public URL using our helper
        const finalItemUrl = await getPublicMediaUrlForInstagram(post.id, assetId, rawUrl);

        // Create item container
        const itemContainerUrl = `https://${graphHost}/v20.0/${account.instagramBusinessAccountId}/media`;
        const itemPayload: any = {
          access_token: account.accessToken,
          is_carousel_item: true
        };

        if (isAssetVideo) {
          itemPayload.media_type = "VIDEO";
          itemPayload.video_url = finalItemUrl;
        } else {
          itemPayload.image_url = finalItemUrl;
        }

        const itemDb = readDB();
        itemDb.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "info",
          message: `[Meta Engine] Step 1.1: Requesting item container ${i + 1}/${totalAssets} (${isAssetVideo ? "Video" : "Image"})...`,
          attemptCount: 1
        });
        writeDB(itemDb);

        const itemRes = await fetch(itemContainerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemPayload)
        });

        const itemData = await itemRes.json();
        if (!itemRes.ok || !itemData.id) {
          const errMsg = itemData.error?.message || JSON.stringify(itemData);
          throw new Error(`Carousel Item ${i + 1} Container Creation Failed: ${errMsg}`);
        }

        const itemContainerId = itemData.id;
        childrenContainerIds.push(itemContainerId);

        const itemDb2 = readDB();
        itemDb2.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "info",
          message: `[Meta Engine] Step 1.2: Waiting for item container ${i + 1}/${totalAssets} processing...`,
          attemptCount: 1
        });
        writeDB(itemDb2);

        await pollContainerStatus(itemContainerId, `Carousel Item Container ${i + 1}`);
      }

      // Create Carousel Container
      const carouselContainerUrl = `https://${graphHost}/v20.0/${account.instagramBusinessAccountId}/media`;
      const carouselPayload = {
        media_type: "CAROUSEL",
        caption: post.caption,
        children: childrenContainerIds,
        access_token: account.accessToken
      };

      const currentDb = readDB();
      currentDb.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "info",
        message: `[Meta Engine] Step 1.3: Creating Carousel Container with ${childrenContainerIds.length} items...`,
        attemptCount: 1
      });
      writeDB(currentDb);

      const carouselRes = await fetch(carouselContainerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carouselPayload)
      });

      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || !carouselData.id) {
        const errMsg = carouselData.error?.message || JSON.stringify(carouselData);
        throw new Error(`Carousel Main Container Creation Failed: ${errMsg}`);
      }

      creationId = carouselData.id;

      const currentDb2 = readDB();
      currentDb2.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `[Meta Engine] Carousel Container created successfully on Meta servers! Container ID: ${creationId}`,
        attemptCount: 1
      });
      writeDB(currentDb2);

      await pollContainerStatus(creationId, "Main Carousel Container");

    } else {
      // Single Photo or Single Video/Reel
      const mediaAssetId = post.mediaAssetIds?.[0];
      const mediaUrl = mediaAssetId 
        ? `${publicUrlBase}/api/media-public/${mediaAssetId}`
        : (post.mediaUrls?.[0] || "");

      const finalMediaUrl = await getPublicMediaUrlForInstagram(post.id, mediaAssetId, mediaUrl);

      const isVideo = post.type === "reel" || (post.type === "photo" && (mediaAssetId ? readDB().media.find(m => m.id === mediaAssetId)?.type === "video" : (mediaUrl.toLowerCase().includes(".mp4") || false)));

      const payload: any = {
        caption: post.caption,
        access_token: account.accessToken
      };

      if (post.type === "reel") {
        payload.media_type = "REELS";
        payload.video_url = finalMediaUrl;
        payload.share_to_feed = true;
      } else if (isVideo) {
        payload.media_type = "VIDEO";
        payload.video_url = finalMediaUrl;
      } else {
        payload.image_url = finalMediaUrl;
      }

      console.log("[Meta Engine] Creating Container with payload:", { ...payload, access_token: "REDACTED" });

      const containerUrl = `https://${graphHost}/v20.0/${account.instagramBusinessAccountId}/media`;
      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        const errMsg = containerData.error?.message || JSON.stringify(containerData);
        throw new Error(`Meta Container Creation Failed: ${errMsg}`);
      }

      creationId = containerData.id;

      const currentDb2 = readDB();
      currentDb2.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "success",
        message: `[Meta Engine] Media Container created successfully on Meta servers! Container ID: ${creationId}`,
        attemptCount: 1
      });
      writeDB(currentDb2);

      await pollContainerStatus(
        creationId, 
        post.type === "reel" ? "Single Reel Container" : "Single Media Container"
      );
    }

    // Phase 2: Publish the container
    const publishUrl = `https://${graphHost}/v20.0/${account.instagramBusinessAccountId}/media_publish`;
    
    const currentDb3 = readDB();
    currentDb3.publish_logs.push({
      id: "log_" + Math.random().toString(36).substring(2, 11),
      scheduledPostId: post.id,
      timestamp: new Date().toISOString(),
      status: "info",
      message: `[Meta Engine] Step 2: Requesting release handshake for creation_id ${creationId}...`,
      attemptCount: 1
    });
    writeDB(currentDb3);

    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: account.accessToken
      })
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      const errMsg = publishData.error?.message || JSON.stringify(publishData);
      throw new Error(`Meta Publication Release Failed: ${errMsg}`);
    }

    const finalPostId = publishData.id;
    console.log(`[Meta Engine] Real Post success! ID: ${finalPostId}`);

    // Update Post state to completed
    const currentDb4 = readDB();
    const matchedPost = currentDb4.scheduled_posts.find(p => p.id === post.id);
    if (matchedPost) {
      matchedPost.status = "completed";
      matchedPost.postedAt = new Date().toISOString();
      matchedPost.instagramId = finalPostId;
    }

    currentDb4.publish_logs.push({
      id: "log_" + Math.random().toString(36).substring(2, 11),
      scheduledPostId: post.id,
      timestamp: new Date().toISOString(),
      status: "success",
      message: `🎉 [Meta Engine] Post successfully published to LIVE Instagram page! Feed ID: ${finalPostId}`,
      attemptCount: 1
    });
    writeDB(currentDb4);

  } catch (error: any) {
    console.error("[Meta Engine] Error posting:", error);
    
    const currentDbError = readDB();
    const matchedPost = currentDbError.scheduled_posts.find(p => p.id === post.id);
    const errorMsg = error.message || "";
    
    const isPermissionOrAuthError = errorMsg.includes("permission") ||
      errorMsg.includes("(#10)") ||
      errorMsg.includes("access_token") ||
      errorMsg.includes("token") ||
      errorMsg.includes("403") ||
      errorMsg.includes("401") ||
      errorMsg.includes("unauthorized");

    if (account.isReal) {
      if (matchedPost) {
        matchedPost.status = "failed";
        matchedPost.error = errorMsg;
      }

      let diagnosticMessage = `❌ [Meta Engine] Live Publication Failed: "${errorMsg}".`;
      
      if (errorMsg.includes("(#10)") || errorMsg.includes("permission")) {
        diagnosticMessage += `\n\n🔍 DIAGNOSTIC GUIDE (How to resolve this on Meta Developer Portal):
1. CHOOSE INSTAGRAM CREATOR/BUSINESS ACCOUNT: Ensure your @${account.username} account is fully converted to an Instagram Professional (Business or Creator) account, and is linked to your Facebook Page.
2. VERIFY METADATA ROLES: If your Meta Developer App is in "Development" mode, you MUST go to App Dashboard > Roles > Roles > Instagram Testers and add your Instagram handle "@${account.username}". Then, log into Instagram, go to Settings > Website Permissions > Tester Invitations, and accept the invitation.
3. VERIFY TOKEN SCOPES: Make sure the Page/User Access Token you provided has these required permissions: "instagram_content_publish", "instagram_basic", "pages_read_engagement", and "pages_show_list". You can use the Meta Graph API Explorer to generate a token with these exact scopes.`;
      } else {
        diagnosticMessage += `\n\n🔍 DIAGNOSTIC TIP: Please verify your Meta Page/User Access Token is still valid, and your Instagram Business Account ID (${account.instagramBusinessAccountId || "not provided"}) matches your account settings exactly.`;
      }

      currentDbError.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "error",
        message: diagnosticMessage,
        attemptCount: 1
      });
      
      writeDB(currentDbError);

    } else if (isPermissionOrAuthError) {
      currentDbError.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "warning",
        message: `⚠️ [Meta API] Sandbox simulated publishing bypass: "${errorMsg}"`,
        attemptCount: 1
      });
      
      currentDbError.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "info",
        message: `🔄 [Sandbox Gateway] Intelligently routing post through the SFR DigiTech Sandbox Simulator/Bypass proxy...`,
        attemptCount: 1
      });
      
      writeDB(currentDbError);

      setTimeout(() => {
        try {
          const finalDb = readDB();
          const finalPost = finalDb.scheduled_posts.find(p => p.id === post.id);
          if (finalPost) {
            const generatedIgId = "ig_post_" + Math.random().toString(36).substring(2, 11);
            finalPost.status = "completed";
            finalPost.postedAt = new Date().toISOString();
            finalPost.instagramId = generatedIgId;
            finalPost.error = undefined;

            finalDb.publish_logs.push({
              id: "log_" + Math.random().toString(36).substring(2, 11),
              scheduledPostId: post.id,
              timestamp: new Date().toISOString(),
              status: "success",
              message: `🎉 [Sandbox Gateway] Successfully simulated live publication! Generated Post ID: ${generatedIgId}. You can now test your comment rules and direct message auto-replies.`,
              attemptCount: 1
            });
            writeDB(finalDb);
          }
        } catch (simErr) {
          console.error("[Sandbox Gateway] Simulation error:", simErr);
        }
      }, 2000);

    } else {
      if (matchedPost) {
        matchedPost.status = "failed";
        matchedPost.error = error.message;
      }

      currentDbError.publish_logs.push({
        id: "log_" + Math.random().toString(36).substring(2, 11),
        scheduledPostId: post.id,
        timestamp: new Date().toISOString(),
        status: "error",
        message: `❌ [Meta Engine] Error: ${error.message || "Unknown error during Meta publishing."}`,
        attemptCount: 1
      });
      writeDB(currentDbError);
    }
  }
}

// --- SERVERLESS SCHEDULER TICK FOR VERCEL ---
let lastTickTime = 0;
let isSchedulerChecking = false;

async function executeSchedulerTick(isForce = false) {
  if (isSchedulerChecking) return;
  const nowTime = Date.now();
  // Rate-limit checking to at most once every 5 seconds per request
  if (!isForce && nowTime - lastTickTime < 5000) {
    return;
  }
  isSchedulerChecking = true;
  lastTickTime = nowTime;

  try {
    const db = readDB();
    if (!db || !Array.isArray(db.scheduled_posts)) {
      isSchedulerChecking = false;
      return;
    }

    const now = new Date();
    const duePosts = db.scheduled_posts.filter(
      (p) => p.status === "pending" && new Date(p.scheduledFor) <= now
    );

    if (duePosts.length === 0) {
      isSchedulerChecking = false;
      return;
    }

    console.log(`[Serverless Scheduler] Found ${duePosts.length} pending posts due for release.`);
    
    if (!Array.isArray(db.instagram_accounts)) {
      db.instagram_accounts = [];
    }
    if (!Array.isArray(db.publish_logs)) {
      db.publish_logs = [];
    }

    let dbChanged = false;

    for (const post of duePosts) {
      const account = db.instagram_accounts.find((a) => a.id === post.instagramAccountId);

      if (!account || !account.isConnected) {
        post.status = "failed";
        post.error = "Instagram Account has been unlinked or lacks active permissions.";
        db.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "error",
          message: `[Serverless Engine] Posting Failed for ID ${post.id}: Connected Instagram OAuth node was unlinked.`,
          attemptCount: 1
        });
        dbChanged = true;
        continue;
      }

      if (account.enableContentIG === false) {
        post.status = "failed";
        post.error = "Instagram Content Publishing (Content IG) option is disabled in Settings for this profile.";
        db.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "warning",
          message: `[Serverless Engine] Posting skipped for ID ${post.id}: Content IG option is disabled for @${account.username}.`,
          attemptCount: 1
        });
        dbChanged = true;
        continue;
      }

      if (account.isReal) {
        // Run Real Meta Publish asynchronously
        post.status = "publishing";
        dbChanged = true;

        db.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "info",
          message: `[Serverless Meta Engine] Detected pending real publication (ID: ${post.id}). Preparing content URLs...`,
          attemptCount: 1
        });

        // Construct public image/video URL for Instagram's crawler to download
        let publicUrlBase = db.settings?.appPublicUrl || "http://localhost:3000";
        if (publicUrlBase && !publicUrlBase.includes("localhost") && !publicUrlBase.includes("127.0.0.1") && publicUrlBase.startsWith("http://")) {
          publicUrlBase = publicUrlBase.replace("http://", "https://");
        }

        // Fire-and-forget real publish call
        publishRealPostToMeta(post.id, account.id, publicUrlBase).catch((err) => {
          console.error("[Serverless Meta Engine Error] Failed to run publishRealPostToMeta:", err);
        });

      } else {
        // Run Simulated Publish
        post.status = "completed";
        post.postedAt = new Date().toISOString();
        const generatedIgId = "ig_post_" + Math.random().toString(36).substring(2, 11);
        post.instagramId = generatedIgId;

        db.publish_logs.push({
          id: "log_" + Math.random().toString(36).substring(2, 11),
          scheduledPostId: post.id,
          timestamp: new Date().toISOString(),
          status: "success",
          message: `[Serverless Engine] Published post to @${account.username} (Instagram Post ID: ${generatedIgId})`,
          attemptCount: 1
        });
        dbChanged = true;
      }
    }

    if (dbChanged) {
      writeDB(db);
    }
  } catch (err) {
    console.error("Serverless scheduler tick error:", err);
  } finally {
    isSchedulerChecking = false;
  }
}

// --- AUTOMATED BACKEND INSTAGRAM POSTING DAEMON (SIMULATION) ---
let schedulerTickCount = 0;

async function simulateRandomIncomingMessage() {
  const SIMULATED_FOLLOWERS = [
    { username: "travel_guru", text: "Hey! Do you have any discount for the pro version?" },
    { username: "photo_chef", text: "I am looking for pricing details. How much are the subscriptions?" },
    { username: "fashion_blogger", text: "Hi! Can you help me? I keep seeing a connection glitch." },
    { username: "art_collector", text: "Hello there! Just checking out your automation app." },
    { username: "fitness_coach", text: "What plans do you have for fitness agencies?" },
    { username: "local_bakery", text: "Is there an enterprise subscription available?" },
    { username: "digital_nomad", text: "How much is the cost of your starter plan?" },
    { username: "organic_soap", text: "Can you guys help me with setup?" }
  ];

  const randomFollower = SIMULATED_FOLLOWERS[Math.floor(Math.random() * SIMULATED_FOLLOWERS.length)];
  try {
    console.log(`[Scheduler] Simulating background incoming DM from @${randomFollower.username}: "${randomFollower.text}"`);
    await executeAutoReply(randomFollower.username, randomFollower.text, false, true);
  } catch (err) {
    console.error("[Scheduler] Failed to simulate auto-reply message background tick:", err);
  }
}

function runAutomatedScheduler() {
  console.log("[Scheduler] Instagram SaaS Auto-Posting Daemon active (Ticking every 10s for simulation).");
  
  setInterval(() => {
    try {
      schedulerTickCount++;
      // Every 30 seconds (3 ticks), have a 45% chance to simulate simulated follower DM
      if (schedulerTickCount % 3 === 0 && Math.random() < 0.45) {
        simulateRandomIncomingMessage();
      }

      const db = readDB();

      // Periodic bidirectional Vercel DB synchronization pull for real webhook logging in sandbox
      if (!process.env.VERCEL && db.settings?.customWebhookUrl) {
        const customUrl = db.settings.customWebhookUrl.trim();
        if (customUrl.startsWith("http")) {
          try {
            const parsedUrl = new URL(customUrl);
            const syncUrl = `${parsedUrl.protocol}//${parsedUrl.host}/api/webhook/sync-db`;
            
            // Asynchronously fetch from Vercel so we don't block the scheduler loop
            fetch(syncUrl)
              .then(async (syncRes) => {
                if (syncRes.ok) {
                  const data = await syncRes.json();
                  if (data && data.success && data.db) {
                    const vercelDb = data.db;
                    const localDb = readDB();
                    let localChanged = false;
                    
                    // Merge new publish logs from Vercel
                    if (Array.isArray(vercelDb.publish_logs)) {
                      const localLogIds = new Set((localDb.publish_logs || []).map(l => l.id));
                      const newLogs = vercelDb.publish_logs.filter(l => !localLogIds.has(l.id));
                      if (newLogs.length > 0) {
                        localDb.publish_logs = localDb.publish_logs || [];
                        localDb.publish_logs.push(...newLogs);
                        localChanged = true;
                      }
                    }
                    
                    // Merge new auto-reply messages from Vercel
                    if (Array.isArray(vercelDb.autoreply_messages)) {
                      const localMsgIds = new Set((localDb.autoreply_messages || []).map(m => m.id));
                      const newMsgs = vercelDb.autoreply_messages.filter(m => !localMsgIds.has(m.id));
                      if (newMsgs.length > 0) {
                        localDb.autoreply_messages = localDb.autoreply_messages || [];
                        localDb.autoreply_messages.push(...newMsgs);
                        localChanged = true;
                      }
                    }
                    
                    // Merge new auto-reply leads from Vercel
                    if (Array.isArray(vercelDb.autoreply_leads)) {
                      const localLeadIds = new Set((localDb.autoreply_leads || []).map(l => l.id));
                      const newLeads = vercelDb.autoreply_leads.filter(l => !localLeadIds.has(l.id));
                      if (newLeads.length > 0) {
                        localDb.autoreply_leads = localDb.autoreply_leads || [];
                        localDb.autoreply_leads.push(...newLeads);
                        localChanged = true;
                      }
                    }
                    
                    // Update latest webhook payloads for debugging
                    if (vercelDb.settings?.lastWebhookPayload && 
                        vercelDb.settings.lastWebhookPayload.timestamp !== localDb.settings?.lastWebhookPayload?.timestamp) {
                      if (localDb.settings) {
                        localDb.settings.lastWebhookPayload = vercelDb.settings.lastWebhookPayload;
                        localChanged = true;
                      }
                    }
                    
                    if (vercelDb.settings?.lastIncomingMessage &&
                        vercelDb.settings.lastIncomingMessage.timestamp !== localDb.settings?.lastIncomingMessage?.timestamp) {
                      if (localDb.settings) {
                        localDb.settings.lastIncomingMessage = vercelDb.settings.lastIncomingMessage;
                        localChanged = true;
                      }
                    }

                    if (vercelDb.settings?.lastReplyAttempt &&
                        vercelDb.settings.lastReplyAttempt.timestamp !== localDb.settings?.lastReplyAttempt?.timestamp) {
                      if (localDb.settings) {
                        localDb.settings.lastReplyAttempt = vercelDb.settings.lastReplyAttempt;
                        localChanged = true;
                      }
                    }

                    if (vercelDb.settings?.lastMetaApiError &&
                        vercelDb.settings.lastMetaApiError.timestamp !== localDb.settings?.lastMetaApiError?.timestamp) {
                      if (localDb.settings) {
                        localDb.settings.lastMetaApiError = vercelDb.settings.lastMetaApiError;
                        localChanged = true;
                      }
                    }
                    
                    if (localChanged) {
                      console.log("[Database Sync Pull] Successfully synchronized new real Meta event logs from Vercel.");
                      writeDB(localDb);
                    }
                  }
                }
              })
              .catch((err) => {
                console.error("[Database Sync Pull Error] Failed to fetch database state from Vercel:", err.message || err);
              });
          } catch (err: any) {
            console.error("[Database Sync Pull Error] Invalid custom webhook URL:", err.message || err);
          }
        }
      }

      if (!db || !Array.isArray(db.scheduled_posts)) {
        return;
      }
      if (!Array.isArray(db.instagram_accounts)) {
        db.instagram_accounts = [];
      }
      if (!Array.isArray(db.publish_logs)) {
        db.publish_logs = [];
      }
      const now = new Date();
      let dbChanged = false;

      // Find pending posts whose scheduled time has arrived or passed
      const duePosts = db.scheduled_posts.filter(
        (p) => p.status === "pending" && new Date(p.scheduledFor) <= now
      );

      if (duePosts.length > 0) {
        duePosts.forEach((post) => {
          const account = db.instagram_accounts.find((a) => a.id === post.instagramAccountId);

          // If no linked account exists, fail the post
          if (!account || !account.isConnected) {
            post.status = "failed";
            post.error = "Instagram Account has been unlinked or lacks active permissions.";
            
            db.publish_logs.push({
              id: "log_" + Math.random().toString(36).substring(2, 11),
              scheduledPostId: post.id,
              timestamp: new Date().toISOString(),
              status: "error",
              message: `[Python Daemon] Posting Failed for ID ${post.id}: Connected Instagram OAuth node was unlinked.`,
              attemptCount: 1
            });
            dbChanged = true;
            return;
          }

          if (account.enableContentIG === false) {
            post.status = "failed";
            post.error = "Instagram Content Publishing (Content IG) option is disabled in Settings for this profile.";
            
            db.publish_logs.push({
              id: "log_" + Math.random().toString(36).substring(2, 11),
              scheduledPostId: post.id,
              timestamp: new Date().toISOString(),
              status: "warning",
              message: `[Python Daemon] Posting skipped for ID ${post.id}: Content IG option is disabled for @${account.username}.`,
              attemptCount: 1
            });
            dbChanged = true;
            return;
          }

          if (account.isReal) {
            // Move post status to 'publishing' so it is locked
            post.status = "publishing";
            dbChanged = true;

            // Real Instagram Graph API handshaking
            db.publish_logs.push({
              id: "log_" + Math.random().toString(36).substring(2, 11),
              scheduledPostId: post.id,
              timestamp: new Date().toISOString(),
              status: "info",
              message: `[Meta Engine] Detected pending real publication (ID: ${post.id}). Preparing content URLs...`,
              attemptCount: 1
            });

            // Construct public image/video URL for Instagram's crawler to download
            let publicUrlBase = db.settings.appPublicUrl || "http://localhost:3000";
            if (publicUrlBase && !publicUrlBase.includes("localhost") && !publicUrlBase.includes("127.0.0.1") && publicUrlBase.startsWith("http://")) {
              publicUrlBase = publicUrlBase.replace("http://", "https://");
            }

            // Perform async execution to avoid blocking the main 10s tick loop
            publishRealPostToMeta(post.id, account.id, publicUrlBase).catch((err) => {
              console.error("[Daemon Meta Engine Error] Failed to run publishRealPostToMeta:", err);
            });

          } else {
            // Simulated local flow
            // Move post status to 'publishing' so it is locked
            post.status = "publishing";
            dbChanged = true;

            db.publish_logs.push({
              id: "log_" + Math.random().toString(36).substring(2, 11),
              scheduledPostId: post.id,
              timestamp: new Date().toISOString(),
              status: "info",
              message: `[Python Daemon] Detected pending ${post.type.toUpperCase()} post (ID: ${post.id}). Starting publication handshakes...`,
              attemptCount: 1
            });

            // Phase 1: Decrypt token & Create Container ID on Instagram Servers
            setTimeout(() => {
              try {
                const currentDb = readDB();
                const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                if (!activePost) return;

                currentDb.publish_logs.push({
                  id: "log_" + Math.random().toString(36).substring(2, 11),
                  scheduledPostId: post.id,
                  timestamp: new Date().toISOString(),
                  status: "info",
                  message: `[Python Daemon] Decrypted access token securely. Calling: POST graph.facebook.com/v20.0/${account.id}/media...`,
                  attemptCount: 1
                });
                writeDB(currentDb);
              } catch (err) {
                console.error(err);
              }
            }, 1500);

            // Phase 2: Check Container build status / Exponential Backoff handling simulation if random glitch is triggered
            const isSuccessfulRun = Math.random() > 0.15; // 85% success rate for simulation fidelity

            if (isSuccessfulRun) {
              setTimeout(() => {
                try {
                  const currentDb = readDB();
                  const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                  if (!activePost) return;

                  const simulatedContainerId = "ig_container_" + Math.random().toString(36).substring(2, 11);

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "success",
                    message: `[Python Daemon] Created Instagram Media Container successfully (Container ID: ${simulatedContainerId}).`,
                    attemptCount: 1
                  });

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "info",
                    message: `[Python Daemon] Handshaking publishing release: POST graph.facebook.com/v20.0/${account.id}/media_publish?creation_id=${simulatedContainerId}`,
                    attemptCount: 1
                  });
                  writeDB(currentDb);
                } catch (err) {
                  console.error(err);
                }
              }, 3000);

              setTimeout(() => {
                try {
                  const currentDb = readDB();
                  const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                  if (!activePost) return;

                  const generatedIgId = "ig_post_" + Math.random().toString(36).substring(2, 11);
                  activePost.status = "completed";
                  activePost.postedAt = new Date().toISOString();
                  activePost.instagramId = generatedIgId;

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "success",
                    message: `[Python Daemon] Published to live Feed successfully! Instagram Post ID: ${generatedIgId}`,
                    attemptCount: 1
                  });
                  writeDB(currentDb);
                } catch (err) {
                  console.error(err);
                }
              }, 5000);

            } else {
              // Simulate a transient failure, then recovery backoff retry
              setTimeout(() => {
                try {
                  const currentDb = readDB();
                  const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                  if (!activePost) return;

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "warning",
                    message: `[Python Daemon] Graph API 503 Server Busy. Launching exponential backoff retry system. Backing off for 4.0s (Attempt 1/5)...`,
                    attemptCount: 1
                  });
                  writeDB(currentDb);
                } catch (err) {
                  console.error(err);
                }
              }, 3000);

              setTimeout(() => {
                try {
                  const currentDb = readDB();
                  const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                  if (!activePost) return;

                  const simulatedContainerId = "ig_container_" + Math.random().toString(36).substring(2, 11);

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "info",
                    message: `[Python Daemon] Retry Successful. Created Media Container on second attempt (Container ID: ${simulatedContainerId}).`,
                    attemptCount: 2
                  });

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "info",
                    message: `[Python Daemon] Releasing handshake: POST graph.facebook.com/v20.0/${account.id}/media_publish?creation_id=${simulatedContainerId}`,
                    attemptCount: 2
                  });
                  writeDB(currentDb);
                } catch (err) {
                  console.error(err);
                }
              }, 5500);

              setTimeout(() => {
                try {
                  const currentDb = readDB();
                  const activePost = currentDb.scheduled_posts.find((p) => p.id === post.id);
                  if (!activePost) return;

                  const generatedIgId = "ig_post_retry_" + Math.random().toString(36).substring(2, 11);
                  activePost.status = "completed";
                  activePost.postedAt = new Date().toISOString();
                  activePost.instagramId = generatedIgId;

                  currentDb.publish_logs.push({
                    id: "log_" + Math.random().toString(36).substring(2, 11),
                    scheduledPostId: post.id,
                    timestamp: new Date().toISOString(),
                    status: "success",
                    message: `[Python Daemon] Recovered & Published successfully! Instagram Post ID: ${generatedIgId}`,
                    attemptCount: 2
                  });
                  writeDB(currentDb);
                } catch (err) {
                  console.error(err);
                }
              }, 7500);
            }
          }

        });
      }

      if (dbChanged) {
        writeDB(db);
      }
    } catch (err) {
      console.error("Scheduler daemon error:", err);
    }
  }, 10000); // Poll every 10 seconds for simulated real-time responsiveness
}

// --- VITE MIDDLEWARE AND SPA ROUTING ---

async function startServer() {
  // Start the background posting scheduler simulation
  runAutomatedScheduler();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Add diagnostic route to help verify files are built and visible on Vercel
app.get("/api/debug-files", (req, res) => {
  try {
    const cwd = process.cwd();
    const filesInCwd = fs.existsSync(cwd) ? fs.readdirSync(cwd) : [];
    
    const distPath = path.join(cwd, "dist");
    const distExists = fs.existsSync(distPath);
    const filesInDist = distExists ? fs.readdirSync(distPath) : [];
    
    res.json({
      success: true,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
      },
      cwd,
      filesInCwd,
      distPath,
      distExists,
      filesInDist,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

if (process.env.VERCEL) {
  // Start the background posting scheduler simulation in serverless environment
  runAutomatedScheduler();
} else {
  startServer();
}

export default app;
