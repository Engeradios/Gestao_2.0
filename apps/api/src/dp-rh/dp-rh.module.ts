import { Module } from '@nestjs/common';
import { DpRhController } from './dp-rh.controller';
import { DpRhService } from './dp-rh.service';

@Module({
  controllers: [DpRhController],
  providers: [DpRhService],
})
export class DpRhModule {}
