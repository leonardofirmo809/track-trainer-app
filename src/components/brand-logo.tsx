import mark from "@/assets/8020pace-mark.png.asset.json";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function BrandLogo({ className, size = 32, showWordmark = false, wordmarkClassName }: Props) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={mark.url}
        alt="8020Pace"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className={cn("font-display font-bold tracking-tight", wordmarkClassName)}>
          <span className="text-foreground">8020</span>
          <span className="text-[oklch(0.68_0.18_45)]"> Pace</span>
        </span>
      )}
    </div>
  );
}
