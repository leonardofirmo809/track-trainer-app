#!/usr/bin/env node
/**
 * Read-only Supabase drift check for 8020Pace.
 *
 * Runs two checks, both against the LINKED remote project, neither of which
 * writes anything to the database or to disk:
 *
 *   1. Migrations: `supabase migration list` — flags any local migration
 *      file that hasn't been applied remotely (or vice versa).
 *   2. Types: `supabase gen types typescript --linked` — compares the
 *      freshly generated schema types against the committed
 *      src/integrations/supabase/types.ts, in memory only.
 *
 * Context: on 2026-07-15 (see P6 investigation) two security RLS migrations
 * sat committed-but-unapplied in production for ~6 days across 5 Cloudflare
 * deploys before anyone noticed. types.ts was separately found to be
 * missing 3 tables that had existed in the live schema for two weeks. This
 * script exists to make both kinds of drift loud and easy to check before a
 * deploy, without giving the check itself any power to change the database.
 *
 * Usage: npm run check:supabase   (or: node scripts/check-supabase-sync.mjs)
 *
 * Exit code 0 = both checks passed. Exit code 1 = drift found, or a check
 * could not run to completion (e.g. CLI not linked/logged in) — treated as
 * failure, never silently skipped, so a broken check never reads as "safe".
 *
 * NEVER add `supabase db push`, `db reset`, `migration repair`, or any
 * write to this script. It must stay strictly read-only.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const TYPES_PATH = path.join(repoRoot, "src", "integrations", "supabase", "types.ts");

let overallOk = true;

function runSupabase(args) {
  try {
    const stdout = execFileSync("npx", ["supabase", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    return { ok: true, stdout };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? String(err.message ?? err),
    };
  }
}

// ── 1. Migrations ───────────────────────────────────────────────────────────
// `supabase migration list` prints a fixed-width text table (this CLI
// version, 2.107.0, ignores --output-format json for this subcommand — it
// was tried and produces identical text output, so we parse the table
// directly instead of pretending JSON support exists). Each data row looks
// like "   20260709120000 | 20260709120000 | 2026-07-09 12:00:00 ", with the
// Remote column left blank (spaces only) when a local migration hasn't been
// applied remotely yet. Header/separator/log lines are filtered out by
// requiring at least one of the first two columns to be a 14-digit
// timestamp — this is intentionally conservative rather than a full-fidelity
// table parser, per the instruction not to over-engineer a fragile parser.
console.log("── Checking Supabase migrations (local vs. remote) ──");
const migrationResult = runSupabase(["migration", "list"]);

if (!migrationResult.ok) {
  overallOk = false;
  console.error("❌ Could not run `supabase migration list` — treating as failure, not as \"synced\".");
  console.error(migrationResult.stderr || migrationResult.stdout || "(no output captured)");
  console.error("   Check that the Supabase CLI is linked and you can authenticate (this may prompt for the DB password).");
} else {
  const rows = migrationResult.stdout
    .split("\n")
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2 && (/^\d{14}$/.test(cells[0]) || /^\d{14}$/.test(cells[1])));

  if (rows.length === 0) {
    overallOk = false;
    console.error("❌ Could not parse any migration rows from `supabase migration list` output.");
    console.error("   The CLI output format may have changed — check manually: npx supabase migration list");
  } else {
    const localOnly = rows.filter(([local, remote]) => local && !remote).map(([local]) => local);
    const remoteOnly = rows.filter(([local, remote]) => remote && !local).map(([, remote]) => remote);

    if (localOnly.length === 0 && remoteOnly.length === 0) {
      console.log("✅ Supabase migrations sincronizadas: Local = Remote.");
    } else {
      overallOk = false;
      console.error("❌ Migrations fora de sincronia entre local e remoto.");
      if (localOnly.length > 0) {
        console.error("   Pendentes de aplicar no banco remoto (existem localmente, faltam no remoto):");
        for (const m of localOnly) console.error(`     - ${m}`);
        console.error("   Aplicar com: npx supabase db push  (revise a lista antes de confirmar)");
      }
      if (remoteOnly.length > 0) {
        console.error("   Aplicadas no remoto mas sem arquivo local correspondente:");
        for (const m of remoteOnly) console.error(`     - ${m}`);
        console.error("   Isso é incomum — investigue manualmente antes de rodar qualquer db push/repair.");
      }
    }
  }
}

// ── 2. types.ts drift ───────────────────────────────────────────────────────
// Compares freshly generated types (stdout only, never written to disk by
// this script) against the committed file. Normalizes line endings and a
// possible BOM before comparing, since the committed file is CRLF+BOM on
// this project while `gen types` emits LF-only — a naive byte comparison
// would report drift on every line even with identical schema content.
console.log("\n── Checking src/integrations/supabase/types.ts vs. remote schema ──");
const typesResult = runSupabase(["gen", "types", "typescript", "--linked"]);

function normalize(text) {
  return text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
}

function extractEntryNames(text) {
  // Best-effort summary only: matches 6-space-indented "name: {" lines,
  // which covers Tables/Views/Functions entries under `public`. Not a full
  // parser — good enough to name what changed, not to be the source of truth.
  return new Set([...text.matchAll(/^ {6}([a-zA-Z_][a-zA-Z0-9_]*): \{$/gm)].map((m) => m[1]));
}

if (!typesResult.ok) {
  overallOk = false;
  console.error("❌ Could not run `supabase gen types typescript --linked` — treating as failure, not as \"synced\".");
  console.error(typesResult.stderr || "(no output captured)");
} else {
  let committed;
  try {
    committed = readFileSync(TYPES_PATH, "utf8");
  } catch (err) {
    overallOk = false;
    console.error(`❌ Could not read ${path.relative(repoRoot, TYPES_PATH)}: ${err.message}`);
    committed = null;
  }

  if (committed !== null) {
    const generatedNormalized = normalize(typesResult.stdout);
    const committedNormalized = normalize(committed);

    if (generatedNormalized === committedNormalized) {
      console.log("✅ Supabase types.ts sincronizado com schema remoto.");
    } else {
      overallOk = false;
      console.error("❌ src/integrations/supabase/types.ts está desatualizado em relação ao schema remoto.");

      const committedNames = extractEntryNames(committedNormalized);
      const generatedNames = extractEntryNames(generatedNormalized);
      const missing = [...generatedNames].filter((n) => !committedNames.has(n));
      const extra = [...committedNames].filter((n) => !generatedNames.has(n));
      if (missing.length > 0) console.error(`   Faltando em types.ts (existem no schema remoto): ${missing.join(", ")}`);
      if (extra.length > 0) console.error(`   Presentes em types.ts mas não no schema remoto: ${extra.join(", ")}`);
      if (missing.length === 0 && extra.length === 0) {
        console.error("   Mesmas tabelas/entradas em ambos, mas o conteúdo interno difere (campos, tipos, comentários) — revise manualmente.");
      }

      console.error("   Este script NÃO sobrescreve o arquivo. Para atualizar manualmente:");
      console.error(`     npx supabase gen types typescript --linked > ${path.relative(repoRoot, TYPES_PATH)}`);
    }
  }
}

console.log("");
if (!overallOk) {
  console.error("Resultado: FALHOU — ver detalhes acima. Não faça deploy até resolver.");
  process.exit(1);
}
console.log("Resultado: OK — Supabase (migrations e types) sincronizado com o repositório.");
