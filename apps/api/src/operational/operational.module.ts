import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OperationalController } from './operational.controller';
import { OperationalService } from './operational.service';
import { OsImportController } from './os-import.controller';
import { OsImportService } from './os-import.service';
import { OsRulesService } from './os-rules.service';
import { OsSlaAdminController } from './os-sla-admin.controller';
import { OsSlaAdminService } from './os-sla-admin.service';
import { OsSlaService } from './os-sla.service';

@Module({
  imports: [AuthModule],
  controllers: [
    OsImportController,
    OperationalController,
    OsSlaAdminController,
  ],
  providers: [
    OsImportService,
    OperationalService,
    OsRulesService,
    OsSlaService,
    OsSlaAdminService,
  ],
})
export class OperationalModule {}
