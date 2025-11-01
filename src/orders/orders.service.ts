import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto } from './dto';
import { envs } from '../config/envs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { PaidOrderDto } from './dto/paid-order.dto';
import { OrderStatus } from './enum/order.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TopSellingProductRaw } from './interfaces/top-selling-product-raw.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger: Logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  constructor(
    @Inject(envs.natsServiceName) private readonly client: ClientProxy,
  ) {
    super();
  }

  async create(createOrderDto: CreateOrderDto, withStatus: boolean) {
    try {
      const productIds = createOrderDto.items.map((item) => item.productId);

      // Enviar objeto con ids y businessId
      const products: any[] = await firstValueFrom(
        this.client.send(
          { cmd: 'validate_products' },
          { ids: productIds, businessId: createOrderDto.businessId },
        ),
      );

      let totalAmount = createOrderDto.items.reduce((acc, item) => {
        const { price } = products.find(
          (product) => product.id === item.productId,
        );
        return acc + price * item.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce(
        (acc, item) => acc + item.quantity,
        0,
      );

      const table = await this.table.findFirst({
        where: {
          number: createOrderDto.table,
          businessId: createOrderDto.businessId,
        },
      });

      if (!table) {
        throw new RpcException({
          message: `Table with number ${createOrderDto.table} not found for business ${createOrderDto.businessId}`,
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const orderItems = createOrderDto.items.map((item) => ({
        price: products.find((product) => product.id === item.productId).price,
        quantity: item.quantity,
        productId: item.productId,
      }));

      if (createOrderDto.serviceCharge) {
        const serviceChargeAmount = totalAmount * 0.1;
        totalAmount += totalAmount * 0.1;
        orderItems.push({
          price: serviceChargeAmount,
          quantity: 1,
          productId: 99999,
        });
      }

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          status: withStatus ? createOrderDto.status || 'PENDING' : 'PENDING',
          businessId: createOrderDto.businessId,
          tableId: table.id,
          paiddAt: createOrderDto.status === 'PAID' ? new Date() : null,
          paidMethodType: createOrderDto.paidMethodType || null,
          paid: createOrderDto.status === 'PAID',
          OrderItem: {
            createMany: {
              data: orderItems,
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      const orderWithProducts: OrderWithProducts = {
        ...order,
        status: order.status,
        OrderItem: order.OrderItem.map((item) => ({
          ...item,
          name: item.productId === 99999
            ? 'charge-service'
            : products.find((product) => product.id === item.productId).name,
        })),
      };

      return orderWithProducts;
    } catch (error) {
      this.logger.error(
        `Error creating order: ${error.message || JSON.stringify(error)}`,
      );
      throw new RpcException({
        message: error.message || 'Error creating order',
        statusCode: error.statusCode || HttpStatus.BAD_REQUEST,
      });
    }
  }

  async findAllByBusinessId(
    orderPaginationDto: OrderPaginationDto,
    businessId: string,
  ) {
    const totalOrders = await this.order.count({
      where: {
        status: orderPaginationDto.status,
        businessId: businessId,
      },
    });
    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        where: {
          status: orderPaginationDto.status,
          businessId: businessId,
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      meta: {
        total: totalOrders,
        page: currentPage,
        lastPage: Math.ceil(totalOrders / perPage),
      },
    };
  }

  async findOneByBussinesId(id: number, businessId: string) {
    const order = await this.order.findUnique({
      where: { id, businessId },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const productIds = order.OrderItem.map((item) => item.productId);

    // Enviar objeto con ids y businessId
    const products: any[] = await firstValueFrom(
      this.client.send(
        { cmd: 'validate_products' },
        { ids: productIds, businessId },
      ),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: products.find((product) => product.id === item.productId).name,
      })),
    };
  }

  async findPaidOrderByTableId(tableId: string, businessId: string) {
    const table = await this.table.findUnique({
      where: { id: tableId, businessId },
    });

    if (!table) {
      throw new RpcException({
        message: `Table with id ${tableId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return this.order.findFirst({
      where: {
        tableId: table.id,
        businessId,
        status: 'PAID',
      },
    });
  }

  async getOrderPositionByTableId(tableId: string, businessId: string) {
    const table = await this.table.findUnique({
      where: { id: tableId, businessId },
    });

    if (!table) {
      throw new RpcException({
        message: `Table with id ${tableId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const orders = await this.order.findMany({
      where: {
        status: 'PAID',
        tableId: table.id,
        businessId: table.businessId,
      },
      orderBy: {
        paiddAt: 'asc',
      },
    });

    if (orders.length === 0) {
      throw new RpcException({
        message: `No orders found for table with id ${tableId}`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const orderIndex = orders.findIndex((order) => order.tableId === table.id);

    if (orderIndex === -1) {
      throw new RpcException({
        message: `No paid order found for table with id ${tableId}`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return orderIndex + 1;
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status, businessId } = changeOrderStatusDto;
    const order = await this.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (order.businessId !== businessId) {
      throw new RpcException({
        message: `Order with id ${id} does not belong to business ${businessId}`,
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  async findTopSellingProductsByBusinessId(
    limit: number = 5,
    businessId: string,
  ) {
    this.logger.log(
      `Finding top ${limit} selling products for business ${businessId}`,
    );

    try {
      const ordersCount = await this.order.count({
        where: {
          status: { in: ['PAID', 'DELIVERED'] },
          businessId: businessId,
        },
      });

      this.logger.log(
        `Found ${ordersCount} orders with status PAID or DELIVERED`,
      );

      if (ordersCount === 0) {
        this.logger.log('No paid or delivered orders found');
        return { data: [], meta: { total: 0 } };
      }

      const topSellingProducts = await this.$queryRaw<TopSellingProductRaw[]>`
        SELECT "product_id", SUM(quantity)::float as total_sold
        FROM "Order_Item" oi
        JOIN "Order" o ON o.id = oi."order_id"
        WHERE o.status IN ('PAID', 'DELIVERED')
          AND o."business_id" = ${businessId}
        GROUP BY "product_id"
        ORDER BY total_sold DESC
        LIMIT ${limit}
      `;

      this.logger.log(
        `Found ${topSellingProducts.length} top selling products from orders`,
      );

      if (!topSellingProducts || topSellingProducts.length === 0) {
        return { data: [], meta: { total: 0 } };
      }

      const productIds = topSellingProducts.map((product) =>
        Number(product.product_id),
      );

      this.logger.log(
        `Requesting product details for IDs: [${productIds.join(', ')}]`,
      );

      try {
        const availableProducts = await firstValueFrom(
          this.client.send(
            { cmd: 'get_available_products_by_ids' },
            { productIds, businessId },
          ),
        );

        this.logger.log(
          `Received ${availableProducts?.length || 0} available products`,
        );

        if (!availableProducts || !Array.isArray(availableProducts)) {
          this.logger.warn('No available products found');
          return { data: [], meta: { total: 0 } };
        }

        const result = availableProducts.map((product) => {
          const salesData = topSellingProducts.find(
            (item) => Number(item.product_id) === Number(product.id),
          );

          return {
            ...product,
            totalSold: salesData ? Number(salesData.total_sold) : 0,
          };
        });

        // Ordenar por cantidad vendida
        result.sort((a, b) => b.totalSold - a.totalSold);

        return {
          data: result,
          meta: {
            total: result.length,
          },
        };
      } catch (error) {
        this.logger.error(`Error fetching product details: ${error.message}`);
        throw new RpcException({
          message: `Error fetching product details: ${error.message}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }
    } catch (error) {
      this.logger.error(`Error finding top selling products: ${error.message}`);
      throw new RpcException({
        message: `Error finding top selling products: ${error.message}`,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async createPaymentPreference(order: OrderWithProducts) {
    const paymentPreference = await firstValueFrom(
      this.client.send('create.payment.preference', {
        orderId: order.id,
        businessId: order.businessId,
        items: order.OrderItem.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      }),
    );
    return paymentPreference;
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    this.logger.log('Order paid', JSON.stringify(paidOrderDto));
    const { orderId, businessId } = paidOrderDto;

    const existingOrder = await this.order.findUnique({
      where: { id: orderId, businessId: businessId },
    });

    if (!existingOrder) {
      throw new RpcException({
        message: `Order with id ${paidOrderDto.orderId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const order = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paiddAt: new Date(),
      },
    });

    return order;
  }

  async findKitchenOrders(paginationDto: PaginationDto, businessId: string) {
    const { page = 1, limit = 10 } = paginationDto;

    const totalOrders = await this.order.count({
      where: { status: 'PAID', businessId },
    });

    if (totalOrders === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          lastPage: 0,
        },
      };
    }

    const orders = await this.order.findMany({
      where: { status: 'PAID', businessId },
      include: {
        OrderItem: {
          select: {
            id: true,
            price: true,
            quantity: true,
            productId: true,
          },
        },
        table: {
          select: {
            number: true,
          },
        },
      },
      orderBy: {
        paiddAt: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const allProductIds = orders.flatMap((order) =>
      order.OrderItem.map((item) => item.productId),
    );

    const uniqueProductIds = [...new Set(allProductIds)];

    let products: any[] = [];
    if (uniqueProductIds.length > 0) {
      try {
        // Enviar objeto con productIds y businessId
        products = await firstValueFrom(
          this.client.send(
            { cmd: 'get_products_by_ids' },
            { productIds: uniqueProductIds, businessId },
          ),
        );
      } catch (error) {
        this.logger.error('Error fetching products:', error);
        products = [];
      }
    }

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      table: order.table.number,
      totalAmount: order.totalAmount,
      totalItems: order.totalItems,
      status: order.status,
      paid: order.paid,
      paidAt: order.paiddAt,
      createdAt: order.createdAt,
      items: order.OrderItem.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          id: item.id,
          productId: item.productId,
          productName: product?.name || 'Producto no encontrado',
          productImage: product?.image || [],
          quantity: item.quantity,
          price: item.price,
          orderId: order.id,
        };
      }),
    }));

    return {
      data: formattedOrders,
      meta: {
        total: totalOrders,
        page,
        lastPage: Math.ceil(totalOrders / limit),
      },
    };
  }

  async markOrderAsDelivered(id: number, businessId: string) {
    const order = await this.order.findUnique({
      where: { id, businessId },
    });

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (order.status === OrderStatus.DELIVERED) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
      },
      include: {
        OrderItem: {
          select: {
            id: true,
            price: true,
            quantity: true,
            productId: true,
          },
        },
        table: {
          select: {
            number: true,
          },
        },
      },
    });
  }
}
