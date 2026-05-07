import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionPlaceholder } from "@/components/prescription-placeholder";

export const Route = createFileRoute("/_authenticated/planilha-5km")({
  component: () => <PrescriptionPlaceholder title="Planilha 5KM" description="Geração e acompanhamento de planilhas para a distância de 5KM." />,
});
