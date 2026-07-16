import React from 'react';
import { useInstallStore } from "@/store/useInstallStore";
import LucideIcon from "@/components/ui/lucide-icon";
import { cn } from "@/lib/utils";

export const FilterPills: React.FC = () => {
  const activeFilter = useInstallStore((state) => state.activeFilter);
  const setActiveFilter = useInstallStore((state) => state.setActiveFilter);
  const filters = [
    { id: "all", label: "All Catalog", icon: "LayoutGrid" },
    { id: "not-installed", label: "Not Installed", icon: "CircleDot" },
    { id: "installed", label: "Installed", icon: "CheckCircle2" },
    { id: "updates", label: "Updates Ready", icon: "AlertOctagon" },
  ] as const;

  return (
    <div className="flex items-center justify-between border-b border-border/10 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((pill) => {
          const isActive = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => {
                setActiveFilter(pill.id as any);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-xl border transition-all duration-300 select-none cursor-pointer backdrop-blur-md",
                isActive
                  ? "bg-primary/20 border-primary/50 text-foreground shadow-lg shadow-primary/20"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-foreground hover:-translate-y-0.5",
              )}
            >
              <LucideIcon name={pill.icon} size={12} />
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
