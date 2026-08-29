import { Module } from '@nestjs/common';
import { DashboardTvController } from './dashboard-tv.controller';
import { DashboardTvService } from './dashboard-tv.service';
@Module({
  controllers: [DashboardTvController],
  providers: [DashboardTvService],
})
export class DashboardTvModule {}
