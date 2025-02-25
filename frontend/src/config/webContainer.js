// src/config/webcontainer.js
import { WebContainer } from "@webcontainer/api";

let webContainerInstance = null;

export const getWebContainer = async () => {
  if (webContainerInstance === null) {
    try {
      console.log("Booting WebContainer...");
      webContainerInstance = await WebContainer.boot();
      console.log("WebContainer initialized successfully.");

      // Pre-install serve
      console.log("Pre-installing serve...");
      const serveInstall = await webContainerInstance.spawn('npm', ['install', 'serve']);
      let serveOutput = '';
      serveInstall.output.pipeTo(
        new WritableStream({
          write(chunk) {
            serveOutput += chunk;
          },
        })
      );
      if (await serveInstall.exit !== 0) {
        console.error(`Failed to install serve: ${serveOutput}`);
        throw new Error(`Serve installation failed: ${serveOutput}`);
      }
      console.log("Serve pre-installed successfully.");
    } catch (error) {
      console.error("Failed to boot WebContainer or install dependencies:", error);
      throw new Error("WebContainer setup failed. Please check your configuration.");
    }
  }
  return webContainerInstance;
};