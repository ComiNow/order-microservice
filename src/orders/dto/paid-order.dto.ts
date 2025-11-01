import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

export class PaidOrderDto {

   @IsString()
   @IsNotEmpty()
   businessId: string;

   @IsNumber()
   @IsPositive()
   @IsNotEmpty()
   orderId: number;

   @IsString()
   @IsNotEmpty()
   status: string;

}