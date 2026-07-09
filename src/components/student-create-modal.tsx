import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useIsMobile } from "@/hooks/use-mobile";
import { createStudent, listAccessibleCompanies } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.union([z.literal(""), z.string().trim().email("E-mail inválido").max(255)]),
  phone: z.string().trim().max(32).optional(),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface Company { id: string; name: string }

const EMPTY_FORM = { full_name: "", email: "", phone: "" };

export function StudentCreateModal({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the newly created student right after a successful save. */
  onCreated?: (student: { id: string; full_name: string }) => void;
}) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // Company selection
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const createFn = useServerFn(createStudent);
  const listCompaniesFn = useServerFn(listAccessibleCompanies);

  // Load accessible companies when modal opens (once per open)
  useEffect(() => {
    if (!open) return;
    setCompaniesLoading(true);
    listCompaniesFn()
      .then((data) => {
        const list = (data ?? []) as Company[];
        setCompanies(list);
        // Auto-select if only one option
        if (list.length === 1) setSelectedCompanyId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setCompaniesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const canSave = form.full_name.trim().length >= 2;

  const reset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSelectedCompanyId("");
    setCompanies([]);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Errors] = i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const created = await createFn({
        data: {
          fullName: parsed.data.full_name,
          email: parsed.data.email || undefined,
          phone: parsed.data.phone || undefined,
          companyId: selectedCompanyId || undefined,
        },
      });
      toast.success("Aluno cadastrado!");
      qc.invalidateQueries({ queryKey: ["students"] });
      onCreated?.({ id: created.id, full_name: parsed.data.full_name });
      reset();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Response
        ? await e.text()
        : e instanceof Error ? e.message : "Erro ao cadastrar aluno";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
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

      {/* Company selector — shown only when user has accessible companies */}
      {!companiesLoading && companies.length > 0 && (
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Sem empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sem empresa</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Selecione a empresa à qual este aluno pertence.
          </p>
        </div>
      )}
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
