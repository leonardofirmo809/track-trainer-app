import { cn } from "@/lib/utils";

const LOGO_URL = "https://pub-87cb7b9bcf7a4d8097c43101ac0213ea.r2.dev/8020pace-logo.png";

type Props = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function BrandLogo({ className, size = 32, showWordmark = false, wordmarkClassName }: Props) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="shrink-0 rounded-full bg-white p-[2px] shadow-sm">
        <img
          src={LOGO_URL}
          alt="8020Pace"
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
        />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold tracking-tight", wordmarkClassName)}>
          <span className="text-foreground">8020</span>
          <span className="text-[oklch(0.68_0.18_45)]"> Pace</span>
        </span>
      )}
    </div>
  );
}
