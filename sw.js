// Service worker mínimo: permite instalar o app. Não guarda cache, então
// cada atualização publicada aparece na hora.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
