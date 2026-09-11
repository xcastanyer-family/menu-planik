import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  sublabel?: string;
  color?: "primary" | "emerald" | "amber" | "sky" | "purple" | "rose";
  showValues?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  sublabel,
  color = "emerald",
  showValues = true,
  className,
}) => {
  const percentage = Math.min(Math.round((value / (max || 1)) * 100), 100);

  const colors = {
    primary: "bg-primary-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    purple: "bg-purple-500",
    rose: "bg-rose-500",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {label} {sublabel && <span className="text-zinc-400 font-normal">({sublabel})</span>}
          </span>
          {showValues && (
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

