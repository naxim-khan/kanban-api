import { Module, Global } from '@nestjs/common';
import { FileLoggerService } from './services/file-logger.service';

@Global()
@Module({
  providers: [FileLoggerService],
  exports: [FileLoggerService],
})
export class CommonModule {}
