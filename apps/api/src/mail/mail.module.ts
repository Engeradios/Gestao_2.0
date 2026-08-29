import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailController } from './mail.controller';
import { MailCryptoService } from './mail-crypto.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [MailController],
  providers: [MailCryptoService, MailService],
  exports: [MailCryptoService, MailService],
})
export class MailModule {}
