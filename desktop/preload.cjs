const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("troveDesktop", {
  kind: "electron",
  platform: process.platform,
  version: () => ipcRenderer.invoke("trove:version"),
  openProject: () => ipcRenderer.invoke("trove:project:open"),
  createProject: (name) => ipcRenderer.invoke("trove:project:create", String(name || "")),
  writeFiles: (scope, files) =>
    ipcRenderer.invoke("trove:project:write", String(scope || ""), files),
  runTask: (scope, task) =>
    ipcRenderer.invoke("trove:project:run-task", String(scope || ""), String(task || "")),
  startDev: (scope) =>
    ipcRenderer.invoke("trove:project:start-dev", String(scope || "")),
  stopDev: (scope) =>
    ipcRenderer.invoke("trove:project:stop-dev", String(scope || "")),
  devStatus: (scope) =>
    ipcRenderer.invoke("trove:project:dev-status", String(scope || "")),
});
