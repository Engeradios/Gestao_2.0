const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const read=p=>fs.readFileSync(p,'utf8');
test('outbox possui chave local e estados',()=>{const s=read('src/services/offline-database.service.ts');assert.match(s,/PRIMARY KEY NOT NULL/);assert.match(s,/PENDING/);assert.match(s,/REVIEW/)});
test('evidencia e copiada antes da fila',()=>{const s=read('src/services/evidence-outbox.service.ts');assert.ok(s.indexOf('copyAsync')<s.indexOf('INSERT INTO offline_outbox'));assert.match(s,/documentDirectory/)});
test('arquivo so e removido apos resposta ok',()=>{const s=read('src/services/evidence-outbox.service.ts');assert.ok(s.indexOf('response.ok')<s.indexOf('deleteAsync'))});
test('roteiro nao foi incluido na outbox',()=>{assert.doesNotMatch(read('src/services/evidence-outbox.service.ts'),/roteiro-entrega/)});
