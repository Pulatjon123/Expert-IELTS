import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { getHomepageContent } from "@/lib/site";
import { SiteForm } from "./SiteForm";

export default async function Page() {
  const [homepage, announcements] = await Promise.all([getHomepageContent(), prisma.announcement.findMany({ orderBy: { createdAt: "desc" } })]);
  return (
    <div>
      <PageHeader title="Website" subtitle="Homepage text and announcements shown to every visitor." />
      <SiteForm homepage={homepage} announcements={announcements.map((a) => ({ id: a.id, title: a.title, body: a.body, active: a.active }))} />
    </div>
  );
}
