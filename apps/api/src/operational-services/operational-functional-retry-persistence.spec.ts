import { promises as fs } from 'node:fs';
import { OperationalFunctionalService } from './operational-functional.service';

jest.mock('node:fs', () => ({
  promises: { access: jest.fn().mockResolvedValue(undefined) },
}));

type Tipo = 'conclusao' | 'logistica';
type Evento = 'CONCLUSAO' | 'LOGISTICA';
type Estrategia = 'PRACA_EXATA' | 'TODA_UF';
type TestCase = {
  tipo: Tipo;
  evento: Evento;
  estrategia: Estrategia;
  contadorInicial: number;
};
type LogData = {
  servicoId: string;
  tipo: string;
  assunto: string;
  destinatarios: string;
  qtdDest: number;
  sucesso: boolean;
  detalhe: string;
  comAnexo: boolean;
  usuario: string;
  tentativa: number;
  reenvio: boolean;
};
type LogCreateArgs = { data: LogData };
type UpdateData = {
  emailConclusaoStatus?: string;
  emailConclusaoTentativas?: number;
  emailConclusaoErro?: string | null;
  notificadoEm?: Date;
  emailAberturaStatus?: string;
  emailAberturaTentativas?: number;
  emailAberturaErro?: string | null;
  abertoEm?: Date;
  emailLogisticaStatus?: string;
  emailLogisticaTentativas?: number;
  emailLogisticaErro?: string | null;
};
type UpdateArgs = { where: { id: string }; data: UpdateData };

const cases: TestCase[] = [
  {
    tipo: 'conclusao',
    evento: 'CONCLUSAO',
    estrategia: 'PRACA_EXATA',
    contadorInicial: 4,
  },
  {
    tipo: 'logistica',
    evento: 'LOGISTICA',
    estrategia: 'TODA_UF',
    contadorInicial: 2,
  },
];

describe('MAIL-OBRA-04D-B-V3 - persistência separada do reenvio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.access as jest.MockedFunction<typeof fs.access>).mockResolvedValue(
      undefined,
    );
  });

  it.each(cases)(
    'persiste campos próprios para $tipo',
    async ({ tipo, evento, estrategia, contadorInicial }) => {
      const id = `servico-${tipo}`;
      const usuario = 'auditor@empresa.test';
      const logs: LogCreateArgs[] = [];
      const updates: UpdateArgs[] = [];
      const fixture = {
        id,
        proposta: 'PROP-900',
        cliente: 'Cliente Teste',
        contrato: 'CTR-900',
        pedido: 'PED-900',
        servicoAtividade: 'Atividade Teste',
        categoria: 'Categoria Teste',
        clienteLocal: 'Rio de Janeiro',
        enderecoInstalacao: null,
        responsavel: 'Responsável Teste',
        prioridade: 'NORMAL',
        status: 'EM_ANDAMENTO',
        inicioPlanejado: null,
        prazoFinal: null,
        inicioReal: null,
        conclusaoReal: null,
        proximaAcao: null,
        ultimaSituacao: null,
        observacoes: null,
        propostaPdf: null,
        propostaPdfNome: null,
        anexos: [],
        andamentos: [],
        ufExecucao: 'RJ',
        pracaResponsavel: 'Rio de Janeiro',
        areaResponsavel: 'OPERACIONAL',
        emailAberturaTentativas: 0,
        emailConclusaoTentativas: contadorInicial,
        emailLogisticaTentativas: contadorInicial,
      };
      const findUnique = jest.fn().mockResolvedValue(fixture);
      const create = jest.fn((args: LogCreateArgs) => {
        logs.push(args);
        return Promise.resolve({ id: 'log-1' });
      });
      const update = jest.fn((args: UpdateArgs) => {
        updates.push(args);
        return Promise.resolve({ id });
      });
      const findMany = jest.fn();
      const send = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
      const select = jest.fn().mockResolvedValue({
        estrategia,
        destinatarios: [
          {
            usuarioId: 'u1',
            nome: 'Usuário Teste',
            email: 'destinatario@empresa.test',
          },
        ],
      });
      const db = {
        opServico: { findUnique, update },
        opEmailLog: { create },
        opNotificacaoEmail: { findMany },
      };
      const functional = new OperationalFunctionalService(
        db as never,
        { send } as never,
        { select } as never,
      );

      const result = await functional.enviarEmail(id, tipo, usuario, true);

      expect(select).toHaveBeenCalledWith({
        uf: 'RJ',
        praca: 'Rio de Janeiro',
        area: 'OPERACIONAL',
        evento,
      });
      expect(findMany).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledTimes(1);
      expect(logs).toHaveLength(1);
      expect(logs[0]?.data.detalhe).toBe(
        `Reenvio manual | ROTEAMENTO:${estrategia}`,
      );
      expect(logs[0]?.data.tentativa).toBe(contadorInicial + 1);
      expect(logs[0]?.data.reenvio).toBe(true);
      expect(updates).toHaveLength(1);
      const data = updates[0]?.data;
      if (tipo === 'conclusao') {
        expect(data?.emailConclusaoStatus).toBe('ENVIADO');
        expect(data?.emailConclusaoTentativas).toBe(contadorInicial + 1);
        expect(data?.emailConclusaoErro).toBeNull();
        expect(data?.emailLogisticaStatus).toBeUndefined();
      } else {
        expect(data?.emailLogisticaStatus).toBe('ENVIADO');
        expect(data?.emailLogisticaTentativas).toBe(contadorInicial + 1);
        expect(data?.emailLogisticaErro).toBeNull();
        expect(data?.emailAberturaStatus).toBeUndefined();
        expect(data?.emailAberturaTentativas).toBeUndefined();
      }
      expect(result).toEqual({ sucesso: true, destinatarios: 1 });
    },
  );
});
