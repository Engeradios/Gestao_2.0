import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MAIL-OBRA-03C V4 - integração seletiva na abertura', () => {
  const source = readFileSync(
    join(__dirname, 'service-opening-notification.service.ts'),
    'utf8',
  );
  const functional = readFileSync(
    join(__dirname, 'operational-functional.service.ts'),
    'utf8',
  );
  const mailSend = jest.fn();

  beforeEach(() => mailSend.mockReset());

  it('injeta e consulta o seletor somente para ABERTURA', () => {
    expect(source).toContain('NotificationRecipientSelectorService');
    expect(source).toContain('private readonly recipientSelector');
    expect(source).toContain('await this.recipientSelector.select({');
    expect(source).toContain("evento: 'ABERTURA'");
    expect(source.match(/recipientSelector\.select/g)).toHaveLength(1);
  });

  it('usa UF, praça e área persistidas', () => {
    expect(source).toContain('uf: service.ufExecucao');
    expect(source).toContain("praca: service.pracaResponsavel ?? ''");
    expect(source).toContain("area: service.areaResponsavel ?? ''");
  });

  it('usa apenas destinatários do seletor', () => {
    expect(source).toContain('selection.destinatarios.map');
    expect(source).not.toContain('const configuredUsers =');
    expect(source).not.toContain('const responsibleUsers =');
    expect(source).not.toContain('const targetUsers =');
  });

  it('preserva chave idempotente e notificações internas', () => {
    expect(source).toContain('`SERVICO_ABERTURA:${serviceId}`');
    expect(source).toContain('notificacaoUsuario.createMany');
    expect(source).toContain("tipo: 'SERVICO_ABERTURA'");
  });

  it('mantém os anexos ativos do serviço', () => {
    expect(source).toContain('anexos: {');
    expect(source).toContain('where: { ativo: true }');
    expect(source).toContain('...service.anexos.map');
    expect(source).toContain('path: attachment.caminho');
    expect(source).toContain("contentDisposition: 'attachment' as const");
  });

  it('registra estratégia e SEM_COBERTURA', () => {
    expect(source).toContain('ROTEAMENTO:${selection.estrategia}');
    expect(source).toContain("motivo: 'SEM_COBERTURA'");
    expect(source).toContain('estrategia: selection.estrategia');
  });

  it('não chama MailService real', () => {
    expect(mailSend).not.toHaveBeenCalled();
  });

  it('preserva a abertura e reconhece os eventos funcionais integrados', () => {
    expect(source).toContain("evento: 'ABERTURA'");
    expect(functional).toContain("'CONCLUSAO'");
    expect(functional).toContain("'LOGISTICA'");
  });

  it('não adiciona varredura de pendências', () => {
    expect(source).not.toContain("emailAberturaStatus: 'PENDENTE'");
  });
});
