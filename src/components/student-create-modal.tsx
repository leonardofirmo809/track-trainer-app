import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido").max(255)]),
  phone: z.string().trim().max(32).optional(),
  programa: z.enum(["10km", "21km", "42km"], { message: "Selecione o programa" }),
  nivel: z.enum(["1", "2"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

export function StudentCreateModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", programa: "", nivel: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const canSave = form.full_name.trim().length >= 2 && !!form.programa;

  const reset = () => {
    setForm({ full_name: "", email: "", phone: "", programa: "", nivel: "", notes: "" });
    setErrors({});
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Errors] = i.message;
      setErrors(errs);
      return;
    }
    if (!user) return;
    setSaving(true);
    const levelMap: Record<string, string> = { "1": "iniciante", "2": "intermediario" };
    const { error } = await supabase.from("students").insert({
      coach_id: user.id,
      full_name: parsed.data.full_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      target_distance: parsed.data.programa as "10km" | "21km" | "42km",
      level: parsed.data.nivel ? (levelMap[parsed.data.nivel] as "iniciante" | "intermediario") : null,
      notes: parsed.data.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aluno cadastrado!");
    qc.invalidateQueries({ queryKey: ["students"] });
    reset();
    onOpenChange(false);
  };

  const Body = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="sn-name">Nome completo *</Label>
        <Input id="sn-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sn-email">E-mail</Label>
        <Input id="sn-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sn-phone">Telefone</Label>
        <Input id="sn-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={32} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Programa *</Label>
          <Select value={form.programa} onValueChange={(v) => set("programa", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10km">10 km</SelectItem>
              <SelectItem value="21km">21 km</SelectItem>
              <SelectItem value="42km">42 km</SelectItem>
            </SelectContent>
          </Select>
          {errors.programa && <p className="text-xs text-destructive">{errors.programa}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Nível</Label>
          <Select value={form.nivel} onValueChange={(v) => set("nivel", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Nível 1</SelectItem>
              <SelectItem value="2">Nível 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sn-notes">Observações</Label>
        <Textarea id="sn-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} />
      </div>
    </div>
  );

  const Actions = (
    <>
      <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
      <Button onClick={submit} disabled={!canSave || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="text-left">
            <SheetTitle>Novo aluno</SheetTitle>
            <SheetDescription>Cadastre um novo corredor</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{Body}</div>
          <SheetFooter className="mt-6 flex-row justify-end gap-2">{Actions}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo aluno</DialogTitle>
          <DialogDescription>Cadastre um novo corredor</DialogDescription>
        </DialogHeader>
        {Body}
        <DialogFooter>{Actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
