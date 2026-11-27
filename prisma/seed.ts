import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { speakingPart1, speakingPart2and3, writingTask1, writingTask2 } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  // Owner account from environment variables — the password is only ever stored as a bcrypt hash.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      create: { email, name: process.env.ADMIN_NAME ?? "Site Owner", passwordHash, role: "ADMIN" },
      update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`Admin account ready: ${email}`);
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin account created.");
  }

  if ((await prisma.writingQuestion.count()) === 0) {
    await prisma.writingQuestion.createMany({
      data: [
        ...writingTask1.map((q) => ({ ...q, task: "TASK1" as const, source: "PRACTICE" as const })),
        ...writingTask2.map((q) => ({ ...q, task: "TASK2" as const, source: "PRACTICE" as const })),
      ],
    });
    console.log(`Seeded ${writingTask1.length + writingTask2.length} writing questions.`);
  }

  if ((await prisma.speakingTopic.count()) === 0) {
    for (const s of speakingPart1) {
      await prisma.speakingTopic.create({ data: { part: 1, topic: s.topic, title: s.title, questions: s.questions, source: "PRACTICE" } });
    }
    for (const s of speakingPart2and3) {
      const p2 = await prisma.speakingTopic.create({
        data: { part: 2, topic: s.topic, title: s.title, questions: [], cueCard: s.cueCard, bulletPoints: s.bulletPoints, source: "PRACTICE" },
      });
      await prisma.speakingTopic.create({
        data: { part: 3, topic: s.topic, title: `Discussion: ${s.title.toLowerCase()}`, questions: s.part3, linkedTopicId: p2.id, source: "PRACTICE" },
      });
    }
    console.log("Seeded speaking topics.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
