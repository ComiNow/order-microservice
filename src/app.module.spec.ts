import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
    const appModule = module.get(AppModule);
    expect(appModule).toBeInstanceOf(AppModule);
  });

  it('should import OrdersModule and TablesModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(OrdersModule);
    expect(imports).toContain(TablesModule);
  });
});
