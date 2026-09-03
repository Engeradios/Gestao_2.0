import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServicePlanningPreviewService } from './service-planning-preview.service';

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('ServicePlanningPreviewService', () => {
  const db = {
    opProposta: { findFirst: jest.fn() },
    opTipoPropostaArea: { findUnique: jest.fn() },
    opPropostaEvolucao: { findFirst: jest.fn() },
  };
  const planningRules = { calculate: jest.fn() };
  const service = new ServicePlanningPreviewService(
    db as never,
    planningRules as never,
  );

  const proposal = {
    id: 10,
    numero: 'P-100',
    status: 'APROVADO',
    tipo: 'Venda + Mão de Obra',
    atualizadoEm: utc('2026-09-02'),
    dataCadastro: utc('2026-09-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.opProposta.findFirst.mockResolvedValue(proposal);
    db.opTipoPropostaArea.findUnique.mockResolvedValue({
      ativo: true,
      area: 'AMBAS',
    });
    db.opPropostaEvolucao.findFirst.mockResolvedValue({
      registradoEm: utc('2026-09-03'),
    });
    planningRules.calculate.mockResolvedValue({
      area: 'AMBAS',
      uf: 'RJ',
      preparationBusinessDays: 15,
      executionBusinessDays: 5,
      deliveryExpectedAt: utc('2026-09-24'),
      plannedStartAt: utc('2026-09-24'),
      deadlineAt: utc('2026-10-01'),
      stateCalendarAvailable: true,
    });
  });

  it('retorna a prévia completa sem persistir dados', async () => {
    const result = await service.preview({
      proposta: ' P-100 ',
      areaResponsavel: 'AMBAS',
      ufExecucao: 'RJ',
      pracaResponsavel: ' Rio   de Janeiro ',
      tempoExecucaoDias: '5',
    });
    expect(result).toMatchObject({
      proposta: 'P-100',
      areaResponsavel: 'AMBAS',
      ufExecucao: 'RJ',
      pracaResponsavel: 'Rio de Janeiro',
      dataAprovacao: '2026-09-03',
      origemDataAprovacao: 'HISTORICO_STATUS',
      diasPreparacao: 15,
      tempoExecucaoDias: 5,
      chegadaPrevista: '2026-09-24',
      inicioPlanejado: '2026-09-24',
      prazoFinal: '2026-10-01',
      calendarioEstadualDisponivel: true,
    });
    expect(planningRules.calculate).toHaveBeenCalledTimes(1);
  });

  it('usa atualizadoEm quando o histórico não existe', async () => {
    db.opPropostaEvolucao.findFirst.mockResolvedValue(null);
    const result = await service.preview({
      proposta: 'P-100',
      areaResponsavel: 'AMBAS',
      ufExecucao: 'RJ',
      pracaResponsavel: 'Capital',
      tempoExecucaoDias: '5',
    });
    expect(result.origemDataAprovacao).toBe('ATUALIZADO_EM');
  });

  it('usa dataCadastro quando os demais registros não existem', async () => {
    db.opProposta.findFirst.mockResolvedValue({
      ...proposal,
      atualizadoEm: null,
    });
    db.opPropostaEvolucao.findFirst.mockResolvedValue(null);
    const result = await service.preview({
      proposta: 'P-100',
      areaResponsavel: 'AMBAS',
      ufExecucao: 'RJ',
      pracaResponsavel: 'Capital',
      tempoExecucaoDias: '5',
    });
    expect(result.origemDataAprovacao).toBe('DATA_CADASTRO');
  });

  it('rejeita proposta inexistente', async () => {
    db.opProposta.findFirst.mockResolvedValue(null);
    await expect(
      service.preview({
        proposta: 'X',
        areaResponsavel: 'AMBAS',
        ufExecucao: 'RJ',
        pracaResponsavel: 'Capital',
        tempoExecucaoDias: '5',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejeita proposta não aprovada', async () => {
    db.opProposta.findFirst.mockResolvedValue({
      ...proposal,
      status: 'PENDENTE',
    });
    await expect(
      service.preview({
        proposta: 'P-100',
        areaResponsavel: 'AMBAS',
        ufExecucao: 'RJ',
        pracaResponsavel: 'Capital',
        tempoExecucaoDias: '5',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita área incompatível', async () => {
    await expect(
      service.preview({
        proposta: 'P-100',
        areaResponsavel: 'LOGISTICA',
        ufExecucao: 'RJ',
        pracaResponsavel: 'Capital',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita praça vazia', async () => {
    await expect(
      service.preview({
        proposta: 'P-100',
        areaResponsavel: 'AMBAS',
        ufExecucao: 'RJ',
        pracaResponsavel: '',
        tempoExecucaoDias: '5',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
