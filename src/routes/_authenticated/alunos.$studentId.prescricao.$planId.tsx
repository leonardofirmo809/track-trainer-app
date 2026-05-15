import { createFileRoute } from "@tanstack/react-router";
import { PrescricaoEditor } from "@/components/prescricao/PrescricaoEditor";

export const Route = createFileRoute("/_authenticated/alunos/$studentId/prescricao/$planId")({
  component: PrescricaoPage,
});

function PrescricaoPage() {
  const { studentId, planId } = Route.useParams();
  return <PrescricaoEditor studentId={studentId} planId={planId} variant="page" />;
}
