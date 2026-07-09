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
  messagingAccessToken?: string; // page access token
  isConnected: boolean;
  connectedAt: string;
  isReal?: boolean;
  instagramBusinessAccountId?: string;
  enableContentIG?: boolean;
  enableMessageEA?: boolean;
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
  appPublicUrl?: string;
  customWebhookUrl?: string;
  manychatBranding?: boolean;
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
  // ManyChat Enhancements
  delaySeconds?: number;
  buttons?: { label: string; triggerKeyword: string }[];
  captureLeadField?: "email" | "phone" | "none";
  captureSuccessText?: string;
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
  // ManyChat interactive payload
  buttons?: { label: string; triggerKeyword: string }[];
  isTyping?: boolean;
  includeBranding?: boolean;
}

export interface CapturedLead {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  lastInteracted: string;
  status: "new" | "qualified" | "contacted";
  notes?: string;
}
