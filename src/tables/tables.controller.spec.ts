import { Test, TestingModule } from '@nestjs/testing';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

describe('TablesController', () => {
  let controller: TablesController;
  let service: TablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: {
            findTableByIdAndBusinessId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get<TablesService>(TablesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findTableById', () => {
    it('should call tablesService.findTableById with the correct id and return the result', async () => {
      const id = 'test-id';
      const businessId = 'test-business-id';
      const result = { id: 'test-id', number: 1, businessId: 'test-business-id' };
      jest.spyOn(service, 'findTableByIdAndBusinessId').mockResolvedValue(result);
      expect(await controller.findTableById({ id, businessId })).toEqual(result);
      expect(service.findTableByIdAndBusinessId).toHaveBeenCalledWith(id, businessId);
    });
  });
});
