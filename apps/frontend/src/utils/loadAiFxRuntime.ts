const AIFX_RUNTIME_ID = "aifx-runtime";
const AIFX_RUNTIME_URL = "https://cdn.aidesigner.ai/effects/runtime/v1.js";

let runtimePromise: Promise<void> | null = null;

export function loadAiFxRuntime(): Promise<void> {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    return Promise.reject(new Error("Movimiento reducido activado"));
  }

  if (typeof window !== "undefined" && (window as any).AIFX) {
    try {
      (window as any).AIFX.rescan();
    } catch (e) {
      console.warn("[aifx] rescan error:", e);
    }
    return Promise.resolve();
  }

  if (runtimePromise) {
    return runtimePromise.then(() => {
      if (typeof window !== "undefined" && (window as any).AIFX) {
        (window as any).AIFX.rescan();
      }
    });
  }

  runtimePromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(AIFX_RUNTIME_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        if ((window as any).AIFX) {
          (window as any).AIFX.rescan();
        }
        resolve();
        return;
      }

      existingScript.addEventListener(
        "load",
        () => {
          if ((window as any).AIFX) {
            (window as any).AIFX.rescan();
          }
          resolve();
        },
        { once: true }
      );

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
        if ((window as any).AIFX) {
          (window as any).AIFX.rescan();
        }
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

