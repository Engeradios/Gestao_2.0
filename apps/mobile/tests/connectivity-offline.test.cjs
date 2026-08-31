const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const r=p=>fs.readFileSync(p,'utf8');
test('store global usa expo network',()=>assert.match(r('src/stores/connectivity.store.ts'),/getNetworkStateAsync/));
test('layout alimenta store global',()=>assert.match(r('src/app/_layout.tsx'),/setNetwork\(state\)/));
test('expediente não abre modal offline',()=>assert.match(r('src/components/work-shift-panel.tsx'),/if\(!offline\)Alert\.alert/));
test('retry depende de online',()=>{for(const p of ['src/app/os/index.tsx','src/app/roteiro-entrega/index.tsx','src/app/notificacoes/index.tsx'])assert.match(r(p),/online/)});
