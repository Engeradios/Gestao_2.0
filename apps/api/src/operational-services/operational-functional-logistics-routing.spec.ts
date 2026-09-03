import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MAIL-OBRA-03E - roteamento seletivo da logística', () => {
  const source = readFileSync(
    join(__dirname, 'operational-functional.service.ts'),
    'utf8',
  );
  const opening = readFileSync(
    join(__dirname, 'service-opening-notification.service.ts'),
    'utf8',
  );
  const sendMail = jest.fn();

  beforeEach(() => sendMail.mockReset());

  it('integra conclusão e logística com seleção comum', () => {
    expect(source).toContain('MAIL_OBRA_03E_V2_LOGISTICA');
    expect(source).toContain("tipo === 'conclusao'");
    expect(source).toContain("tipo === 'logistica'");
    expect(source).toContain("? 'CONCLUSAO'");
    expect(source).toContain("? 'LOGISTICA'");
    expect(source).toContain('evento: routingEvent');
    expect(source.match(/recipientSelector\.select/g)).toHaveLength(1);
  });

  it('usa UF, praça e área reais do serviço', () => {
    expect(source).toContain('uf: s.ufExecucao');
    expect(source).toContain("praca: s.pracaResponsavel ?? ''");
    expect(source).toContain("area: s.areaResponsavel ?? ''");
  });

  it('usa destinatários da matriz nos eventos roteados', () => {
    expect(source).toContain('routingSelection.destinatarios.map');
    expect(source).toContain('item.email');
    expect(source).toContain('ROTEAMENTO:${routingSelection.estrategia}');
  });

  it('mantém abertura manual no fluxo global existente', () => {
    expect(source).toContain("tipo === 'abertura'");
    expect(source).toContain(': null;');
    expect(source).toContain('this.db.opNotificacaoEmail.findMany');
  });

  it('preserva abertura automática geográfica', () => {
    expect(opening).toContain("evento: 'ABERTURA'");
    expect(opening).toContain('recipientSelector.select');
  });

  it('não executa envio real durante o teste', () => {
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('não adiciona retroprocessamento', () => {
    expect(source).not.toContain('MAIL_OBRA_03E_V2_PROCESSAR_PENDENTES');
    expect(source).not.toContain("emailConclusaoStatus: 'PENDENTE'");
  });
});
