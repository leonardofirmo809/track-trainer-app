import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionPlaceholder } from "@/components/prescription-placeholder";

export const Route = createFileRoute("/_authenticated/planilha-42km")({
  component: () => <PrescriptionPlaceholder title="Planilha 42KM" description="Geração e acompanhamento de planilhas para maratona." />,
});
