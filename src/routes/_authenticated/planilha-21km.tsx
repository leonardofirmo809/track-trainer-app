import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionPlaceholder } from "@/components/prescription-placeholder";

export const Route = createFileRoute("/_authenticated/planilha-21km")({
  component: () => <PrescriptionPlaceholder title="Planilha 21KM" description="Geração e acompanhamento de planilhas para meia maratona." />,
});
