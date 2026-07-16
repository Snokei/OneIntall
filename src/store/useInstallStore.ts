import appsData from "@/data/apps.json";
import type { InstallProgress, Package } from "@/types";
import { create } from "zustand";

interface InstallState {
  packages: Package[];
  queue: string[]; // List of wingetIds in the install queue
  progress: Record<string, InstallProgress>; // Map of wingetId -> InstallProgress
  isScanning: boolean;
  isUpdating: boolean;
  activeFilter: "all" | "installed" | "not-installed" | "updates";
  searchQuery: string;

  // Settings
  isSettingsOpen: boolean;
  concurrency: number;
  installLocation: string;

  // Setters
  setPackages: (packages: Package[]) => void;
  setScanning: (isScanning: boolean) => void;
  setUpdating: (isUpdating: boolean) => void;
  setActiveFilter: (
    filter: "all" | "installed" | "not-installed" | "updates",
  ) => void;
  setSearchQuery: (query: string) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setConcurrency: (concurrency: number) => void;
  setInstallLocation: (location: string) => void;

  // Selection actions
  toggleSelect: (wingetId: string) => void;
  selectAll: (category?: string) => void;
  clearSelection: () => void;
  applyProfile: (appIds: string[]) => void;

  // Progress actions
  updateProgress: (
    wingetId: string,
    progress: Partial<InstallProgress>,
  ) => void;
  clearProgress: (wingetId: string) => void;
  resetAllProgress: () => void;

  // Sync actions
  refreshStatus: () => Promise<void>;
  installSelected: () => Promise<void>;
  uninstallSelected: () => Promise<void>;
  cancelInstall: (wingetId: string) => Promise<void>;
  searchOnline: (query: string) => Promise<void>;
  loadPackageDetails: (wingetId: string) => Promise<void>;

  // Loading states
  isSearchingOnline: boolean;

  // Console state
  isConsoleOpen: boolean;
  activeConsoleTab: string;
  logs: Record<string, string[]>;
  setConsoleOpen: (isOpen: boolean) => void;
  setActiveConsoleTab: (tabId: string) => void;
  addLog: (wingetId: string, line: string) => void;
  clearLogs: () => void;

  // Global Reset
  resetStore: () => void;

  // Settings Loader
  loadSettings: () => Promise<void>;

  // System Restore
  isCreatingRestorePoint: boolean;
  createSystemRestorePoint: () => Promise<boolean>;
}

// Convert json to initial packages
const initialPackages: Package[] = (appsData as any[]).map((app) => ({
  id: app.id,
  name: app.name,
  wingetId: app.wingetId,
  category: app.category,
  description: app.description,
  publisher: app.publisher,
  icon: app.icon,
  isInstalled: false,
  isUpdateAvailable: false,
}));

const getIconForApp = (name: string, wingetId: string): string => {
  const n = name.toLowerCase();
  const w = wingetId.toLowerCase();

  if (n.includes("chrome") || w.includes("chrome")) return "Chrome";
  if (n.includes("firefox") || w.includes("firefox")) return "Globe";
  if (n.includes("brave") || w.includes("brave")) return "ShieldAlert";
  if (n.includes("opera") || w.includes("opera")) return "Compass";
  if (
    n.includes("code") ||
    n.includes("studio") ||
    n.includes("develop") ||
    w.includes("compiler") ||
    w.includes("editor")
  )
    return "Code";
  if (n.includes("git") || w.includes("git")) return "GitFork";
  if (n.includes("node") || w.includes("node")) return "Server";
  if (n.includes("python") || w.includes("python")) return "Terminal";
  if (n.includes("docker") || w.includes("docker")) return "Box";
  if (
    n.includes("zip") ||
    n.includes("rar") ||
    n.includes("archive") ||
    w.includes("7zip")
  )
    return "FolderArchive";

  if (n.includes("discord") || w.includes("discord")) return "MessageSquare";
  if (n.includes("slack") || w.includes("slack")) return "MessageSquare";
  if (n.includes("whatsapp") || w.includes("whatsapp")) return "MessageSquare";
  if (n.includes("telegram") || w.includes("telegram")) return "MessageSquare";

  if (
    n.includes("spotify") ||
    n.includes("music") ||
    n.includes("audio") ||
    n.includes("sound")
  )
    return "Music";
  if (
    n.includes("vlc") ||
    n.includes("player") ||
    n.includes("video") ||
    n.includes("media") ||
    n.includes("tv")
  )
    return "PlaySquare";
  if (
    n.includes("game") ||
    n.includes("steam") ||
    n.includes("epic") ||
    n.includes("xbox") ||
    n.includes("playstation")
  )
    return "Gamepad2";

  if (
    n.includes("note") ||
    n.includes("notion") ||
    n.includes("obsidian") ||
    n.includes("office") ||
    n.includes("word") ||
    n.includes("pdf")
  )
    return "FileText";
  if (
    n.includes("paint") ||
    n.includes("design") ||
    n.includes("figma") ||
    n.includes("draw") ||
    n.includes("photo") ||
    n.includes("gimp") ||
    n.includes("inkscape") ||
    n.includes("blender")
  )
    return "Palette";
  if (
    n.includes("db") ||
    n.includes("database") ||
    n.includes("sql") ||
    n.includes("mongo")
  )
    return "Database";
  if (
    n.includes("clean") ||
    n.includes("optimiz") ||
    n.includes("tool") ||
    n.includes("utility") ||
    n.includes("helper")
  )
    return "Wrench";

  return "Package"; // Fallback generic icon
};

export const useInstallStore = create<InstallState>((set, get) => ({
  packages: initialPackages,
  queue: [],
  progress: {},
  isScanning: false,
  isUpdating: false,
  isSearchingOnline: false,
  activeFilter: "all",
  searchQuery: "",
  isSettingsOpen: false,
  concurrency: 2,
  installLocation: "",
  isConsoleOpen: false,
  activeConsoleTab: "unified",
  logs: { unified: [] },
  isCreatingRestorePoint: false,

  setPackages: (packages) => set({ packages }),
  setScanning: (isScanning) => set({ isScanning }),
  setUpdating: (isUpdating) => set({ isUpdating }),

  setActiveFilter: (activeFilter) =>
    set({ activeFilter, queue: [], isSettingsOpen: false }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsSettingsOpen: (isSettingsOpen) =>
    set((state) => ({
      isSettingsOpen,
      // Clear selection when opening settings
      queue: isSettingsOpen ? [] : state.queue,
    })),
  setConcurrency: (concurrency) => {
    set({ concurrency });
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.saveSettings === "function") {
      const state = get();
      electronAPI.saveSettings({
        darkMode: true,
        theme: "fluent-dark",
        parallelCount: concurrency,
        installLocation: state.installLocation,
      });
    }
  },
  setInstallLocation: (installLocation) => {
    set({ installLocation });
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.saveSettings === "function") {
      const state = get();
      electronAPI.saveSettings({
        darkMode: true,
        theme: "fluent-dark",
        parallelCount: state.concurrency,
        installLocation,
      });
    }
  },
  setConsoleOpen: (isConsoleOpen) => set({ isConsoleOpen }),
  setActiveConsoleTab: (activeConsoleTab) => set({ activeConsoleTab }),
  addLog: (wingetId, line) =>
    set((state) => {
      const time = new Date().toLocaleTimeString();
      const formattedLine = `[${time}] ${line}`;
      const unifiedLogs = [
        ...(state.logs.unified || []),
        `[${wingetId}] ${line}`,
      ];
      const appLogs = [...(state.logs[wingetId] || []), formattedLine];

      const currentProgress = state.progress[wingetId] || {
        status: "idle",
        percent: 0,
        logs: [],
      };

      return {
        logs: {
          ...state.logs,
          unified: unifiedLogs,
          [wingetId]: appLogs,
        },
        progress: {
          ...state.progress,
          [wingetId]: {
            ...currentProgress,
            logs: [...(currentProgress.logs || []), line],
          },
        },
      };
    }),
  clearLogs: () => set({ logs: { unified: [] } }),

  toggleSelect: (wingetId) =>
    set((state) => {
      // Don't toggle if actively downloading or installing
      const install = state.progress[wingetId];
      if (install && ["downloading", "installing"].includes(install.status)) {
        return {};
      }

      const queue = state.queue.includes(wingetId)
        ? state.queue.filter((id) => id !== wingetId)
        : [...state.queue, wingetId];

      return { queue };
    }),

  selectAll: (category) =>
    set((state) => {
      // Find all eligible packages in this category (not installed, not actively installing)
      const eligiblePkgs = state.packages.filter((pkg) => {
        if (category && pkg.category !== category) return false;

        const install = state.progress[pkg.wingetId];
        const isBusy =
          install && ["downloading", "installing"].includes(install.status);

        return !pkg.isInstalled && !isBusy;
      });

      if (eligiblePkgs.length === 0) return {};

      // Check if they are all currently selected
      const allSelected = eligiblePkgs.every((pkg) =>
        state.queue.includes(pkg.wingetId),
      );

      let queue = [...state.queue];

      if (allSelected) {
        // Deselect all eligible apps in this category
        eligiblePkgs.forEach((pkg) => {
          queue = queue.filter((id) => id !== pkg.wingetId);
        });
      } else {
        // Select all eligible apps in this category
        eligiblePkgs.forEach((pkg) => {
          if (!queue.includes(pkg.wingetId)) {
            queue.push(pkg.wingetId);
          }
        });
      }

      return { queue };
    }),

  clearSelection: () => set({ queue: [] }),

  applyProfile: (appIds) => {
    get().clearSelection();
    set((state) => {
      const nextQueue = new Set<string>();
      state.packages.forEach((pkg) => {
        if (appIds.includes(pkg.id) && !pkg.isInstalled) {
          nextQueue.add(pkg.wingetId);
        }
      });

      return { queue: Array.from(nextQueue), activeFilter: "all" };
    });
  },

  updateProgress: (wingetId, partialProgress) =>
    set((state) => {
      const current = state.progress[wingetId] || {
        status: "idle",
        percent: 0,
        logs: [],
      };

      let updatedLogs = current.logs || [];
      if (partialProgress.logs) {
        updatedLogs = [...updatedLogs, ...partialProgress.logs];
      }

      // If status becomes completed/success, remove it from queue and mark package as installed
      let packages = state.packages;
      let queue = state.queue;
      const newProgress = { ...state.progress };

      if (partialProgress.status === "success") {
        queue = queue.filter((id) => id !== wingetId);
        packages = packages.map((pkg) =>
          pkg.wingetId === wingetId
            ? { ...pkg, isInstalled: true, isUpdateAvailable: false }
            : pkg,
        );
      } else if (partialProgress.status === "uninstalled") {
        queue = queue.filter((id) => id !== wingetId);
        packages = packages.map((pkg) =>
          pkg.wingetId === wingetId
            ? {
                ...pkg,
                isInstalled: false,
                installedVersion: undefined,
                isUpdateAvailable: false,
              }
            : pkg,
        );
        delete newProgress[wingetId];
      }

      return {
        queue,
        packages,
        progress:
          partialProgress.status === "uninstalled"
            ? newProgress
            : {
                ...state.progress,
                [wingetId]: {
                  ...current,
                  ...partialProgress,
                  logs: updatedLogs,
                },
              },
      };
    }),

  clearProgress: (wingetId) =>
    set((state) => {
      const newProgress = { ...state.progress };
      delete newProgress[wingetId];
      return { progress: newProgress };
    }),

  resetAllProgress: () => set({ progress: {} }),

  refreshStatus: async () => {
    const { isScanning } = get();
    if (isScanning) return;

    set({ isScanning: true });

    // Check if running in Electron
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      try {
        const appsPayload = get().packages.map((pkg) => ({
          wingetId: pkg.wingetId,
          name: pkg.name,
        }));

        // 1. Check installed status
        const installedScans =
          await electronAPI.checkInstalledStatus(appsPayload);
        set((state) => {
          const packages = state.packages.map((pkg) => {
            const scan = installedScans.find(
              (s: any) => s.wingetId === pkg.wingetId,
            );
            return scan
              ? {
                  ...pkg,
                  isInstalled: scan.isInstalled,
                  installedVersion: scan.installedVersion,
                }
              : pkg;
          });
          return { packages };
        });

        // 2. Check update status
        set({ isUpdating: true });
        const upgradeScans = await electronAPI.checkUpdatesStatus(appsPayload);
        set((state) => {
          const packages = state.packages.map((pkg) => {
            const scan = upgradeScans.find(
              (s: any) => s.wingetId === pkg.wingetId,
            );
            if (scan && scan.updateAvailable) {
              return {
                ...pkg,
                isInstalled: true,
                isUpdateAvailable: true,
                latestVersion: scan.availableVersion,
              };
            }
            return pkg;
          });
          return { packages, isUpdating: false };
        });
      } catch (err) {
        console.error("Failed to run winget scan:", err);
        set({ isScanning: false, isUpdating: false });
      } finally {
        set({ isScanning: false });
      }
    } else {
      // Mock scanning in web dev environment
      await new Promise((resolve) => setTimeout(resolve, 1500));
      set((state) => {
        // Mocking Brave and VS Code as installed
        const packages = state.packages.map((pkg) => {
          if (pkg.wingetId === "Brave.Brave") {
            return { ...pkg, isInstalled: true, installedVersion: "1.50.92" };
          }
          if (pkg.wingetId === "Microsoft.VisualStudioCode") {
            return { ...pkg, isInstalled: true, installedVersion: "1.78.0" };
          }
          if (pkg.wingetId === "Git.Git") {
            return {
              ...pkg,
              isInstalled: true,
              installedVersion: "2.40.0",
              isUpdateAvailable: true,
              latestVersion: "2.41.0",
            };
          }
          return pkg;
        });
        return { packages, isScanning: false };
      });
    }
  },

  installSelected: async () => {
    const { queue } = get();
    if (queue.length === 0) return;

    // Auto-open console when install starts
    set({ isConsoleOpen: true, activeConsoleTab: "unified" });

    // Check if running in Electron
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      // Update queue progress states to waiting
      set((state) => {
        const progress = { ...state.progress };
        queue.forEach((id) => {
          progress[id] = {
            status: "queued",
            percent: 0,
            message: "Waiting in queue...",
            logs: [],
          };
        });
        return { progress };
      });
      await electronAPI.installPackages(queue);
    } else {
      // Mock installation in web dev environment
      const itemsToInstall = [...queue];
      for (const wingetId of itemsToInstall) {
        // Queue status
        get().updateProgress(wingetId, {
          status: "downloading",
          percent: 0,
          message: "Downloading package...",
        });

        // Progress download mockup
        for (let p = 10; p <= 100; p += 30) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          get().updateProgress(wingetId, { percent: p });
        }

        // Install phase
        get().updateProgress(wingetId, {
          status: "installing",
          percent: 100,
          message: "Installing software...",
        });
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Success phase
        get().updateProgress(wingetId, {
          status: "success",
          percent: 100,
          message: "Installation completed!",
        });
      }
    }
  },

  uninstallSelected: async () => {
    const { queue } = get();
    if (queue.length === 0) return;

    // Auto-open console when uninstall starts
    set({ isConsoleOpen: true, activeConsoleTab: "unified" });

    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      set((state) => {
        const progress = { ...state.progress };
        queue.forEach((id) => {
          progress[id] = {
            status: "uninstalling",
            percent: 50,
            message: "Uninstalling...",
            logs: [],
          };
        });
        return { progress };
      });
      await electronAPI.uninstallPackages(queue);
    } else {
      const itemsToUninstall = [...queue];
      for (const wingetId of itemsToUninstall) {
        get().updateProgress(wingetId, {
          status: "uninstalling",
          percent: 50,
          message: "Uninstalling...",
        });
        await new Promise((resolve) => setTimeout(resolve, 1500));
        get().updateProgress(wingetId, {
          status: "uninstalled",
          percent: 100,
        });
      }
    }
  },

  cancelInstall: async (wingetId) => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      await electronAPI.cancelInstallations([wingetId]);
    } else {
      // Mock cancel
      get().updateProgress(wingetId, {
        status: "failed",
        error: "Installation cancelled by user",
      });
      set((state) => ({
        queue: state.queue.filter((id) => id !== wingetId),
      }));
    }
  },

  searchOnline: async (query: string) => {
    if (!query.trim()) return;
    set({ isSearchingOnline: true });

    // Check if running in Electron and searchPackages exists
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.searchPackages === "function") {
      try {
        const results = await electronAPI.searchPackages(query);

        set((state) => {
          // Filter out results that are already in the packages list
          const existingIds = new Set(
            state.packages.map((pkg) => pkg.wingetId.toLowerCase()),
          );
          const newPackages = results
            .map((pkg: any) => ({
              ...pkg,
              description:
                pkg.description ||
                `Software package ${pkg.name} (${pkg.wingetId}) available via the Winget online repository.`,
              icon: pkg.icon || getIconForApp(pkg.name, pkg.wingetId),
            }))
            .filter((pkg: any) => !existingIds.has(pkg.wingetId.toLowerCase()));

          return {
            packages: [...state.packages, ...newPackages],
            isSearchingOnline: false,
          };
        });
      } catch (err) {
        console.error("Failed to search winget online:", err);
        set({ isSearchingOnline: false });
      }
    } else {
      // Mock search online in web/dev environment
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const queryLower = query.toLowerCase();
      const mockPool = [
        {
          name: "Obsidian",
          wingetId: "Obsidian.Obsidian",
          category: "Online Search",
          description:
            "Powerful, extensible knowledge base that works on top of your local Markdown files.",
          publisher: "Obsidian",
        },
        {
          name: "Spotify",
          wingetId: "Spotify.Spotify",
          category: "Online Search",
          description:
            "Digital music service that gives you access to millions of songs.",
          publisher: "Spotify",
        },
        {
          name: "Discord",
          wingetId: "Discord.Discord",
          category: "Online Search",
          description:
            "All-in-one voice and text chat for gamers that's free, secure, and works on both your desktop and phone.",
          publisher: "Discord Inc.",
        },
        {
          name: "Notion",
          wingetId: "makenotion.notion",
          category: "Online Search",
          description:
            "All-in-one workspace for your notes, tasks, wikis, and databases.",
          publisher: "Notion Labs Inc.",
        },
        {
          name: "VLC Media Player",
          wingetId: "VideoLAN.VLC",
          category: "Online Search",
          description:
            "VLC is a free and open-source cross-platform multimedia player and framework that plays most multimedia files.",
          publisher: "VideoLAN",
        },
        {
          name: "Slack",
          wingetId: "SlackTechnologies.Slack",
          category: "Online Search",
          description:
            "Slack brings team communication and collaboration into one place so you can get more work done.",
          publisher: "Slack Technologies",
        },
        {
          name: "Zoom",
          wingetId: "Zoom.Zoom",
          category: "Online Search",
          description:
            "Zoom's secure, reliable video platform powers all of your communication needs.",
          publisher: "Zoom Video Communications",
        },
        {
          name: "Steam",
          wingetId: "Valve.Steam",
          category: "Online Search",
          description:
            "Steam is the ultimate destination for playing, discussing, and creating games.",
          publisher: "Valve Corporation",
        },
        {
          name: "Instagram",
          wingetId: "Facebook.Instagram",
          category: "Online Search",
          description:
            "Official Instagram app for Windows. Share photos, videos, and connect with friends.",
          publisher: "Instagram",
        },
      ];

      const filteredMocks = mockPool.filter(
        (item) =>
          item.name.toLowerCase().includes(queryLower) ||
          item.wingetId.toLowerCase().includes(queryLower),
      );

      const results =
        filteredMocks.length > 0
          ? filteredMocks
          : [
              {
                name: query.charAt(0).toUpperCase() + query.slice(1),
                wingetId: `${query.charAt(0).toUpperCase() + query.slice(1)}.${query.charAt(0).toUpperCase() + query.slice(1)}`,
                category: "Online Search",
                description: `Custom package for ${query} found via Winget online search simulation.`,
                publisher: "Unknown Publisher",
              },
            ];

      const packagesWithIds = results.map((item) => ({
        id: item.wingetId.replace(/\./g, "-").toLowerCase(),
        name: item.name,
        wingetId: item.wingetId,
        category: item.category,
        description:
          item.description ||
          `Software package ${item.name} (${item.wingetId}) available via the Winget online repository.`,
        publisher: item.publisher,
        isInstalled: false,
        isUpdateAvailable: false,
        icon: getIconForApp(item.name, item.wingetId),
      }));

      set((state) => {
        const existingIds = new Set(
          state.packages.map((pkg) => pkg.wingetId.toLowerCase()),
        );
        const newPackages = packagesWithIds.filter(
          (pkg) => !existingIds.has(pkg.wingetId.toLowerCase()),
        );

        return {
          packages: [...state.packages, ...newPackages],
          isSearchingOnline: false,
        };
      });
    }
  },

  loadPackageDetails: async (wingetId: string) => {
    const pkg = get().packages.find((p) => p.wingetId === wingetId);
    if (!pkg || pkg.detailsFetched) return;

    console.log(`[Store] Fetching details for package: ${wingetId}`);

    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.showPackageInfo === "function") {
      try {
        const details = await electronAPI.showPackageInfo(wingetId);
        if (details) {
          console.log(
            `[Store] Successfully loaded details for ${wingetId}:`,
            details,
          );
          set((state) => ({
            packages: state.packages.map((p) =>
              p.wingetId === wingetId
                ? {
                    ...p,
                    publisher: details.publisher || p.publisher,
                    description: details.description || p.description,
                    homepage: details.homepage,
                    license: details.license,
                    detailsFetched: true,
                  }
                : p,
            ),
          }));
        }
      } catch (err) {
        console.error(`[Store] Failed to load details for ${wingetId}:`, err);
      }
    } else {
      // Mock loading details in web/dev environment
      await new Promise((resolve) => setTimeout(resolve, 800));
      set((state) => ({
        packages: state.packages.map((p) =>
          p.wingetId === wingetId
            ? {
                ...p,
                description: p.description.includes("simulation")
                  ? `Rich, verified metadata description for ${p.name} fetched online. Fully compatible with Windows desktop environment.`
                  : p.description,
                homepage: `https://example.com/${p.id}`,
                license: "Open Source",
                detailsFetched: true,
              }
            : p,
        ),
      }));
    }
  },

  resetStore: () =>
    set({
      packages: initialPackages,
      queue: [],
      progress: {},
      isScanning: false,
      isUpdating: false,
      isSearchingOnline: false,
      activeFilter: "all",
      searchQuery: "",
    }),

  loadSettings: async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.getSettings === "function") {
      try {
        const settings = await electronAPI.getSettings();
        if (settings) {
          set({
            concurrency: settings.parallelCount || 2,
            installLocation: settings.installLocation || "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
  },

  createSystemRestorePoint: async () => {
    set({ isCreatingRestorePoint: true });
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && typeof electronAPI.createSystemRestorePoint === "function") {
        await electronAPI.createSystemRestorePoint();
        return true;
      } else {
        // Mock success in dev
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return true;
      }
    } catch (err) {
      console.error("Failed to create restore point:", err);
      return false;
    } finally {
      set({ isCreatingRestorePoint: false });
    }
  },
}));

export default useInstallStore;
