import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProposalTypeAreasController } from './proposal-type-areas.controller';
import { ProposalTypeAreasService } from './proposal-type-areas.service';

@Module({
  imports: [AuthModule],
  controllers: [ProposalTypeAreasController],
  providers: [ProposalTypeAreasService],
  exports: [ProposalTypeAreasService],
})
export class ProposalTypeAreasModule {}
