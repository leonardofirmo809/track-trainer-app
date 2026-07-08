import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getStudentScopeFilter } from "@/lib/student-scope";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type Variant = "inline" | "fab";

export function StudentPicker({
  value,
  onChange,
  variant = "inline",
  distanceLabel,
  level,
}: {
  value: string;
  onChange: (id: string) => void;
  variant?: Variant;
  distanceLabel: string; // ex: "10km"
  level?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const students = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return [];
      const scope = await getStudentScopeFilter(userId);
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name")
        .or(scope)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(
    () => students.data?.find((s) => s.id === value) ?? null,
    [students.data, value]
  );

  function handleSelect(id: string, name: string) {
    onChange(id);
    setOpen(false);
    const lv = level ? ` Nível ${level}` : "";
    toast.success(`Planilha ${distanceLabel}${lv} atribuída a ${name}`);
  }

  if (variant === "fab") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Atribuir a aluno"
            className={cn(
              "md:hidden fixed right-4 bottom-20 z-30",
              "h-14 px-5 rounded-full shadow-lg flex items-center gap-2",
              "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition"
            )}
          >
            <UserPlus className="size-5" />
            <span className="font-semibold">Atribuir</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-[min(92vw,360px)] p-0">
          <PickerList
            students={students.data ?? []}
            isLoading={students.isLoading}
            value={value}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:max-w-md justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Users className="size-4 text-muted-foreground" />
            {selected ? (
              <span className="truncate">{selected.full_name}</span>
            ) : (
              <span className="text-muted-foreground">
                {students.isLoading ? "Carregando alunos…" : "Buscar e atribuir a um aluno"}
              </span>
            )}
          </span>
          <ChevronsUpDown className="size-4 opacity-60 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,420px)] p-0">
        <PickerList
          students={students.data ?? []}
          isLoading={students.isLoading}
          value={value}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

function PickerList({
  students,
  isLoading,
  value,
  onSelect,
}: {
  students: { id: string; full_name: string }[];
  isLoading: boolean;
  value: string;
  onSelect: (id: string, name: string) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Buscar aluno…" />
      <CommandList>
        <CommandEmpty>{isLoading ? "Carregando…" : "Nenhum aluno encontrado."}</CommandEmpty>
        <CommandGroup>
          {students.map((s) => (
            <CommandItem
              key={s.id}
              value={s.full_name}
              onSelect={() => onSelect(s.id, s.full_name)}
              className="cursor-pointer"
            >
              <Check className={cn("mr-2 size-4", value === s.id ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{s.full_name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
