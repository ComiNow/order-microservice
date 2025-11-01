import { Controller } from '@nestjs/common';
import { TablesService } from './tables.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @MessagePattern('findTableById')
  findTableById(@Payload() payload: { id: string, businessId: string }) {
    return this.tablesService.findTableByIdAndBusinessId(payload.id, payload.businessId);
  }

}
