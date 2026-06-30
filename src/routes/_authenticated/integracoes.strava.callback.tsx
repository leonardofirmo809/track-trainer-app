import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { handleStravaCallback } from "@/lib/strava.functions";

interface CallbackSearch {
  code?: string;
  state?: string;
  error?: string;
}

export const Route = createFileRoute("/_authenticated/integracoes/strava/callback")({
  validateSearch: (s: Record<string, unknown>): CallbackSearch => ({
    code: typeof s.code === "string" ? s.code : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: StravaCallbackPage,
});

function StravaCallbackPage() {
  const { code, state, error: stravaError } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (stravaError) {
      setStatus("error");
      setErrorMsg(
        stravaError === "access_denied"
          ? "Você recusou a autorização do Strava. Tente novamente quando quiser conectar."
          : `Erro retornado pelo Strava: ${stravaError}`
      );
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Parâmetros de callback inválidos. Tente conectar novamente.");
      return;
    }

    handleStravaCallback({ data: { code, state } })
      .then(() => {
        void navigate({ to: "/minha-conta" });
      })
      .catch((e: unknown) => {
        let msg = "Falha ao conectar o Strava.";
        if (e instanceof Error) msg = e.message;
        else if (typeof e === "string") msg = e;
        setStatus("error");
        setErrorMsg(msg);
      });
  }, [code, state, stravaError, navigate]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      {status === "processing" ? (
        <>
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Conectando ao Strava…</p>
        </>
      ) : (
        <div className="space-y-3 max-w-sm">
          <p className="text-destructive font-medium">{errorMsg}</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => void navigate({ to: "/minha-conta" })}
          >
            Voltar para Minha Conta
          </button>
        </div>
      )}
    </div>
  );
}
