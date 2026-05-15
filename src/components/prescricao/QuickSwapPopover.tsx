import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  INTENSITY_CONFIG, formatDistance, formatDuration,
  type DayOfWeek, type IntensityLevel, type TrainingSession,
} from "@/lib/training-session-types";
import { newSessionId, useTrainingStore } from "@/lib/training-store";

type Filter = "all" | IntensityLevel;

interface Props {
  weekIndex: number;
  day: DayOfWeek;
  currentSessionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function QuickSwapPopover({ weekIndex, day, currentSessionId, open, onOpenChange, children }: Props) {
  const sessionLibrary = useTrainingStore((s) => s.sessionLibrary);
  const customSessions = useTrainingStore((s) => s.customSessions);
  const updateSession = useTrainingStore((s) => s.updateSession);
  const undo = useTrainingStore((s) => s.undo);
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(() => [...sessionLibrary, ...customSessions], [sessionLibrary, customSessions]);
  const filtered = useMemo(
    () => (filter === "all" ? all : all.filter((s) => s.intensity === filter)),
    [all, filter],
  );

  const handlePick = (preset: TrainingSession) => {
    updateSession(weekIndex, day, { ...preset, id: newSessionId(), isCustom: true });
    onOpenChange(false);
    toast.success(`Sessão trocada por ${preset.code}`, {
      action: { label: "Desfazer", onClick: () => undo() },
      duration: 4000,
    });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Buscar sessão por código, nome ou tag…" autoFocus />
          <div className="flex gap-1 px-2 pb-1.5 pt-1 border-b">
            {(["all", "low", "moderate", "high"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-md border transition-colors",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-accent",
                )}
              >
                {f === "all" ? "TODAS" : f === "low" ? "LOW" : f === "moderate" ? "MOD" : "HIGH"}
              </button>
            ))}
          </div>
          <CommandList className="max-h-[280px]">
            <CommandEmpty>Nenhuma sessão encontrada.</CommandEmpty>
            <CommandGroup>
              {filtered.map((s) => {
                const cfg = INTENSITY_CONFIG[s.intensity];
                const isCurrent = currentSessionId && s.id === currentSessionId;
                return (
                  <CommandItem
                    key={s.id}
                    value={`${s.code} ${s.name} ${s.tags.join(" ")}`}
                    onSelect={() => handlePick(s)}
                    className={cn("flex items-start gap-2 py-2", isCurrent && "opacity-50")}
                  >
                    <span className={cn("mt-1 size-2 rounded-full shrink-0", cfg.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">{s.code}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", cfg.badgeClass)}>
                          {cfg.label}
                        </Badge>
                        {s.isCustom && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">CUSTOM</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {s.duration ? formatDuration(s.duration) : formatDistance(s.distance)}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
