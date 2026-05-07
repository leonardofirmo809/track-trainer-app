import { supabase } from "./client";

const INSTALLED = Symbol.for("pacelab.serverFnAuthInterceptor");

export function installServerFnAuthInterceptor() {
  if (typeof window === "undefined") return;
  const g = globalThis as any;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (url && url.includes("/_serverFn/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers.set("authorization", `Bearer ${token}`);
        }
        if (input instanceof Request) {
          return originalFetch(new Request(input, { ...init, headers }));
        }
        return originalFetch(input, { ...init, headers });
      }
    } catch (e) {
      console.warn("[serverFnAuthInterceptor] failed:", e);
    }
    return originalFetch(input as any, init);
  };
}
