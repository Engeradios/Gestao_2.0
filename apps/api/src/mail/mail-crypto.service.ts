import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EncryptedSecret {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
}

@Injectable()
export class MailCryptoService {
  private readonly algorithm = 'aes-256-gcm';

  private key(): Buffer {
    const value = process.env.MAIL_ENCRYPTION_KEY;

    if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
      throw new InternalServerErrorException(
        'MAIL_ENCRYPTION_KEY não configurada corretamente',
      );
    }

    return Buffer.from(value, 'hex');
  }

  encrypt(value: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key(), iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    return {
      encrypted,
      iv,
      tag: cipher.getAuthTag(),
    };
  }

  decrypt(encrypted: Uint8Array, iv: Uint8Array, tag: Uint8Array): string {
    try {
      const decipher = createDecipheriv(
        this.algorithm,
        this.key(),
        Buffer.from(iv),
      );

      decipher.setAuthTag(Buffer.from(tag));

      return Buffer.concat([
        decipher.update(Buffer.from(encrypted)),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível descriptografar a senha SMTP',
      );
    }
  }
}
