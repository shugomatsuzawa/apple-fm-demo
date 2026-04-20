import { app as t, BrowserWindow as r, ipcMain as c } from "electron";
import { createRequire as m } from "node:module";
import { fileURLToPath as f } from "node:url";
import o from "node:path";
const h = m(import.meta.url), l = o.dirname(f(import.meta.url)), { SwiftBridge: w } = h("../src/swift-bridge.cjs");
process.env.APP_ROOT = o.join(l, "..");
const i = process.env.VITE_DEV_SERVER_URL, v = o.join(process.env.APP_ROOT, "dist-electron"), d = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = i ? o.join(process.env.APP_ROOT, "public") : d;
let e, n;
function a() {
  e = new r({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "Apple Foundation Models Demo",
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      preload: o.join(l, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), i ? e.loadURL(i) : e.loadFile(o.join(d, "index.html")), t.isPackaged || e.webContents.openDevTools({ mode: "bottom" });
}
t.whenReady().then(async () => {
  n = new w({
    packagePath: o.join(l, "..", "swift-bridge")
  }), n.on("status", (s) => {
    e == null || e.webContents.send("fm:status", s);
  }), n.on("response", (s) => {
    e == null || e.webContents.send("fm:response", s);
  }), n.on("error", (s) => {
    e == null || e.webContents.send("fm:error", s);
  }), a(), t.on("activate", () => {
    r.getAllWindows().length === 0 && a();
  });
});
c.handle("fm:check-availability", async () => n.checkAvailability());
c.handle("fm:generate", async (s, p) => n.generate(p));
c.handle("fm:cancel", async () => n.cancel());
t.on("window-all-closed", async () => {
  await (n == null ? void 0 : n.dispose()), process.platform !== "darwin" && (t.quit(), e = null);
});
t.on("before-quit", async () => {
  await (n == null ? void 0 : n.dispose());
});
t.on("activate", () => {
  r.getAllWindows().length === 0 && a();
});
export {
  v as MAIN_DIST,
  d as RENDERER_DIST,
  i as VITE_DEV_SERVER_URL
};
