import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeliveryRouteController } from './delivery-route.controller';
import { DeliveryRouteService } from './delivery-route.service';
import { DeliveryRoutePdfService } from './delivery-route-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [DeliveryRouteController],
  providers: [DeliveryRouteService, DeliveryRoutePdfService],
})
export class DeliveryRouteModule {}
