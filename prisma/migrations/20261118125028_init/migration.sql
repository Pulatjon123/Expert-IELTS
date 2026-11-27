-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WritingTask" AS ENUM ('TASK1', 'TASK2');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('VERIFIED_REPORT', 'AI_GENERATED', 'PRACTICE');

-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'EVALUATED', 'FAILED');

-- CreateEnum
CREATE TYPE "SpeakingMode" AS ENUM ('PRACTICE', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "WeaknessStatus" AS ENUM ('ACTIVE', 'IMPROVING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "VocabKind" AS ENUM ('WORD', 'COLLOCATION', 'PHRASE');

-- CreateEnum
CREATE TYPE "UsageVerdict" AS ENUM ('CORRECT', 'INCORRECT', 'UNNATURAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "targetBand" DOUBLE PRECISION,
    "examDate" TIMESTAMP(3),
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingQuestion" (
    "id" TEXT NOT NULL,
    "task" "WritingTask" NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "visual" JSONB,
    "imageUrl" TEXT,
    "source" "QuestionSource" NOT NULL DEFAULT 'PRACTICE',
    "sourceNote" TEXT,
    "reportedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingTopic" (
    "id" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questions" TEXT[],
    "cueCard" TEXT,
    "bulletPoints" TEXT[],
    "linkedTopicId" TEXT,
    "source" "QuestionSource" NOT NULL DEFAULT 'PRACTICE',
    "sourceNote" TEXT,
    "reportedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "questionId" TEXT NOT NULL,
    "servedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingPrep" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingPrep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "status" "AttemptStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "WritingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingDraftVersion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingDraftVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingAssessment" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "taBand" DOUBLE PRECISION NOT NULL,
    "ccBand" DOUBLE PRECISION NOT NULL,
    "lrBand" DOUBLE PRECISION NOT NULL,
    "graBand" DOUBLE PRECISION NOT NULL,
    "feedback" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingPrep" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingPrep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "mode" "SpeakingMode" NOT NULL,
    "part" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "interview" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingRecording" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "transcript" TEXT,
    "segments" JSONB,
    "annotations" JSONB,
    "audioMetrics" JSONB,
    "pronunciation" JSONB,
    "sttProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingAssessment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "overallBand" DOUBLE PRECISION,
    "fcBand" DOUBLE PRECISION NOT NULL,
    "lrBand" DOUBLE PRECISION NOT NULL,
    "graBand" DOUBLE PRECISION NOT NULL,
    "pronBand" DOUBLE PRECISION,
    "pronunciationAssessed" BOOLEAN NOT NULL DEFAULT false,
    "feedback" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weakness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skills" "Skill"[],
    "severity" INTEGER NOT NULL DEFAULT 2,
    "explanation" TEXT NOT NULL,
    "recommendedPractice" TEXT NOT NULL,
    "status" "WeaknessStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Weakness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaknessOccurrence" (
    "id" TEXT NOT NULL,
    "weaknessId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "correction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeaknessOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expression" TEXT NOT NULL,
    "kind" "VocabKind" NOT NULL,
    "uzbek" TEXT,
    "definition" TEXT,
    "example" TEXT,
    "topic" TEXT,
    "learned" BOOLEAN NOT NULL DEFAULT false,
    "sourceSkill" "Skill",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabUsage" (
    "id" TEXT NOT NULL,
    "vocabId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "verdict" "UsageVerdict" NOT NULL,
    "context" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandComparison" (
    "id" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "questionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BandComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "audioSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "WritingQuestion_task_isActive_idx" ON "WritingQuestion"("task", "isActive");

-- CreateIndex
CREATE INDEX "SpeakingTopic_part_isActive_idx" ON "SpeakingTopic"("part", "isActive");

-- CreateIndex
CREATE INDEX "QuestionHistory_userId_skill_servedAt_idx" ON "QuestionHistory"("userId", "skill", "servedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_skill_questionId_key" ON "Bookmark"("userId", "skill", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingPrep_questionId_key" ON "WritingPrep"("questionId");

-- CreateIndex
CREATE INDEX "WritingAttempt_userId_createdAt_idx" ON "WritingAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WritingDraftVersion_attemptId_createdAt_idx" ON "WritingDraftVersion"("attemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WritingAssessment_attemptId_key" ON "WritingAssessment"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingPrep_topicId_key" ON "SpeakingPrep"("topicId");

-- CreateIndex
CREATE INDEX "SpeakingSession_userId_createdAt_idx" ON "SpeakingSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingRecording_sessionId_attempt_questionIndex_idx" ON "SpeakingRecording"("sessionId", "attempt", "questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingAssessment_sessionId_attempt_key" ON "SpeakingAssessment"("sessionId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "Weakness_userId_key_key" ON "Weakness"("userId", "key");

-- CreateIndex
CREATE INDEX "WeaknessOccurrence_weaknessId_createdAt_idx" ON "WeaknessOccurrence"("weaknessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VocabItem_userId_expression_key" ON "VocabItem"("userId", "expression");

-- CreateIndex
CREATE INDEX "VocabUsage_vocabId_createdAt_idx" ON "VocabUsage"("vocabId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "BandComparison_skill_questionId_key" ON "BandComparison"("skill", "questionId");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionHistory" ADD CONSTRAINT "QuestionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingPrep" ADD CONSTRAINT "WritingPrep_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WritingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAttempt" ADD CONSTRAINT "WritingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAttempt" ADD CONSTRAINT "WritingAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WritingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingDraftVersion" ADD CONSTRAINT "WritingDraftVersion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "WritingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingAssessment" ADD CONSTRAINT "WritingAssessment_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "WritingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingPrep" ADD CONSTRAINT "SpeakingPrep_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SpeakingTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingRecording" ADD CONSTRAINT "SpeakingRecording_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingAssessment" ADD CONSTRAINT "SpeakingAssessment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weakness" ADD CONSTRAINT "Weakness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaknessOccurrence" ADD CONSTRAINT "WeaknessOccurrence_weaknessId_fkey" FOREIGN KEY ("weaknessId") REFERENCES "Weakness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabItem" ADD CONSTRAINT "VocabItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabUsage" ADD CONSTRAINT "VocabUsage_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "VocabItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
