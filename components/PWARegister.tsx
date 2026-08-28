"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registrato con successo:", reg.scope))
        .catch((err) => console.error("Errore registrazione Service Worker:", err));
    }
  }, []);

  return null;
}