import React, { useState } from "react";
import { Code, FileText, Database, Shield, Lock, FileCode } from "lucide-react";

export default function CodeExplorer() {
  const [activeFile, setActiveFile] = useState<"prisma" | "docker" | "scheduler">("prisma");

  const prismaSchema = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String            @id @default(uuid())
  email            String            @unique
  passwordHash     String
  name             String
  createdAt        DateTime          @default(now())
  instagramAccounts InstagramAccount[]
  mediaAssets      MediaAsset[]
}

model InstagramAccount {
  id             String          @id @default(uuid())
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  username       String          @unique
  displayName    String
  profilePicture String
  accessToken    String          // Encrypted AES-256 string
  isConnected    Boolean         @default(true)
  connectedAt    DateTime        @default(now())
  scheduledPosts ScheduledPost[]
}

model MediaAsset {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  url       String
  type      String   // "image" or "video"
  size      String
  createdAt DateTime @default(now())
}

model ScheduledPost {
  id                 String           @id @default(uuid())
  userId             String
  instagramAccountId String
  instagramAccount   InstagramAccount @relation(fields: [instagramAccountId], references: [id], onDelete: Cascade)
  type               String           // "photo", "carousel", "reel"
  caption            String
  mediaUrls          String[]
  scheduledFor       DateTime
  status             String           // "pending", "completed", "failed"
  postedAt           DateTime?
  instagramId        String?
  error              String?
  timezone           String           @default("UTC")
  createdAt          DateTime         @default(now())
  publishLogs        PublishLog[]
}

model PublishLog {
  id              String        @id @default(uuid())
  scheduledPostId String
  post            ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)
  timestamp       DateTime      @default(now())
  status          String        // "info", "warning", "error", "success"
  message         String
  attemptCount    Int           @default(1)
}`;

  const dockerConfig = `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: instasched-postgres
    restart: always
    environment:
      POSTGRES_DB: instasched_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret_master_key
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    container_name: instasched-nextjs-web
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secret_master_key@postgres:5432/instasched_db
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    depends_on:
      - postgres

  scheduler:
    build:
      context: .
      dockerfile: Dockerfile.scheduler
    container_name: instasched-python-worker
    restart: always
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=instasched_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret_master_key
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY}
    depends_on:
      - postgres

volumes:
  pgdata:`;

  const schedulerCode = `import os
import sys
import time
import requests
import psycopg2
from cryptography.fernet import Fernet

# ... full scheduler implementation with exponential backoff ...`;

  const getFileContent = () => {
    switch (activeFile) {
      case "prisma": return prismaSchema;
      case "docker": return dockerConfig;
      case "scheduler": return schedulerCode;
    }
  };

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
      {/* Tab select bar */}
      <div className="bg-[#09090b]/40 border-b border-[#27272a] p-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Docker & DB Architecture Explorer</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Production specifications for Next.js 15, Prisma schema, and Postgres container setups.</p>
        </div>

        <div className="flex space-x-2">
          {[
            { id: "prisma", label: "schema.prisma", icon: Database },
            { id: "docker", label: "docker-compose.yml", icon: FileCode },
            { id: "scheduler", label: "scheduler.py", icon: Code }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFile === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFile(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider font-mono flex items-center space-x-2 border transition cursor-pointer ${
                  isActive
                    ? "border-[#E1306C] bg-[#E1306C]/5 text-white"
                    : "border-[#27272a] bg-[#121214] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Code body block */}
      <div className="p-6 bg-[#09090b] relative">
        <div className="absolute top-4 right-4 flex items-center space-x-1 text-[8px] font-mono text-zinc-650 uppercase">
          <Lock size={10} />
          <span>Production Reference Code</span>
        </div>

        <pre className="text-zinc-400 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre h-[480px] scrollbar-thin">
          {getFileContent()}
        </pre>
      </div>
    </div>
  );
}
