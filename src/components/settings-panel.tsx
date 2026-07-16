import LucideIcon from "@/components/ui/lucide-icon";
import React from "react";

export const SettingsPanel: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
      {/* About Developer */}
      <div className="flex flex-col gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md md:col-span-2">
        <div className="flex flex-col gap-1 items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <LucideIcon name="Code" size={32} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">OneInstall</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            A lightning-fast, glassmorphic desktop application for managing
            Windows software packages.
            <br />
            <br />
            Proudly developed by{" "}
            <span className="font-bold text-foreground">Snokei</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
