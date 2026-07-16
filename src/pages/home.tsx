import { CatalogGrid } from "@/components/catalog-grid";
import { FilterPills } from "@/components/filter-pills";
import { ModuleHeader } from "@/components/module-header";
import { StatCard } from "@/components/stat-card";
import { DEFAULT_STATS } from "@/data/const";
import { useInstallStore } from "@/store/useInstallStore";
import React, { useEffect } from "react";

export const Home: React.FC = () => {
  const loadSettings = useInstallStore((state) => state.loadSettings);
  const refreshStatus = useInstallStore((state) => state.refreshStatus);
  const packages = useInstallStore((state) => state.packages);
  // Calculate stats
  const installedPackages = packages.filter((pkg) => pkg.isInstalled);
  const packagesWithUpdates = installedPackages.filter(
    (pkg) => pkg.isUpdateAvailable,
  );

  // Scan status and settings on mount
  useEffect(() => {
    loadSettings().then(() => {
      refreshStatus();
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Hero Section */}
      <ModuleHeader />

      {/* Stats Bar */}
      <StatCard
        stats={DEFAULT_STATS.map((stat) => {
          if (stat.label === "Total Installed")
            return { ...stat, value: installedPackages.length };
          if (stat.label === "Updates Available")
            return { ...stat, value: packagesWithUpdates.length };
          return stat;
        })}
      />

      <FilterPills />

      {/* Main Content Area */}
      <CatalogGrid />
    </div>
  );
};

export default Home;
