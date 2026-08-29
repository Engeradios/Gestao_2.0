import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrandesProjetosController } from './grandes-projetos.controller';
import { GrandesProjetosService } from './grandes-projetos.service';
@Module({
  imports: [AuthModule],
  controllers: [GrandesProjetosController],
  providers: [GrandesProjetosService],
})
export class GrandesProjetosModule {}
