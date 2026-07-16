import { dialog, ipcMain } from "electron";
import * as fs from "fs";
import { exec } from "child_process";
import { UserSettings } from "../../src/types";
import { SettingsService } from "../services/settings.service";
import { WingetService } from "../services/winget.service";

export function registerIpcHandlers(
  wingetService: WingetService,
  settingsService: SettingsService,
) {
  ipcMain.handle(
    "winget:check-installed",
    async (event, apps: { wingetId: string; name: string }[]) => {
      try {
        return await wingetService.checkInstalled(apps, event.sender);
      } catch (error) {
        console.error("[IPC] error in winget:check-installed:", error);
        throw error;
      }
    },
  );

  ipcMain.handle("winget:search", async (_event, query: string) => {
    try {
      return await wingetService.searchOnline(query);
    } catch (error) {
      console.error("[IPC] error in winget:search:", error);
      throw error;
    }
  });

  ipcMain.handle("winget:show", async (_event, wingetId: string) => {
    try {
      return await wingetService.showPackageInfo(wingetId);
    } catch (error) {
      console.error("[IPC] error in winget:show:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "winget:check-updates",
    async (event, apps: { wingetId: string; name: string }[]) => {
      try {
        return await wingetService.checkUpdates(apps, event.sender);
      } catch (error) {
        console.error("[IPC] error in winget:check-updates:", error);
        throw error;
      }
    },
  );

  ipcMain.handle("winget:install", async (event, wingetIds: string[]) => {
    try {
      return await wingetService.install(wingetIds, event.sender);
    } catch (error) {
      console.error("[IPC] error in winget:install:", error);
      throw error;
    }
  });

  ipcMain.handle("winget:uninstall", async (event, wingetIds: string[]) => {
    try {
      return await wingetService.uninstall(wingetIds, event.sender);
    } catch (error) {
      console.error("[IPC] error in winget:uninstall:", error);
      throw error;
    }
  });

  ipcMain.handle("winget:cancel", async (_event, wingetIds: string[]) => {
    try {
      return await wingetService.cancel(wingetIds);
    } catch (error) {
      console.error("[IPC] error in winget:cancel:", error);
      throw error;
    }
  });

  ipcMain.handle("settings:get", async () => {
    try {
      return await settingsService.getSettings();
    } catch (error) {
      console.error("[IPC] error in settings:get:", error);
      throw error;
    }
  });

  ipcMain.handle("settings:save", async (event, settings: UserSettings) => {
    try {
      await settingsService.saveSettings(settings);
      // Sync parallel count to winget service
      wingetService.setParallelLimit(settings.parallelCount);
      // Sync install location to winget service
      wingetService.setInstallLocation(settings.installLocation || "");
      // Notify sender that settings have updated
      event.sender.send("settings:changed", settings);
      return settings;
    } catch (error) {
      console.error("[IPC] error in settings:save:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "dialog:save-file",
    async (
      _event,
      options: {
        title: string;
        defaultPath: string;
        filters: { name: string; extensions: string[] }[];
        content: string;
      },
    ) => {
      try {
        const { filePath } = await dialog.showSaveDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          filters: options.filters,
        });
        if (filePath) {
          await fs.promises.writeFile(filePath, options.content, "utf-8");
          return filePath;
        }
        return null;
      } catch (error) {
        console.error("[IPC] error in dialog:save-file:", error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    "dialog:open-file",
    async (
      _event,
      options: {
        title: string;
        filters: { name: string; extensions: string[] }[];
      },
    ) => {
      try {
        const { filePaths } = await dialog.showOpenDialog({
          title: options.title,
          properties: ["openFile"],
          filters: options.filters,
        });
        if (filePaths && filePaths.length > 0) {
          const content = await fs.promises.readFile(filePaths[0], "utf-8");
          return { filePath: filePaths[0], content };
        }
        return null;
      } catch (error) {
        console.error("[IPC] error in dialog:open-file:", error);
        throw error;
      }
    },
  );

  ipcMain.handle("system:create-restore-point", async () => {
    return new Promise((resolve, reject) => {
      // Use Start-Process with -Verb RunAs to request UAC elevation
      // Using Base64 encoding to prevent escaping issues
      const script = 'Checkpoint-Computer -Description "OneInstall Restore Point" -RestorePointType "MODIFY_SETTINGS"';
      const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
      const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedScript}' -Wait"`;
      
      exec(cmd, (error: Error | null) => {
        if (error) {
          console.error("[IPC] error creating restore point:", error);
          reject(error);
          return;
        }
        resolve(true);
      });
    });
  });
}
