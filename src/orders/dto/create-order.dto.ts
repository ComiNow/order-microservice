import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrderItemDto } from "./order-item.dto";

enum PaidMethodType {
   CREDIT_CARD = 'CREDIT_CARD',
   DEBIT_CARD = 'DEBIT_CARD',
   CASH = 'CASH',
   BANK_TRANSFER = 'BANK_TRANSFER',
   ONLINE = 'ONLINE',
}

export class CreateOrderDto {

   @IsString()
   businessId: string

   @IsNumber()
   @IsPositive()
   table: number

   @IsEnum(PaidMethodType, {
      message: `paidMethodType must be one of the following values: ${Object.values(PaidMethodType).join(', ')}`
   })
   @IsOptional()
   paidMethodType?: PaidMethodType

   @IsEnum(['PENDING', 'PAID', 'DELIVERED'])
   @IsOptional()
   status?: 'PENDING' | 'PAID' | 'DELIVERED'

   @IsBoolean()
   @IsOptional()
   serviceCharge?: boolean

   @IsArray()
   @ArrayMinSize(1)
   @ValidateNested({ each: true })
   @Type(() => OrderItemDto)
   items: OrderItemDto[]

}
