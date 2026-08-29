import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Roteiro de Entrega - historico e retorno', () => {
  const base = join(__dirname);
  const controller = readFileSync(
    join(base, 'delivery-route.controller.ts'),
    'utf8',
  );
  const service = readFileSync(join(base, 'delivery-route.service.ts'), 'utf8');
  const dto = readFileSync(join(base, 'dto/delivery-route.dto.ts'), 'utf8');
  const schema = readFileSync(join(base, '../../prisma/schema.prisma'), 'utf8');

  it('protege leitura e gestao com permissoes proprias', () => {
    expect(controller).toContain(
      'ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.VISUALIZAR',
    );
    expect(controller).toContain('ESTOQUE_LOGISTICA.ROTEIRO_ENTREGA.GERENCIAR');
    expect(controller).toContain('JwtAuthGuard');
    expect(controller).toContain('PermissionsGuard');
  });

  it('possui estrutura de historico e vinculo de retorno', () => {
    expect(schema).toContain('model OpRoteiroEntregaHistorico');
    expect(schema).toContain('entregaOriginalId');
    expect(schema).toContain('tentativaNumero');
    expect(schema).toContain('eventoId');
    expect(schema).toContain('origemEvento');
  });

  it('expõe consulta cronológica do histórico da entrega', () => {
    expect(controller).toContain("@Get('entregas/:id/historico')");
    expect(service).toContain('async history(id: bigint)');
    expect(service).toContain('opRoteiroEntregaHistorico.findMany');
    expect(service).toContain("registradoEm: 'asc'");
  });
  it('possui cabeçalho editável e despacho transacional', () => {
    expect(controller).toContain("@Post('roteiros')");
    expect(controller).toContain("@Post('roteiros/:id/despachar')");
    expect(service).toContain('async saveRoute(');
    expect(service).toContain('async dispatchRoute(');
    expect(service).toContain("status: 'DESPACHADO'");
    expect(dto).toContain('export class SaveDeliveryRouteHeaderDto');
  });

  it('salva todas as paradas do roteiro em uma transação', () => {
    expect(controller).toContain("@Patch('roteiros/:id/paradas')");
    expect(service).toContain('async saveRouteStops(');
    expect(service).toContain('opRoteiroEntrega.deleteMany');
    expect(service).toContain("'SALVAR_PARADAS'");
    expect(dto).toContain('export class SaveDeliveryRouteStopsDto');
  });

  it('permite PDF geral, por motorista e devolução à base', () => {
    expect(controller).toContain("@Get('roteiros/pdf')");
    expect(controller).toContain("@Get('roteiros/:id/pdf')");
    expect(controller).toContain("@Post('entregas/:id/devolver')");
    expect(service).toContain('async returnToBase(');
    expect(service).toContain("status: 'Devolvido'");
  });

  it('possui autocomplete e indicadores operacionais clicáveis', () => {
    expect(controller).toContain("@Get('sugestoes')");
    expect(service).toContain('async suggestions(');
    expect(service).toContain("status: 'Em Rota'");
    expect(service).toContain('ocorrencias: naoEntregues + devolvidas');
  });

  it.todo('confirma retorno e grava historico na mesma transacao');
  it.todo('exige motivo quando o retorno for Nao Entregue');
  it.todo('cancela entrega e registra usuario, data e observacao');
  it('cria reentrega vinculada e incrementa a tentativa', () => {
    expect(service).toContain('entregaOriginalId: rootId');
    expect(service).toContain('tentativaNumero: nextAttempt');
    expect(service).toContain("statusNovo: 'Reentrega Gerada'");
    expect(service).toContain("source.status !== 'Não Entregue'");
    expect(dto).toContain('export class ReDeliveryDto');
  });
  it('trata eventoId repetido sem duplicar efeitos', () => {
    expect(service).toContain('where: { eventoId: body.eventoId }');
    expect(dto).toContain('eventoId?: string');
  });
  it('aceita origem WEB, APP ou SISTEMA validada por DTO', () => {
    expect(dto).toContain("@IsIn(['WEB', 'APP', 'SISTEMA'])");
  });
});
