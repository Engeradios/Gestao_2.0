import { ServiceOpeningNotificationService } from './service-opening-notification.service';
import { OperationalServiceImportController } from './operational-service-import.controller';
import { OperationalServiceImportService } from './operational-service-import.service';
import { OperationalRoutePdfService } from './operational-route-pdf.service';
import { OperationalPreventivesController } from './operational-preventives.controller';
import { OperationalPreventivesService } from './operational-preventives.service';
import { OperationalRouteController } from './operational-route.controller';
import { OperationalRouteService } from './operational-route.service';
import { OperationalFunctionalController } from './operational-functional.controller';
import { OperationalFunctionalService } from './operational-functional.service';
import { Module } from '@nestjs/common';
import { OperationalServicesController } from './operational-services.controller';
import { OperationalServicesService } from './operational-services.service';
@Module({
  controllers: [
    OperationalServiceImportController,
    OperationalServicesController,
    OperationalFunctionalController,
    OperationalPreventivesController,
    OperationalRouteController,
  ],
  providers: [
    ServiceOpeningNotificationService,
    OperationalServiceImportService,
    OperationalServicesService,
    OperationalFunctionalService,
    OperationalPreventivesService,
    OperationalRouteService,
    OperationalRoutePdfService,
  ],
})
export class OperationalServicesModule {}
