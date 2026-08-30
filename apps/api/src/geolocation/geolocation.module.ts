import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { GeolocationController } from './geolocation.controller';
import { GeolocationService } from './geolocation.service';

@Module({
  imports: [PrismaModule],
  controllers: [GeolocationController],
  providers: [GeolocationService],
})
export class GeolocationModule {}
