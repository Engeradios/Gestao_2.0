import { AppFieldCoreModule } from './app-field-core/app-field-core.module';
import { UserSelfProfileModule } from './user-self-profile/user-self-profile.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AdministrativeContractsModule } from './administrative-contracts/administrative-contracts.module';
import { LogisticsProposalsModule } from './logistics-proposals/logistics-proposals.module';
import { ProposalTypeAreasModule } from './proposal-type-areas/proposal-type-areas.module';
import { SalesOrdersImportModule } from './sales-orders-import/sales-orders-import.module';
import { ReferenceDataModule } from './reference-data/reference-data.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { GrandesProjetosModule } from './grandes-projetos/grandes-projetos.module';
import { ProposalsModule } from './proposals/proposals.module';
import { OperationalServicesModule } from './operational-services/operational-services.module';
import { DeliveryRouteModule } from './delivery-route/delivery-route.module';
import { MailModule } from './mail/mail.module';
import { RequestsModule } from './requests/requests.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './database/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { UsersModule } from './users/users.module';
import { OperationalModule } from './operational/operational.module';

import { DashboardTvModule } from './dashboard-tv/dashboard-tv.module';

import { AppFieldEvidenceModule } from './app-field-evidence/app-field-evidence.module';

@Module({
  imports: [
    AppFieldCoreModule,
    UserSelfProfileModule,

    AppFieldEvidenceModule,
    PurchasesModule,
    AdministrativeContractsModule,
    LogisticsProposalsModule,
    ProposalTypeAreasModule,
    SalesOrdersImportModule,
    ReferenceDataModule,
    DashboardTvModule,
    MailModule,
    RequestsModule,
    DeliveryRouteModule,
    FinanceiroModule,
    GrandesProjetosModule,
    ProposalsModule,
    OperationalServicesModule,
    OperationalModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    ProfilesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
