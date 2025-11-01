import { RpcCustomExceptionFilter } from './rpc-exception.filter';
import { RpcException } from '@nestjs/microservices';

describe('RpcCustomExceptionFilter', () => {
  let filter: RpcCustomExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new RpcCustomExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    };
  });

  it('should handle RpcException with statusCode and message', () => {
    const error = { statusCode: 404, message: 'Not found' };
    const exception = { getError: () => error } as RpcException;
    const host = {
      switchToHttp: () => ({ getResponse: () => mockResponse })
    } as any;
    filter.catch(exception, host);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(error);
  });

  it('should handle RpcException with non-numeric statusCode', () => {
    const error = { statusCode: 'BAD', message: 'Error' };
    const exception = { getError: () => error } as RpcException;
    const host = {
      switchToHttp: () => ({ getResponse: () => mockResponse })
    } as any;
    filter.catch(exception, host);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(error);
  });

  it('should handle RpcException with error as string', () => {
    const error = 'Some error';
    const exception = { getError: () => error } as RpcException;
    const host = {
      switchToHttp: () => ({ getResponse: () => mockResponse })
    } as any;
    filter.catch(exception, host);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ status: 400, message: error });
  });
});
