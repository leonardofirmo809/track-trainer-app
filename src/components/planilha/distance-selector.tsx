import { Link } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Distance = "5km" | "10km" | "21km" | "42km";

const OPTIONS: { id: Distance; route: "/planilha-5km" | "/planilha-10km" | "/planilha-21km" | "/planilha-42km"; title: string }[] = [
  { id: "5km", route: "/planilha-5km", title: "5 km" },
  { id: "10km", route: "/planilha-10km", title: "10 km" },
  { id: "21km", route: "/planilha-21km", title: "21 km" },
  { id: "42km", route: "/planilha-42km", title: "42 km" },
];

export function DistanceSelector({ current }: { current: Distance }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {OPTIONS.map((opt) => {
        const active = opt.id === current;
        return (
          <Link
            key={opt.id}
            to={opt.route}
            className={cn(
              "group rounded-lg border-2 p-4 transition flex flex-col gap-1.5 min-h-24",
              active
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
            )}
            aria-current={active ? "page" : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <RouteIcon className="size-4" />
              </span>
              <span className={cn("font-display text-lg font-bold", active && "text-primary")}>
                {opt.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{opt.subtitle}</p>
          </Link>
        );
      })}
    </div>
  );
}
