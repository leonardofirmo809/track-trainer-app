import { createFileRoute, Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

const SPECIALTIES = ["10km", "21km", "42km", "Trail", "Triathlon", "Todas"] as const;

const nameSchema = z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres");
const bioSchema = z.string().trim().max(280, "Máximo 280 caracteres");

function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState<string>("10km");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, specialty, bio, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        if (data.full_name) setFullName(data.full_name);
        if (data.specialty) setSpecialty(data.specialty);
        if (data.bio) setBio(data.bio);
        if (data.onboarding_completed) {
          navigate({ to: "/dashboard" });
          return;
        }
      }
      setChecked(true);
    })();
  }, [user, navigate]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!checked) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;

  const goNext = () => {
    if (step === 1) {
      const r = nameSchema.safeParse(fullName);
      if (!r.success) return toast.error(r.error.issues[0].message);
      setFullName(r.data);
      setStep(2);
    } else if (step === 2) {
      const r = bioSchema.safeParse(bio);
      if (!r.success) return toast.error(r.error.issues[0].message);
      setBio(r.data);
      setStep(3);
    }
  };

  const finish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, specialty, bio: bio || null, onboarding_completed: true })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil configurado!");
    router.invalidate();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl bg-primary grid place-items-center">
              <Activity className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">PaceLab</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Passo {step} de 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <Progress value={(step / 3) * 100} />
          </div>
        </CardHeader>

        {step === 1 && (
          <>
            <CardHeader className="pt-0">
              <CardTitle>Bem-vindo(a) ao sistema!</CardTitle>
              <CardDescription>Vamos configurar seu perfil em alguns passos rápidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Como prefere ser chamado(a)?</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex.: Coach Ana"
                  maxLength={80}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={goNext}>Continuar</Button>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader className="pt-0">
              <CardTitle>Sua especialidade</CardTitle>
              <CardDescription>Conte um pouco mais sobre o seu trabalho.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Qual sua principal modalidade?</Label>
                <RadioGroup value={specialty} onValueChange={setSpecialty} className="grid grid-cols-2 gap-2">
                  {SPECIALTIES.map((s) => (
                    <Label
                      key={s}
                      htmlFor={`sp-${s}`}
                      className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                    >
                      <RadioGroupItem id={`sp-${s}`} value={s} />
                      <span>{s}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio curta (aparecerá para seus atletas)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ex.: Treinador de corrida com 10 anos de experiência…"
                  maxLength={280}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/280</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1" onClick={goNext}>Continuar</Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader className="pt-0 items-center text-center">
              <CheckCircle2 className="size-12 text-primary mb-2" />
              <CardTitle>Tudo pronto!</CardTitle>
              <CardDescription>Seu perfil está configurado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> {fullName}</p>
                <p><span className="text-muted-foreground">Modalidade:</span> {specialty}</p>
                {bio && <p><span className="text-muted-foreground">Bio:</span> {bio}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={saving}>Voltar</Button>
                <Button className="flex-1" onClick={finish} disabled={saving}>
                  {saving ? "Salvando…" : "Ir para o dashboard"}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
