import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [OrdersModule, TablesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
