/* Ciscord preload — window controls only.

   Firebase deliberately does NOT live here. @firebase/auth runs an `instanceof`
   check on an internal class, and that assertion throws
   "INTERNAL ASSERTION FAILED: Expected a class definition" whenever the SDK is
   required from a sandbox:false preload (two realms, so the check never
   matches) — the preload then dies and `window.cis` is never exposed, which is
   why no button in the UI responds.

   Loading the SDK as <script> tags in index.html puts every module in one
   realm, so the whole data layer lives in renderer.js instead. All this file
   still has to do is bridge the frameless window buttons. */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cisWin', {
  control: action => ipcRenderer.invoke('win-control', action),
});

contextBridge.exposeInMainWorld('cisDeepSeek', {
  send: message => ipcRenderer.invoke('deepseek-send', message),
  saveSettings: settings => ipcRenderer.invoke('ai-save-settings', settings),
});
