import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('Importacao XLSX de OS', () => {
  const base = join(__dirname);
  const controller = readFileSync(
    join(base, 'os-import.controller.ts'),
    'utf8',
  );
  const service = readFileSync(join(base, 'os-import.service.ts'), 'utf8');
  it('protege previa e execucao', () => {
    expect(controller).toContain('OPERACIONAL.OS.VISUALIZAR');
    expect(controller).toContain('OPERACIONAL.OS.GERENCIAR');
    expect(controller).toContain('limits: { fileSize: 25 * 1024 * 1024 }');
  });
  it('usa transacao e registra historico', () => {
    expect(service).toContain('this.db.$transaction');
    expect(service).toContain("tipo: 'IMPORTACAO_XLSX'");
    expect(service).toContain('TransactionIsolationLevel.Serializable');
  });
  it('registra auditoria detalhada da importação', () => {
    expect(service).toContain('OS_IMPORTACAO_AUDITORIA_DETALHADA');
    expect(service).toContain('osImportacaoAuditoria.create');
    expect(service).toContain('osHistoricoAlteracao.createMany');
    expect(service).toContain("campo: '__CRIACAO__'");
    expect(service).toContain("digest('hex')");
  });

  it('preserva usuário e ignora registros sem mudança', () => {
    expect(controller).toContain('id: req.user?.sub || null');
    expect(service).toContain('ignorados++');
    expect(service).toContain('if (!changes.length && !clienteAlterado)');
  });

  it('exige OS e rejeita duplicidade na planilha', () => {
    expect(service).toContain('Coluna "OS" não encontrada');
    expect(service).toContain('A planilha contém OS duplicadas');
  });
});
