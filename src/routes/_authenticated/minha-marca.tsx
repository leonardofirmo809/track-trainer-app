import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCoachBranding } from "@/lib/use-coach-branding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Save, Image as ImageIcon, Trash2, RefreshCw } from "lucide-react";


export const Route = createFileRoute("/_authenticated/minha-marca")({ component: MinhaMarca });

function MinhaMarca() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const branding = useCoachBranding();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primary, setPrimary] = useState("#0EA5E9");
  const [secondary, setSecondary] = useState("#0F172A");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding.data) {
      setLogoUrl(branding.data.logoUrl);
      setPrimary(branding.data.primary);
      setSecondary(branding.data.secondary);
    }
  }, [branding.data]);

  async function handleUpload(file: File) {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("A logo deve ter no máximo 2MB."); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("coach-branding").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("coach-branding").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setLogoUrl(url);
      toast.success("Logo enviada. Não esqueça de salvar.");
    } catch (e) {
      toast.error(`Falha no upload: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      // Se removeu a logo (logoUrl null) mas havia uma antes, limpa o storage também.
      if (!logoUrl && branding.data?.logoUrl) {
        const { data: files } = await supabase.storage.from("coach-branding").list(user.id);
        if (files && files.length > 0) {
          await supabase.storage.from("coach-branding").remove(files.map((f) => `${user.id}/${f.name}`));
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({ brand_logo_url: logoUrl, brand_primary_color: primary, brand_secondary_color: secondary })
        .eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["coach-branding", user.id] });
      toast.success("Identidade visual salva.");
    } catch (e) {
      toast.error(`Falha ao salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleRemoveLogo() {
    setLogoUrl(null);
    toast.info("Logo removida. Clique em Salvar para confirmar.");
  }


  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Minha marca</h1>
        <p className="text-muted-foreground">Personalize logo e cores que aparecerão nos PDFs gerados para os alunos.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Identidade visual</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="size-24 rounded-lg border bg-muted/40 grid place-items-center overflow-hidden">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="size-8 text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {logoUrl ? <RefreshCw /> : <Upload />} {uploading ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                        <Trash2 /> Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG ou JPG, até 2MB. Fundo transparente recomendado.</p>
                  <input
                    ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
                  />
                </div>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary">Cor primária</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input id="primary" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-14 h-10 p-1" />
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary">Cor secundária</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input id="secondary" type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-14 h-10 p-1" />
                  <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving}><Save /> {saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pré-visualização do PDF</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden bg-white text-black">
              <div className="flex items-center justify-between p-4" style={{ background: primary }}>
                <div className="flex items-center gap-3">
                  {logoUrl ? <img src={logoUrl} alt="" className="h-10 max-w-[140px] object-contain" /> : <span className="font-bold text-white">{branding.data?.coachName ?? "Treinador"}</span>}
                </div>
                <div className="text-right text-white">
                  <p className="font-bold text-lg leading-none">TESTE DE 3KM</p>
                  <p className="text-xs opacity-90">Zonas de Treinamento</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="font-bold text-lg">Nome do aluno</p>
                <div className="inline-block rounded border-2 px-3 py-2" style={{ borderColor: primary }}>
                  <p className="text-[10px] uppercase text-gray-500">FTP</p>
                  <p className="font-bold text-xl" style={{ color: primary }}>5:54 <span className="text-xs text-gray-500 font-normal">min/km</span></p>
                </div>
                <div className="rounded border overflow-hidden">
                  <div className="text-white text-xs font-bold px-3 py-2" style={{ background: secondary }}>Tabela de Zonas (Z1–Z5)</div>
                  <div className="p-3 text-xs text-gray-600">Cabeçalho usa cor secundária. Linhas das zonas mantêm o esquema verde→vermelho.</div>
                </div>
              </div>
              <div className="text-white text-xs px-4 py-2 flex justify-between" style={{ background: secondary }}>
                <span>Treinador: {branding.data?.coachName ?? "—"}</span>
                <span>{new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
