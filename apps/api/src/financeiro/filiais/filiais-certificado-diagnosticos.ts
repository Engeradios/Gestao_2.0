export const ERROS_CERTIFICADO_A1 = {
  PFX_PASSWORD_INVALID: {
    codigo: 'PFX_PASSWORD_INVALID',
    mensagem:
      'A senha informada não abriu o certificado. Confira a senha e tente novamente.',
  },
  PFX_FORMAT_INVALID: {
    codigo: 'PFX_FORMAT_INVALID',
    mensagem:
      'O arquivo não foi reconhecido como certificado PKCS#12 válido. Selecione o arquivo original .pfx ou .p12.',
  },
  PFX_LEGACY_UNSUPPORTED: {
    codigo: 'PFX_LEGACY_UNSUPPORTED',
    mensagem:
      'O certificado utiliza criptografia antiga ou incompatível. Exporte novamente o certificado em formato PKCS#12 atualizado.',
  },
  PFX_CERTIFICATE_MISSING: {
    codigo: 'PFX_CERTIFICATE_MISSING',
    mensagem:
      'O arquivo não contém um certificado digital utilizável.',
  },
  PFX_PRIVATE_KEY_MISSING: {
    codigo: 'PFX_PRIVATE_KEY_MISSING',
    mensagem:
      'O arquivo não contém a chave privada. Exporte o certificado novamente incluindo a chave privada.',
  },
  PFX_IDENTITY_INVALID: {
    codigo: 'PFX_IDENTITY_INVALID',
    mensagem:
      'Não foi possível identificar os dados ICP-Brasil do certificado.',
  },
  PFX_CNPJ_MISSING: {
    codigo: 'PFX_CNPJ_MISSING',
    mensagem:
      'O certificado não possui CNPJ identificável no padrão ICP-Brasil.',
  },
  PFX_CNPJ_MISMATCH: {
    codigo: 'PFX_CNPJ_MISMATCH',
    mensagem:
      'O CNPJ do certificado não pertence à mesma raiz do CNPJ da filial selecionada.',
  },
  PFX_CNPJ_AMBIGUOUS: {
    codigo: 'PFX_CNPJ_AMBIGUOUS',
    mensagem:
      'O certificado contém mais de uma identidade compatível. Utilize um certificado empresarial com identificação inequívoca.',
  },
  PFX_VALIDITY_INVALID: {
    codigo: 'PFX_VALIDITY_INVALID',
    mensagem:
      'Não foi possível determinar a validade do certificado.',
  },
  PFX_EXPIRED: {
    codigo: 'PFX_EXPIRED',
    mensagem:
      'O certificado digital está expirado. Instale um certificado válido.',
  },
  PFX_STORAGE_FAILURE: {
    codigo: 'PFX_STORAGE_FAILURE',
    mensagem:
      'O certificado foi validado, mas não pôde ser armazenado com segurança.',
  },
} as const;

export type CodigoErroCertificadoA1 =
  keyof typeof ERROS_CERTIFICADO_A1;

export function mensagemCertificadoA1(
  codigo: CodigoErroCertificadoA1,
): string {
  return ERROS_CERTIFICADO_A1[codigo].mensagem;
}
