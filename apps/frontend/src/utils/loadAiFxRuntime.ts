const AIFX_RUNTIME_ID = "aifx-runtime";
const AIFX_RUNTIME_URL = "https://cdn.aidesigner.ai/effects/runtime/v1.js";

let runtimePromise: Promise<void> | null = null;

export function loadAiFxRuntime(): Promise<void> {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    return Promise.reject(new Error("Movimiento reducido activado"));
  }

  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(AIFX_RUNTIME_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No fue posible cargar AIFX")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = AIFX_RUNTIME_ID;
    script.src = AIFX_RUNTIME_URL;
    script.async = true;
    script.dataset.aifxRuntime = "true";

    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );

    script.addEventListener(
      "error",
      () => {
        runtimePromise = null;
        reject(new Error("No fue posible cargar AIFX"));
      },
      { once: true }
    );

    document.head.appendChild(script);
  });

  return runtimePromise;
}
