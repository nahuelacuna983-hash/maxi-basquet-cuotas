const CHECK_UPDATE_EVERY_MS = 30 * 60 * 1000;

if ("serviceWorker" in navigator) {
  let isReloadingForUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isReloadingForUpdate) return;
    isReloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });

      await registration.update();
      window.setInterval(() => {
        registration.update().catch(() => {});
      }, CHECK_UPDATE_EVERY_MS);
    } catch (error) {
      console.info("No se pudo registrar la app instalable", error);
    }
  });
}
