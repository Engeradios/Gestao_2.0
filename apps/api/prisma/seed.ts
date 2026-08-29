import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não configurada');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const permissoes = [
  ['ADMINISTRATIVO', 'USUARIOS', 'VISUALIZAR'],
  ['ADMINISTRATIVO', 'USUARIOS', 'CRIAR'],
  ['ADMINISTRATIVO', 'USUARIOS', 'EDITAR'],
  ['ADMINISTRATIVO', 'USUARIOS', 'DESATIVAR'],
  ['ADMINISTRATIVO', 'PERFIS', 'GERENCIAR'],
  ['ADMINISTRATIVO', 'AUDITORIA', 'VISUALIZAR'],
  ['OPERACIONAL', 'SERVICOS', 'VISUALIZAR'],
  ['OPERACIONAL', 'SERVICOS', 'GERENCIAR'],
  ['OPERACIONAL', 'OS', 'VISUALIZAR'],
  ['OPERACIONAL', 'OS', 'GERENCIAR'],
  ['PROPOSTAS', 'PROPOSTAS', 'VISUALIZAR'],
  ['PROPOSTAS', 'PROPOSTAS', 'GERENCIAR'],
  ['FINANCEIRO', 'CONTAS_RECEBER', 'VISUALIZAR'],
  ['FINANCEIRO', 'CONTAS_RECEBER', 'GERENCIAR'],
  ['FINANCEIRO', 'CONTAS_PAGAR', 'VISUALIZAR'],
  ['FINANCEIRO', 'CONTAS_PAGAR', 'GERENCIAR'],
  ['GRANDES_PROJETOS', 'PROJETOS', 'VISUALIZAR'],
  ['GRANDES_PROJETOS', 'PROJETOS', 'GERENCIAR'],
  ['VISTORIA', 'VISTORIAS', 'VISUALIZAR'],
  ['VISTORIA', 'VISTORIAS', 'GERENCIAR'],
] as const;

async function main(): Promise<void> {
  const administrador = await prisma.perfil.upsert({
    where: { codigo: 'ADMINISTRADOR' },
    update: {
      nome: 'Administrador',
      ativo: true,
      sistema: true,
    },
    create: {
      codigo: 'ADMINISTRADOR',
      nome: 'Administrador',
      descricao: 'Acesso administrativo integral',
      ativo: true,
      sistema: true,
    },
  });

  for (const [hub, modulo, acao] of permissoes) {
    const permissao = await prisma.permissao.upsert({
      where: {
        hub_modulo_acao: { hub, modulo, acao },
      },
      update: {},
      create: {
        hub,
        modulo,
        acao,
        descricao: `${acao} em ${modulo}`,
      },
    });

    await prisma.perfilPermissao.upsert({
      where: {
        perfilId_permissaoId: {
          perfilId: administrador.id,
          permissaoId: permissao.id,
        },
      },
      update: { efeito: 'PERMITIR' },
      create: {
        perfilId: administrador.id,
        permissaoId: permissao.id,
        efeito: 'PERMITIR',
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
