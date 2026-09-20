import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@smoke/domain';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{ status(code: number): { json(body: unknown): void } }>();
    const status = error.code.endsWith('NOT_FOUND') ? 404 : 409;
    response.status(status).json({ statusCode: status, code: error.code, message: error.message });
  }
}
