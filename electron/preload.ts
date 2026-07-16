import { contextBridge, ipcRenderer } from 'electron';
import { AppScanStatus, AppInstallStatus, UserSettings } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // IPC Invokes (Renderer -> Main)
  checkInstalledStatus: (apps: { wingetId: string; name: string }[]) => 
    ipcRenderer.invoke('winget:check-installed', apps),
  
  checkUpdatesStatus: (apps: { wingetId: string; name: string }[]) => 
    ipcRenderer.invoke('winget:check-updates', apps),
  
  installPackages: (wingetIds: string[]) => 
    ipcRenderer.invoke('winget:install', wingetIds),
  
  uninstallPackages: (wingetIds: string[]) => 
    ipcRenderer.invoke('winget:uninstall', wingetIds),
  
  cancelInstallations: (wingetIds: string[]) => 
    ipcRenderer.invoke('winget:cancel', wingetIds),

  searchPackages: (query: string) => 
    ipcRenderer.invoke('winget:search', query),

  showPackageInfo: (wingetId: string) => 
    ipcRenderer.invoke('winget:show', wingetId),
  
  getSettings: () => 
    ipcRenderer.invoke('settings:get'),
  
  saveSettings: (settings: UserSettings) => 
    ipcRenderer.invoke('settings:save', settings),

  saveFile: (options: { title: string; defaultPath: string; filters: { name: string; extensions: string[] }[]; content: string }) =>
    ipcRenderer.invoke('dialog:save-file', options),
  
  openFile: (options: { title: string; filters: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:open-file', options),

  createSystemRestorePoint: () =>
    ipcRenderer.invoke('system:create-restore-point'),

  // IPC Event Listeners (Main -> Renderer)
  onInstallProgress: (callback: (status: AppInstallStatus) => void) => {
    const subscription = (_event: any, status: AppInstallStatus) => callback(status);
    ipcRenderer.on('winget:install-progress', subscription);
    return () => {
      ipcRenderer.off('winget:install-progress', subscription);
    };
  },

  onInstallLog: (callback: (data: { wingetId: string; line: string }) => void) => {
    const subscription = (_event: any, data: { wingetId: string; line: string }) => callback(data);
    ipcRenderer.on('winget:install-log', subscription);
    return () => {
      ipcRenderer.off('winget:install-log', subscription);
    };
  },

  onScanProgress: (callback: (status: AppScanStatus) => void) => {
    const subscription = (_event: any, status: AppScanStatus) => callback(status);
    ipcRenderer.on('winget:scan-progress', subscription);
    return () => {
      ipcRenderer.off('winget:scan-progress', subscription);
    };
  },

  onSettingsChanged: (callback: (settings: UserSettings) => void) => {
    const subscription = (_event: any, settings: UserSettings) => callback(settings);
    ipcRenderer.on('settings:changed', subscription);
    return () => {
      ipcRenderer.off('settings:changed', subscription);
    };
  }
});
