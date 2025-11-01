import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TablesService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('TablesService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async findTableByIdAndBusinessId(id: string, businessId: string) {
    try {
      const table = await this.table.findUnique({
        where: { id, businessId }
      });
      if (!table) {
        throw new RpcException({
          message: `Table with number ${id} not found`,
          statusCode: HttpStatus.NOT_FOUND
        });
      }
      return table;
    } catch (error) {
      throw new RpcException({
        message: error,
        statusCode: HttpStatus.BAD_REQUEST
      });
    }
  }

}
