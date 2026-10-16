/* Vías clínicas · servicio de uso sin conexión.
   Guarda la app y sus archivos de apoyo; los PDF de las normas no se guardan. */
const VERSION='v1';
const CACHE='vias-clinicas-'+VERSION;
const SHELL=['./','index.html','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png','pdf.min.js','pdf.worker.min.js'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await Promise.all(SHELL.map(async u=>{
      try{const r=await fetch(new Request(u,{cache:'reload'}));if(r&&r.ok)await c.put(u,r);}catch(_){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('vias-clinicas-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;      // solo archivos de la propia app
  if(req.headers.has('range'))return;               // el visor de PDF pide por partes
  if(/\.pdf$/i.test(url.pathname))return;           // las normas no se guardan
  if(req.mode==='navigate'){                        // la página: primero la red, así se actualiza sola
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{const r=await fetch(req);if(r&&r.ok)c.put('index.html',r.clone());return r;}
      catch(_){return (await c.match('index.html'))||(await c.match('./'))||Response.error();}
    })());
    return;
  }
  e.respondWith((async()=>{                         // lo demás: primero lo guardado
    const c=await caches.open(CACHE);
    const hit=await c.match(req);
    if(hit){fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());}).catch(()=>{});return hit;}
    try{const r=await fetch(req);if(r&&r.ok)c.put(req,r.clone());return r;}
    catch(_){return Response.error();}
  })());
});
