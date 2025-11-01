import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { OrderStatus, OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
  @IsString()
  businessId: string;

  @IsNumber()
  @IsPositive()
  id: number;

  @IsEnum(OrderStatusList, {
    message: `status must be one of the following values: ${OrderStatusList.join(', ')}`,
  })
  status: OrderStatus;
}
