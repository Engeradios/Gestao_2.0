import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('MAIL-OBRA-03D V3', () => {
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
  it('injeta o seletor apos MailService', () => {
    expect(source).toContain('private readonly mail: MailService');
    expect(source).toContain(
      'private readonly recipientSelector: NotificationRecipientSelectorService',
    );
  });
  it('integra conclusão e logística com seleção comum', () => {
    expect(source).toContain('MAIL_OBRA_03E_V2_LOGISTICA');
    expect(source).toContain("tipo === 'conclusao'");
    expect(source).toContain("tipo === 'logistica'");
    expect(source).toContain("? 'CONCLUSAO'");
    expect(source).toContain("? 'LOGISTICA'");
    expect(source).toContain('evento: routingEvent');
    expect(source.match(/recipientSelector\.select/g)).toHaveLength(1);
  });
  it('usa campos reais e destinatarios da matriz', () => {
    expect(source).toContain('uf: s.ufExecucao');
    expect(source).toContain("praca: s.pracaResponsavel ?? ''");
    expect(source).toContain("area: s.areaResponsavel ?? ''");
    expect(source).toContain('routingSelection.destinatarios.map');
  });
  it('preserva abertura automatica', () => {
    expect(opening).toContain("evento: 'ABERTURA'");
    expect(opening).toContain('recipientSelector.select');
  });
  it('nao envia no teste', () => expect(sendMail).not.toHaveBeenCalled());
  it('nao retroprocessa', () =>
    expect(source).not.toContain('MAIL_OBRA_03D_PROCESSAR_PENDENTES'));
});
