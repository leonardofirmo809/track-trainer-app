import { useRef, useState, type TouchEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-destructive/15 text-destructive",
  "bg-accent text-primary",
];

function colorFor(name: string) {
  const c = name.trim().charCodeAt(0) || 0;
  return PALETTE[c % PALETTE.length];
}

const REVEAL = 88;

export interface StudentCardData {
  id: string;
  full_name: string;
  programa: string | null;
  nivel: string | null;
}

export function StudentMobileCard({ s, onRemove }: { s: StudentCardData; onRemove?: () => void }) {
  const [tx, setTx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<"x" | "y" | null>(null);

  const initials = s.full_name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";

  const onStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  };
  const onMove = (e: TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }
    if (locked.current !== "x") return;
    const base = tx === -REVEAL ? -REVEAL : 0;
    const next = Math.max(-REVEAL, Math.min(0, base + dx));
    setTx(next);
  };
  const onEnd = () => {
    if (locked.current === "x") {
      setTx(tx < -REVEAL / 2 ? -REVEAL : 0);
    }
    startX.current = null;
    startY.current = null;
    locked.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute inset-y-0 right-0 w-[88px] bg-destructive text-destructive-foreground flex flex-col items-center justify-center gap-1 text-xs font-medium"
          aria-label="Remover aluno"
        >
          <Trash2 className="size-5" />
          Remover
        </button>
      )}
      <div
        className="relative bg-card border border-border rounded-lg transition-transform"
        style={{ transform: `translateX(${tx}px)` }}
        onTouchStart={onRemove ? onStart : undefined}
        onTouchMove={onRemove ? onMove : undefined}
        onTouchEnd={onRemove ? onEnd : undefined}
      >
        <Link
          to="/alunos/$studentId"
          params={{ studentId: s.id }}
          onClick={(e) => { if (tx !== 0) { e.preventDefault(); setTx(0); } }}
          className="flex items-center gap-3 p-3 min-h-16"
        >
          <Avatar className="size-10">
            <AvatarFallback className={cn("text-sm font-semibold", colorFor(s.full_name))}>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{s.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {[s.programa, s.nivel].filter(Boolean).join(" · ") || "Sem programa"}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground shrink-0" />
        </Link>
      </div>
    </div>
  );
}
