import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto, ChangeOrderStatusDto, OrderPaginationDto, PaidOrderDto } from './dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrderStatus } from './enum/order.enum';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    createPaymentPreference: jest.fn(),
    findAllByBusinessId: jest.fn(),
    findOneByBussinesId: jest.fn(),
    findPaidOrderByTableId: jest.fn(),
    getOrderPositionByTableId: jest.fn(),
    changeStatus: jest.fn(),
    findTopSellingProductsByBusinessId: jest.fn(),
    findKitchenOrders: jest.fn(),
    paidOrder: jest.fn(),
    markOrderAsDelivered: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const mockCreateOrderDto: CreateOrderDto = {
      businessId: 'business-123',
      table: 1,
      items: [
        {
          productId: 1,
          quantity: 2,
          price: 50,
        },
      ],
    };

    const mockOrder = {
      id: 1,
      businessId: 'business-123',
      tableId: 'table-123',
      totalAmount: 100,
      totalItems: 2,
      status: 'PENDING',
      OrderItem: [
        {
          productId: 1,
          quantity: 2,
          price: 50,
          name: 'Test Product',
        },
      ],
    };

    const mockPaymentPreference = {
      id: 'payment-123',
      init_point: 'https://payment-url.com',
    };

    it('should create an order and return order with payment preference', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);
      mockOrdersService.createPaymentPreference.mockResolvedValue(mockPaymentPreference);

      const result = await controller.create(mockCreateOrderDto);

      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, false);
      expect(mockOrdersService.createPaymentPreference).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual({
        order: mockOrder,
        paymentPreference: mockPaymentPreference,
      });
    });

    it('should handle service errors when creating order', async () => {
      const error = new Error('Service error');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(mockCreateOrderDto)).rejects.toThrow('Service error');
      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, false);
      expect(mockOrdersService.createPaymentPreference).not.toHaveBeenCalled();
    });

    it('should handle service errors when creating payment preference', async () => {
      const error = new Error('Payment service error');
      mockOrdersService.create.mockResolvedValue(mockOrder);
      mockOrdersService.createPaymentPreference.mockRejectedValue(error);

      await expect(controller.create(mockCreateOrderDto)).rejects.toThrow('Payment service error');
      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, false);
      expect(mockOrdersService.createPaymentPreference).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('createWithStatus', () => {
    const mockCreateOrderDto: CreateOrderDto = {
      businessId: 'business-123',
      table: 1,
      status: 'PAID',
      items: [
        {
          productId: 1,
          quantity: 2,
          price: 50,
        },
      ],
    };

    const mockOrder = {
      id: 1,
      businessId: 'business-123',
      tableId: 'table-123',
      totalAmount: 100,
      totalItems: 2,
      status: 'PAID',
      OrderItem: [
        {
          productId: 1,
          quantity: 2,
          price: 50,
          name: 'Test Product',
        },
      ],
    };

    it('should create an order with status', async () => {
      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.createWithStatus(mockCreateOrderDto);

      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, true);
      expect(result).toEqual(mockOrder);
    });

    it('should handle service errors when creating order with status', async () => {
      const error = new Error('Service error');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.createWithStatus(mockCreateOrderDto)).rejects.toThrow('Service error');
      expect(mockOrdersService.create).toHaveBeenCalledWith(mockCreateOrderDto, true);
    });
  });

  describe('findAll', () => {
    const mockOrderPaginationDto: OrderPaginationDto = {
      page: 1,
      limit: 10,
      status: OrderStatus.PENDING,
    };
    const businessId = 'business-123';

    const mockResult = {
      data: [
        {
          id: 1,
          businessId: 'business-123',
          status: 'PENDING',
          totalAmount: 100,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        lastPage: 1,
      },
    };

    it('should return paginated orders for a business', async () => {
      mockOrdersService.findAllByBusinessId.mockResolvedValue(mockResult);

      const result = await controller.findAll({
        orderPaginationDto: mockOrderPaginationDto,
        businessId,
      });

      expect(mockOrdersService.findAllByBusinessId).toHaveBeenCalledWith(
        mockOrderPaginationDto,
        businessId,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors when finding all orders', async () => {
      const error = new Error('Service error');
      mockOrdersService.findAllByBusinessId.mockRejectedValue(error);

      await expect(
        controller.findAll({
          orderPaginationDto: mockOrderPaginationDto,
          businessId,
        }),
      ).rejects.toThrow('Service error');
    });
  });

  describe('findOne', () => {
    const payload = { id: '1', businessId: 'business-123' };
    const mockOrder = {
      id: 1,
      businessId: 'business-123',
      status: 'PENDING',
      totalAmount: 100,
      OrderItem: [
        {
          productId: 1,
          quantity: 2,
          price: 50,
          name: 'Test Product',
        },
      ],
    };

    it('should return a single order by id and business id', async () => {
      mockOrdersService.findOneByBussinesId.mockResolvedValue(mockOrder);

      const result = await controller.findOne(payload);

      expect(mockOrdersService.findOneByBussinesId).toHaveBeenCalledWith(
        Number(payload.id),
        payload.businessId,
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle service errors when finding one order', async () => {
      const error = new Error('Order not found');
      mockOrdersService.findOneByBussinesId.mockRejectedValue(error);

      await expect(controller.findOne(payload)).rejects.toThrow('Order not found');
    });
  });

  describe('findPaidOrderByTableId', () => {
    const payload = { tableId: 'table-123', businessId: 'business-123' };
    const mockOrder = {
      id: 1,
      businessId: 'business-123',
      tableId: 'table-123',
      status: 'PAID',
      totalAmount: 100,
    };

    it('should return paid order by table id', async () => {
      mockOrdersService.findPaidOrderByTableId.mockResolvedValue(mockOrder);

      const result = await controller.findPaidOrderByTableId(payload);

      expect(mockOrdersService.findPaidOrderByTableId).toHaveBeenCalledWith(
        payload.tableId,
        payload.businessId,
      );
      expect(result).toEqual(mockOrder);
    });

    it('should handle service errors when finding paid order by table id', async () => {
      const error = new Error('Table not found');
      mockOrdersService.findPaidOrderByTableId.mockRejectedValue(error);

      await expect(controller.findPaidOrderByTableId(payload)).rejects.toThrow('Table not found');
    });
  });

  describe('getOrderPositionByTableId', () => {
    const payload = { tableId: 'table-123', businessId: 'business-123' };
    const mockPosition = 3;

    it('should return order position by table id', async () => {
      mockOrdersService.getOrderPositionByTableId.mockResolvedValue(mockPosition);

      const result = await controller.getOrderPositionByTableId(payload);

      expect(mockOrdersService.getOrderPositionByTableId).toHaveBeenCalledWith(
        payload.tableId,
        payload.businessId,
      );
      expect(result).toEqual(mockPosition);
    });

    it('should handle service errors when getting order position', async () => {
      const error = new Error('No orders found');
      mockOrdersService.getOrderPositionByTableId.mockRejectedValue(error);

      await expect(controller.getOrderPositionByTableId(payload)).rejects.toThrow('No orders found');
    });
  });

  describe('changeOrderStatus', () => {
    const mockChangeOrderStatusDto: ChangeOrderStatusDto = {
      id: 1,
      businessId: 'business-123',
      status: OrderStatus.PAID,
    };

    const mockUpdatedOrder = {
      id: 1,
      businessId: 'business-123',
      status: OrderStatus.PAID,
      totalAmount: 100,
    };

    it('should change order status successfully', async () => {
      mockOrdersService.changeStatus.mockResolvedValue(mockUpdatedOrder);

      const result = await controller.changeOrderStatus(mockChangeOrderStatusDto);

      expect(mockOrdersService.changeStatus).toHaveBeenCalledWith(mockChangeOrderStatusDto);
      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should handle service errors when changing order status', async () => {
      const error = new Error('Order not found');
      mockOrdersService.changeStatus.mockRejectedValue(error);

      await expect(controller.changeOrderStatus(mockChangeOrderStatusDto)).rejects.toThrow('Order not found');
    });
  });

  describe('paidOrder', () => {
    const mockPaidOrderDto: PaidOrderDto = {
      orderId: 1,
      businessId: 'business-123',
      status: 'PAID',
    };

    const mockUpdatedOrder = {
      id: 1,
      businessId: 'business-123',
      status: 'PAID',
      paid: true,
      paiddAt: new Date(),
    };

    it('should mark order as paid successfully', async () => {
      mockOrdersService.paidOrder.mockResolvedValue(mockUpdatedOrder);

      const result = await controller.paidOrder(mockPaidOrderDto);

      expect(mockOrdersService.paidOrder).toHaveBeenCalledWith(mockPaidOrderDto);
      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should handle service errors when marking order as paid', async () => {
      const error = new Error('Order not found');
      mockOrdersService.paidOrder.mockRejectedValue(error);

      await expect(controller.paidOrder(mockPaidOrderDto)).rejects.toThrow('Order not found');
    });
  });

  describe('markOrderAsDelivered', () => {
    const payload = { id: 1, businessId: 'business-123' };

    const mockDeliveredOrder = {
      id: 1,
      businessId: 'business-123',
      status: OrderStatus.DELIVERED,
      OrderItem: [
        {
          id: 1,
          productId: 1,
          quantity: 2,
          price: 50,
        },
      ],
      table: {
        number: 1,
      },
    };

    it('should mark order as delivered successfully', async () => {
      mockOrdersService.markOrderAsDelivered.mockResolvedValue(mockDeliveredOrder);

      const result = await controller.markOrderAsDelivered(payload);

      expect(mockOrdersService.markOrderAsDelivered).toHaveBeenCalledWith(
        payload.id,
        payload.businessId,
      );
      expect(result).toEqual(mockDeliveredOrder);
    });

    it('should handle service errors when marking order as delivered', async () => {
      const error = new Error('Order not found');
      mockOrdersService.markOrderAsDelivered.mockRejectedValue(error);

      await expect(controller.markOrderAsDelivered(payload)).rejects.toThrow('Order not found');
    });
  });

  describe('findTopSellingProducts', () => {
    const payload = { limit: 5, businessId: 'business-123' };

    const mockTopSellingProducts = {
      data: [
        {
          id: 1,
          name: 'Product 1',
          price: 50,
          totalSold: 100,
        },
        {
          id: 2,
          name: 'Product 2',
          price: 30,
          totalSold: 80,
        },
      ],
      meta: {
        total: 2,
      },
    };

    it('should return top selling products', async () => {
      mockOrdersService.findTopSellingProductsByBusinessId.mockResolvedValue(mockTopSellingProducts);

      const result = await controller.findTopSellingProducts(payload);

      expect(mockOrdersService.findTopSellingProductsByBusinessId).toHaveBeenCalledWith(
        payload.limit,
        payload.businessId,
      );
      expect(result).toEqual(mockTopSellingProducts);
    });

    it('should handle service errors when finding top selling products', async () => {
      const error = new Error('Database error');
      mockOrdersService.findTopSellingProductsByBusinessId.mockRejectedValue(error);

      await expect(controller.findTopSellingProducts(payload)).rejects.toThrow('Database error');
    });
  });

  describe('findKitchenOrders', () => {
    const payload = {
      paginationDto: { page: 1, limit: 10 } as PaginationDto,
      businessId: 'business-123',
    };

    const mockKitchenOrders = {
      data: [
        {
          id: 1,
          table: 1,
          totalAmount: 100,
          totalItems: 2,
          status: 'PAID',
          paid: true,
          paidAt: new Date(),
          createdAt: new Date(),
          items: [
            {
              id: 1,
              productId: 1,
              productName: 'Test Product',
              productImage: ['image1.jpg'],
              quantity: 2,
              price: 50,
              orderId: 1,
            },
          ],
        },
      ],
      meta: {
        total: 1,
        page: 1,
        lastPage: 1,
      },
    };

    it('should return kitchen orders with formatted data', async () => {
      mockOrdersService.findKitchenOrders.mockResolvedValue(mockKitchenOrders);

      const result = await controller.findKitchenOrders(payload);

      expect(mockOrdersService.findKitchenOrders).toHaveBeenCalledWith(
        payload.paginationDto,
        payload.businessId,
      );
      expect(result).toEqual(mockKitchenOrders);
    });

    it('should handle service errors when finding kitchen orders', async () => {
      const error = new Error('Database error');
      mockOrdersService.findKitchenOrders.mockRejectedValue(error);

      await expect(controller.findKitchenOrders(payload)).rejects.toThrow('Database error');
    });

    it('should handle empty kitchen orders', async () => {
      const emptyResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          lastPage: 0,
        },
      };
      mockOrdersService.findKitchenOrders.mockResolvedValue(emptyResult);

      const result = await controller.findKitchenOrders(payload);

      expect(result).toEqual(emptyResult);
      expect(result.data).toHaveLength(0);
    });
  });
});