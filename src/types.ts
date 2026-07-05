export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface InstagramAccount {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  profilePicture: string;
  accessToken: string; // encrypted
  isConnected: boolean;
  connectedAt: string;
  isReal?: boolean;
  instagramBusinessAccountId?: string;
}

export interface MediaAsset {
  id: string;
  userId: string;
  name: string;
  url: string;
  type: "image" | "video";
  size: string;
  createdAt: string;
}

export interface ScheduledPost {
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

export interface PublishLog {
  id: string;
  scheduledPostId: string;
  timestamp: string;
  status: "info" | "warning" | "error" | "success";
  message: string;
  attemptCount: number;
  responsePayload?: string;
}

export interface BotSettings {
  timezone: string;
  isBotConnected: boolean;
  lastHeartbeat: string | null;
}

export interface AICaptionResponse {
  variations: string[];
  hashtags: string[];
  optimalTime: string;
  strategyTip: string;
}

export interface AutoReplyRule {
  id: string;
  triggerType: "keyword" | "always";
  keywords: string[];
  replyType: "static" | "ai";
  staticReplyText: string;
  aiPromptInstruction: string;
  isActive: boolean;
  createdAt: string;
}

export interface InstagramMessage {
  id: string;
  senderUsername: string;
  messageText: string;
  timestamp: string;
  replySent?: string;
  replyType?: "static" | "ai" | "none";
  matchedRuleId?: string;
  isComment?: boolean;
}
