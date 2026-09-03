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
import { NotificationRecipientSelectorService } from './notification-recipient-selector.service';
import { OperationalServicesController } from './operational-services.controller';
import { OperationalServicesService } from './operational-services.service';
import { NotificationResponsibilitiesController } from './notification-responsibilities.controller';
import { NotificationResponsibilitiesService } from './notification-responsibilities.service';
import { BusinessCalendarService } from './business-calendar.service';

import { ServicePlanningRulesService } from './service-planning-rules.service';
import { ServicePlanningPreviewService } from './service-planning-preview.service';
@Module({
  controllers: [
    NotificationResponsibilitiesController,
    OperationalServiceImportController,
    OperationalServicesController,
    OperationalFunctionalController,
    OperationalPreventivesController,
    OperationalRouteController,
  ],
  providers: [
    NotificationRecipientSelectorService,
    ServicePlanningPreviewService,
    ServicePlanningRulesService,
    BusinessCalendarService,
    NotificationResponsibilitiesService,
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
