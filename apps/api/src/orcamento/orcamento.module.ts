import { Module } from '@nestjs/common';
import { OrcamentoController } from './orcamento.controller';
import { OrcamentoService } from './orcamento.service';
import { OrcamentoEvidenciaService } from './orcamento-evidencia.service';

@Module({
  controllers: [OrcamentoController],
  providers: [OrcamentoService, OrcamentoEvidenciaService],
  exports: [OrcamentoService],
})
export class OrcamentoModule {}
