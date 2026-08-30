const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('catalogo usa permissoes confirmadas',()=>{const s=read('src/permissions/mobile-modules.ts');assert.match(s,/OPERACIONAL\.OS\.VISUALIZAR/);assert.match(s,/ESTOQUE_LOGISTICA\.ROTEIRO_ENTREGA\.VISUALIZAR/);assert.doesNotMatch(s,/role\s*===/)});
test('normaliza permissions e permissoes',()=>{const s=read('src/permissions/access-control.ts');assert.match(s,/user\?\.permissions/);assert.match(s,/user\?\.permissoes/);assert.match(s,/toUpperCase/)});
test('rotas funcionais possuem PermissionGate',()=>{for(const p of ['src/app/os/index.tsx','src/app/os/[id].tsx','src/app/roteiro-entrega/index.tsx','src/app/roteiro-entrega/[id].tsx','src/app/roteiro-entrega/novo.tsx'])assert.match(read(p),/PermissionGate/)});
test('backend continua autoridade',()=>{assert.match(read('../api/src/operational-services/operational-services.controller.ts'),/PermissionsGuard/);assert.match(read('../api/src/delivery-route/delivery-route.controller.ts'),/PermissionsGuard/)});
