import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} não configurada`);
  }

  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: requiredEnv('DATABASE_URL'),
  }),
});

async function main(): Promise<void> {
  const temporaryPassword = requiredEnv('ADMIN_TEMP_PASSWORD');

  const existing = await prisma.usuario.findUnique({
    where: { email: 'admin@engeradios.local' },
  });

  if (existing) {
    return;
  }

  const profile = await prisma.perfil.findUniqueOrThrow({
    where: { codigo: 'ADMINISTRADOR' },
  });

  const passwordHash: string = await bcrypt.hash(
    temporaryPassword,
    12,
  );

  const user = await prisma.usuario.create({
    data: {
      nome: 'Administrador Engerádios',
      email: 'admin@engeradios.local',
      senhaHash: passwordHash,
      status: 'ATIVO',
      unidade: 'RJ',
      perfis: {
        create: {
          perfilId: profile.id,
        },
      },
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: user.id,
      entidade: 'USUARIO',
      entidadeId: user.id,
      acao: 'CRIACAO_ADMIN_INICIAL',
      dadosDepois: {
        email: user.email,
        perfil: profile.codigo,
      },
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
