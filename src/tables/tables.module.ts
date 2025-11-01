import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { NastModule } from '../transports/nast.module';

@Module({
  controllers: [TablesController],
  providers: [TablesService],
  imports: [NastModule],
})
export class TablesModule { }
