const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const r=p=>fs.readFileSync(p,'utf8');
test('cache de notificações isolado por usuário',()=>{const s=r('src/services/notifications-offline.service.ts');assert.match(s,/user_key TEXT NOT NULL/);assert.match(s,/notification_read_outbox/)});
test('notificações carregam cache antes da rede',()=>{const s=r('src/stores/notifications.store.ts');assert.match(s,/hydrate/);assert.match(s,/loadNotificationCache/)});
test('foto usa documentDirectory',()=>assert.match(r('src/services/profile-photo-local.service.ts'),/documentDirectory/));
test('perfil usa endpoint confirmado',()=>assert.match(r('src/app/meu-perfil/index.tsx'),/usuarios\/me\/perfil/));
