import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import {
  ChangeOrderStatusDto,
  CreateOrderDto,
  OrderPaginationDto,
  PaidOrderDto,
} from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto, false);
    const paymentPreference = await this.ordersService.createPaymentPreference(order);
    return {
      order,
      paymentPreference,
    };
  }

  @MessagePattern('createOrderWithStatus')
  async createWithStatus(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto, true);
    return order;
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() { orderPaginationDto, businessId }: { orderPaginationDto: OrderPaginationDto, businessId: string }) {
    return this.ordersService.findAllByBusinessId(orderPaginationDto, businessId);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload() payload: { id: string, businessId: string }) {
    return this.ordersService.findOneByBussinesId(Number(payload.id), payload.businessId);
  }

  @MessagePattern('findPaidOrderByTableId')
  findPaidOrderByTableId(@Payload() payload: { tableId: string, businessId: string }) {
    return this.ordersService.findPaidOrderByTableId(payload.tableId, payload.businessId);
  }

  @MessagePattern('getOrderPositionByTableId')
  getOrderPositionByTableId(@Payload() payload: { tableId: string, businessId: string }) {
    return this.ordersService.getOrderPositionByTableId(payload.tableId, payload.businessId);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    console.log(changeOrderStatusDto);
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  @MessagePattern({ cmd: 'find_top_selling_products' })
  findTopSellingProducts(@Payload() payload: { limit: number, businessId: string }) {
    return this.ordersService.findTopSellingProductsByBusinessId(payload.limit, payload.businessId);
  }

  @MessagePattern('findKitchenOrders')
  findKitchenOrders(@Payload() payload: { paginationDto: PaginationDto; businessId: string }) {
    return this.ordersService.findKitchenOrders(payload.paginationDto, payload.businessId);
  }

  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    return this.ordersService.paidOrder(paidOrderDto);
  }

  @MessagePattern('markOrderAsDelivered')
  markOrderAsDelivered(@Payload() payload: { id: number; businessId: string }) {
    return this.ordersService.markOrderAsDelivered(payload.id, payload.businessId);
  }
}
