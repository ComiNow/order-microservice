import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderStatus as OrderStatusEnum } from './enum/order.enum';
import { OrdersService } from './orders.service';
import { envs } from '../config/envs';

const mockClientProxy = () => ({
  send: jest.fn()
});

const mockPrisma = {
  table: {
    findUnique: jest.fn(),
  },
  order: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('OrdersService', () => {
  let service: OrdersService;
  let client: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: envs.natsServiceName, useFactory: mockClientProxy },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    client = module.get<ClientProxy>(envs.natsServiceName);
    // Mock PrismaClient methods
    Object.assign(service, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order and return it with product names', async () => {
      const createOrderDto = {
        businessId: 'business-123',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        table: 5,
      };
      const products = [
        { id: 1, price: 10, name: 'Product 1' },
        { id: 2, price: 20, name: 'Product 2' },
      ];
      const table = { id: 'table-id', number: 5, businessId: 'business-123' };
      const order = {
        businessId: 'business-123',
        OrderItem: [
          { price: 10, quantity: 2, productId: 1 },
          { price: 20, quantity: 1, productId: 2 },
        ],
      };
      (client.send as jest.Mock).mockReturnValue({ toPromise: () => Promise.resolve(products) });
      (service.table.findUnique as jest.Mock).mockResolvedValue(table);
      (service.order.create as jest.Mock).mockResolvedValue(order);
      // Patch firstValueFrom to resolve products
      jest.spyOn(require('rxjs'), 'firstValueFrom').mockResolvedValue(products);
      const result = await service.create(createOrderDto as any, false);
      expect(result.OrderItem[0].name).toBe('Product 1');
      expect(result.OrderItem[1].name).toBe('Product 2');
    });

    it('should throw RpcException if table not found', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue(null);
      jest.spyOn(require('rxjs'), 'firstValueFrom').mockResolvedValue([]);
      await expect(service.create({ businessId: 'business-123', items: [], table: 1 } as any, false)).rejects.toThrow(RpcException);
    });
  });

  describe('findAllByBusinessId', () => {
    it('should return paginated orders', async () => {
      (service.order.count as jest.Mock).mockResolvedValue(2);
      (service.order.findMany as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await service.findAllByBusinessId({ status: OrderStatusEnum.PENDING, page: 1, limit: 2 }, 'business-123');
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findOneByBussinesId', () => {
    it('should return order with product names', async () => {
      const order = {
        id: 1,
        businessId: 'business-123',
        OrderItem: [
          { price: 10, quantity: 2, productId: 1 },
        ],
      };
      const products = [
        { id: 1, name: 'Product 1' },
      ];
      (service.order.findUnique as jest.Mock).mockResolvedValue(order);
      jest.spyOn(require('rxjs'), 'firstValueFrom').mockResolvedValue(products);
      const result = await service.findOneByBussinesId(1, 'business-123');
      expect(result.OrderItem[0].name).toBe('Product 1');
    });
    it('should throw RpcException if order not found', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOneByBussinesId(1, 'business-123')).rejects.toThrow(RpcException);
    });
  });

  describe('findPaidOrderByTableId', () => {
    it('should return paid order', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue({ id: 'table-id', businessId: 'business-123' });
      (service.order.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
      const result = await service.findPaidOrderByTableId('table-id', 'business-123');
      expect(result).toEqual({ id: 1 });
    });
    it('should throw RpcException if table not found', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findPaidOrderByTableId('table-id', 'business-123')).rejects.toThrow(RpcException);
    });
  });

  describe('getOrderPositionByTableId', () => {
    it('should return the order position', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue({ id: 'table-id', businessId: 'business-123' });
      (service.order.findMany as jest.Mock).mockResolvedValue([
        { tableId: 'table-id', paiddAt: new Date() },
        { tableId: 'other-table', paiddAt: new Date() },
      ]);
      const result = await service.getOrderPositionByTableId('table-id', 'business-123');
      expect(result).toBe(1);
    });
    it('should throw RpcException if table not found', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getOrderPositionByTableId('table-id', 'business-123')).rejects.toThrow(RpcException);
    });
    it('should throw RpcException if no orders found', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue({ id: 'table-id', businessId: 'business-123' });
      (service.order.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.getOrderPositionByTableId('table-id', 'business-123')).rejects.toThrow(RpcException);
    });
    it('should throw RpcException if no paid order for table', async () => {
      (service.table.findUnique as jest.Mock).mockResolvedValue({ id: 'table-id', businessId: 'business-123' });
      (service.order.findMany as jest.Mock).mockResolvedValue([
        { tableId: 'other-table', paiddAt: new Date() },
      ]);
      await expect(service.getOrderPositionByTableId('table-id', 'business-123')).rejects.toThrow(RpcException);
    });
  });

  describe('changeStatus', () => {
    it('should update order status', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PENDING });
      (service.order.update as jest.Mock).mockResolvedValue({ id: 1, status: OrderStatusEnum.PAID });
      const result = await service.changeStatus({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PAID });
      expect(result.status).toBe(OrderStatusEnum.PAID);
    });
    it('should throw RpcException if order not found', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.changeStatus({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PAID })).rejects.toThrow(RpcException);
    });
    it('should return order if status is the same', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PAID });
      const result = await service.changeStatus({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PAID });
      expect(result.status).toBe(OrderStatusEnum.PAID);
    });
    it('should throw RpcException if order does not belong to business', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue({ id: 1, businessId: 'other-business', status: OrderStatusEnum.PENDING });
      await expect(service.changeStatus({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PAID })).rejects.toThrow(RpcException);
    });
  });

  describe('createPaymentPreference', () => {
    it('should call client.send and return payment preference', async () => {
      const order = {
        id: 1,
        OrderItem: [
          { productId: 1, name: 'Product 1', price: 10, quantity: 2 },
        ],
      };
      const paymentPreference = { id: 'pref-1' };
      (client.send as jest.Mock).mockReturnValue({ toPromise: () => Promise.resolve(paymentPreference) });
      jest.spyOn(require('rxjs'), 'firstValueFrom').mockResolvedValue(paymentPreference);
      const result = await service.createPaymentPreference(order as any);
      expect(result).toEqual(paymentPreference);
    });
  });

  describe('paidOrder', () => {
    it('should update order as paid', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue({ id: 1, businessId: 'business-123', status: OrderStatusEnum.PENDING });
      (service.order.update as jest.Mock).mockResolvedValue({ id: 1, status: OrderStatusEnum.PAID, paid: true });
      const result = await service.paidOrder({ orderId: 1, businessId: 'business-123', status: 'PAID' });
      expect(result.status).toBe(OrderStatusEnum.PAID);
      expect(result.paid).toBe(true);
    });
    it('should throw RpcException if order not found', async () => {
      (service.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.paidOrder({ orderId: 1, businessId: 'business-123', status: 'PAID' })).rejects.toThrow(RpcException);
    });
    it('should throw RpcException if order does not belong to business', async () => {
      // El método paidOrder busca por id Y businessId, por lo que si no coincide el businessId, retorna null
      (service.order.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.paidOrder({ orderId: 1, businessId: 'business-123', status: 'PAID' })).rejects.toThrow(RpcException);
    });
  });
});
