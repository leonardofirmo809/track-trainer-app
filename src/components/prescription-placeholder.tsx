import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PrescriptionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Construction className="size-5 text-primary" /> Em construção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Esta área receberá em breve as regras de cálculo, paces, zonas e geração automática da planilha.</p>
          <p className="text-sm text-muted-foreground">Por ora, use a área de <strong>Alunos</strong> para cadastrar corredores e organizar dados.</p>
        </CardContent>
      </Card>
    </div>
  );
}
