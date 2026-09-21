import { readFileSync } from 'node:fs'; import { join } from 'node:path';
describe('Grandes Projetos governança',()=>{ const c=readFileSync(join(__dirname,'grandes-projetos-governanca.controller.ts'),'utf8'); const s=readFileSync(join(__dirname,'grandes-projetos-governanca.service.ts'),'utf8'); const d=readFileSync(join(__dirname,'dto/gp-governanca.dto.ts'),'utf8');
 it('publica 12 rotas com RBAC',()=>{ for(const x of ['VISITAS.VISUALIZAR','VISITAS.GERENCIAR','EQUIPE.VISUALIZAR','EQUIPE.GERENCIAR','RISCOS.VISUALIZAR','RISCOS.GERENCIAR']) expect(c).toContain(`GRANDES_PROJETOS.${x}`); expect((c.match(/@(Get|Post|Patch|Delete)\(/g)||[]).length).toBe(12); });
 it('usa DTOs e validações',()=>{ expect(d).toContain('class-validator'); expect(d).toContain('class GpDeleteDto'); expect(d).toContain('@IsNotEmpty()'); });
 it('protege concorrência, auditoria e soft delete',()=>{ expect(s).toContain('this.db.$transaction'); expect(s).toContain('tx.auditoria.create'); expect(s).toContain('excluido_em:null'); expect(s).toContain('motivo_exclusao:motivo'); expect(s).toContain('Registro alterado por outro usuário'); });
 it('valida vínculo da OS e serializa bigint',()=>{ expect(s).toContain('OS não pertence ao projeto'); expect(s).toContain("typeof value==='bigint'"); expect(s).toContain('value.toString()'); });
});
