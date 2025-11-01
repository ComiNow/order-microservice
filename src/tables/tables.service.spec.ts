import { Test, TestingModule } from '@nestjs/testing';
import { TablesService } from './tables.service';
import { RpcException } from '@nestjs/microservices';
import { HttpStatus } from '@nestjs/common';

const mockTable = { id: '1', number: 1, status: 'available', businessId: 'biz1' };

describe('TablesService', () => {
  let service: TablesService;
  let findUniqueSpy: jest.SpyInstance;
  let connectSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TablesService],
    }).compile();
    service = module.get<TablesService>(TablesService);
    // Mock PrismaClient methods usando spyOn
    findUniqueSpy = jest.spyOn(service.table, 'findUnique');
    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('findTableById', () => {
    it('should return a table if found', async () => {
      findUniqueSpy.mockResolvedValue(mockTable);
      const result = await service.findTableByIdAndBusinessId('1', 'biz1');
      expect(result).toEqual(mockTable);
      expect(findUniqueSpy).toHaveBeenCalledWith({ where: { id: '1', businessId: 'biz1' } });
    });

    it('should throw RpcException if table not found', async () => {
      findUniqueSpy.mockResolvedValue(null);
      await expect(service.findTableByIdAndBusinessId('2', 'biz1')).rejects.toThrow(RpcException);
      try {
        await service.findTableByIdAndBusinessId('2', 'biz1');
      } catch (e) {
        expect(e.getError().message.error.message).toBe('Table with number 2 not found');
        expect(e.getError().message.error.statusCode).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw RpcException on error', async () => {
      findUniqueSpy.mockRejectedValue('Some error');
      await expect(service.findTableByIdAndBusinessId('3', 'biz1')).rejects.toThrow(RpcException);
      try {
        await service.findTableByIdAndBusinessId('3', 'biz1');
      } catch (e) {
        expect(e.getError().message).toBe('Some error');
        expect(e.getError().statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });
});
