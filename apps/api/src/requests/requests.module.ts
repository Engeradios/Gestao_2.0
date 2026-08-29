import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { UserNotificationsController } from './user-notifications.controller';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminNotificationsController,
    RequestsController,
    NotificationPreferencesController,
    UserNotificationsController,
  ],
  providers: [
    AdminNotificationsService,
    RequestsService,
    NotificationPreferencesService,
    UserNotificationsService,
  ],
})
export class RequestsModule {}
