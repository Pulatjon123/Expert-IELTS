import { PageHeader } from "@/components/ui";
import { QuestionManager } from "./QuestionManager";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Question management"
        subtitle="Add, edit and organise Writing questions and Speaking cue cards. Only label a question “Verified exam report” when you have a real source — and record it in the source note."
      />
      <QuestionManager />
    </div>
  );
}
