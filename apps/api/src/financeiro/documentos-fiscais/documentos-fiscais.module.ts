import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { DocumentosFiscaisController } from './documentos-fiscais.controller';
import { DocumentosFiscaisService } from './documentos-fiscais.service';

import { AuthModule } from '../../auth/auth.module';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DocumentosFiscaisController],
  providers: [DocumentosFiscaisService],
  exports: [DocumentosFiscaisService],
})
export class DocumentosFiscaisModule {}
