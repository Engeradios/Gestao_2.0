# Exceção temporária de segurança

- Advisory: GHSA-ggr8-5vv4-36mx
- Dependência: deepmerge-ts 7.1.5
- Origem: @prisma/config 7.9.1
- Severidade reportada: alta
- Impacto: exaustão de pilha com grafos recursivos

## Mitigações

- Não executar npm audit fix --force.
- Não aplicar override incompatível sem homologação.
- Não incluir Prisma CLI na imagem final da API.
- Não encaminhar objetos externos ao Prisma Config.
- Atualizar quando o Prisma adotar deepmerge-ts 8 ou superior.
