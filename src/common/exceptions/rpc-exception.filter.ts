import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
   catch(exception: RpcException, host: ArgumentsHost) {

      const ctx = host.switchToHttp();
      const response = ctx.getResponse();

      const rpcError = exception.getError();

      console.log(rpcError);

      if (typeof rpcError === 'object' && 'statusCode' in rpcError && 'message' in rpcError) {
         const status = isNaN(+rpcError.statusCode) ? 400: +rpcError.statusCode;
         response.status(status).json(rpcError);
         console.log(response)
      }
      
      response.status(400).json({
         status: 400,
         message: rpcError,
      });

   }
}