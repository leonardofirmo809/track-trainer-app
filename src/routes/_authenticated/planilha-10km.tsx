import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionPlaceholder } from "@/components/prescription-placeholder";

export const Route = createFileRoute("/_authenticated/planilha-10km")({
  component: () => <PrescriptionPlaceholder title="Planilha 10KM" description="Geração e acompanhamento de planilhas para a distância de 10KM." />,
});
