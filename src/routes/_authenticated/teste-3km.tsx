import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionPlaceholder } from "@/components/prescription-placeholder";

export const Route = createFileRoute("/_authenticated/teste-3km")({
  component: () => <PrescriptionPlaceholder title="Teste de 3KM" description="Avaliação de performance para definição de paces e zonas de treino." />,
});
