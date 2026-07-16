import React, { useState, useRef, useEffect } from "react";
import { useInstallStore } from "@/store/useInstallStore";
import { 
  SlidersHorizontal, 
  Download, 
  Upload, 
  Terminal, 
  Palette, 
  Gamepad2, 
  Code,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define preset bundles mapping to package IDs in apps.json
const PRESETS = [
  {
    name: "Developer Starter Kit",
    description: "VS Code, Git, Node.js, Chrome, GitHub Desktop",
    icon: Code,
    appIds: ["google-chrome", "vscode", "git", "nodejs", "github-desktop"]
  },
  {
    name: "AI/LLM Workspace",
    description: "Cursor, Ollama, LM Studio, Python 3",
    icon: Terminal,
    appIds: ["cursor", "ollama", "lmstudio", "python"]
  },
  {
    name: "Creative Designer Suite",
    description: "Figma, Blender, GIMP, Inkscape, OBS Studio",
    icon: Palette,
    appIds: ["figma", "blender", "gimp", "inkscape", "obs-studio"]
  },
  {
    name: "Gamer Essentials",
    description: "Steam, Epic Games, Discord, Ubisoft Connect",
    icon: Gamepad2,
    appIds: ["steam", "epic-games-launcher", "discord", "ubisoft-connect"]
  }
];

export const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const queue = useInstallStore((state) => state.queue);
  const packages = useInstallStore((state) => state.packages);
  const applyProfile = useInstallStore((state) => state.applyProfile);
  const addLog = useInstallStore((state) => state.addLog);
  const setConsoleOpen = useInstallStore((state) => state.setConsoleOpen);
  const isCreatingRestorePoint = useInstallStore((state) => state.isCreatingRestorePoint);
  const createSystemRestorePoint = useInstallStore((state) => state.createSystemRestorePoint);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApplyPreset = (name: string, appIds: string[]) => {
    applyProfile(appIds);
    setConsoleOpen(true);
    
    // Resolve which packages are selected
    const selectedPkgs = packages.filter((pkg) => appIds.includes(pkg.id));
    const selectedNames = selectedPkgs.map((pkg) => pkg.name);
    const namesStr = selectedNames.length > 0 ? selectedNames.join(", ") : "None";
    
    addLog("unified", `[SYSTEM] Loaded Preset Profile: ${name}. Selected apps: [${namesStr}].`);
    setIsOpen(false);
  };

  const handleImport = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.openFile === "function") {
      try {
        const result = await electronAPI.openFile({
          title: "Import Setup Profile",
          filters: [{ name: "Installer Profile", extensions: ["json"] }]
        });
        
        if (result && result.content) {
          const data = JSON.parse(result.content);
          if (data && Array.isArray(data.packages)) {
            const appIds = data.packages.map((p: any) => p.id).filter(Boolean);
            applyProfile(appIds);
            setConsoleOpen(true);
            
            const selectedPkgs = packages.filter((pkg) => appIds.includes(pkg.id));
            const selectedNames = selectedPkgs.map((pkg) => pkg.name);
            const namesStr = selectedNames.length > 0 ? selectedNames.join(", ") : "None";
            
            addLog("unified", `[SYSTEM] Imported custom profile from "${result.filePath}". Selected apps: [${namesStr}].`);
          }
        }
      } catch (err) {
        console.error("Failed to import profile:", err);
      }
    } else {
      // Mock/web file input fallback if not in Electron
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            try {
              const data = JSON.parse(event.target.result);
              if (data && Array.isArray(data.packages)) {
                const appIds = data.packages.map((p: any) => p.id).filter(Boolean);
                applyProfile(appIds);
                
                const selectedPkgs = packages.filter((pkg) => appIds.includes(pkg.id));
                const selectedNames = selectedPkgs.map((pkg) => pkg.name);
                const namesStr = selectedNames.length > 0 ? selectedNames.join(", ") : "None";
                
                addLog("unified", `[SYSTEM] Imported profile "${file.name}" in browser simulator. Selected apps: [${namesStr}].`);
              }
            } catch (err) {
              console.error(err);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
    setIsOpen(false);
  };

  const handleExport = async () => {
    if (queue.length === 0) return;
    
    const selectedPkgs = packages.filter(pkg => queue.includes(pkg.wingetId));
    const profile = {
      name: "Custom Setup Profile",
      timestamp: new Date().toISOString(),
      packages: selectedPkgs.map(pkg => ({
        id: pkg.id,
        wingetId: pkg.wingetId,
        name: pkg.name
      }))
    };

    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.saveFile === "function") {
      try {
        const savedPath = await electronAPI.saveFile({
          title: "Export Setup Profile",
          defaultPath: "my-package-profile.json",
          filters: [{ name: "Installer Profile", extensions: ["json"] }],
          content: JSON.stringify(profile, null, 2)
        });
        if (savedPath) {
          addLog("unified", `[SYSTEM] Saved profile selection to "${savedPath}".`);
        }
      } catch (err) {
        console.error("Failed to export profile:", err);
      }
    } else {
      // Web Blob Download fallback if not in Electron
      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-package-profile.json";
      a.click();
      URL.revokeObjectURL(url);
    }
    setIsOpen(false);
  };

  const handleCreateRestorePoint = async () => {
    const success = await createSystemRestorePoint();
    if (success) {
      alert("System Restore Point created successfully.");
    } else {
      alert("Failed to create System Restore Point. Please ensure you have administrative privileges.");
    }
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0 font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center p-2.5 rounded-xl border transition-all duration-300 cursor-pointer backdrop-blur-md",
          isOpen
            ? "bg-primary/20 border-primary/50 text-foreground shadow-lg shadow-primary/20"
            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-foreground"
        )}
        title="Setup Profiles"
      >
        <SlidersHorizontal size={15} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0E0E11]/95 border border-white/10 rounded-xl backdrop-blur-2xl shadow-2xl z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-1.5 border-b border-white/5 mb-2">
            <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
              Setup Profiles & Presets
            </h4>
          </div>

          {/* Presets List */}
          <div className="flex flex-col gap-0.5 px-1.5">
            {PRESETS.map((preset) => {
              const PresetIcon = preset.icon;
              return (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset.name, preset.appIds)}
                  className="flex items-start gap-3 w-full px-3 py-2 rounded-lg text-left text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="p-1.5 rounded-md bg-white/5 border border-white/5 text-muted-foreground/80 group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shrink-0 mt-0.5">
                    <PresetIcon size={14} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">
                      {preset.name}
                    </h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-white/5 my-2.5" />

          {/* Import/Export buttons */}
          <div className="flex flex-col gap-1 px-1.5">
            <button
              onClick={handleImport}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer"
            >
              <Upload size={14} className="text-muted-foreground/80" />
              <span>Import Profile JSON</span>
            </button>
            <button
              onClick={handleExport}
              disabled={queue.length === 0}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer",
                queue.length === 0 && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
              )}
            >
              <Download size={14} className="text-muted-foreground/80" />
              <span>Export Selected ({queue.length})</span>
            </button>
            
            <button
              onClick={handleCreateRestorePoint}
              disabled={isCreatingRestorePoint}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all cursor-pointer text-primary hover:text-primary",
                isCreatingRestorePoint && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {isCreatingRestorePoint ? (
                <Loader2 size={14} className="text-primary/80 animate-spin" />
              ) : (
                <ShieldAlert size={14} className="text-primary/80" />
              )}
              <span>{isCreatingRestorePoint ? "Creating Restore Point..." : "Create System Restore Point"}</span>
            </button>
          </div>

          <div className="h-px bg-white/5 my-2.5" />
          
          {/* About Developer */}
          <div className="px-4 py-1.5 flex flex-col items-center justify-center opacity-80">
            <p className="text-[10px] text-muted-foreground text-center">
              Developed by <span className="font-bold text-foreground">Snokei</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
