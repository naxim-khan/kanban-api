import { Module, type INestApplication } from '@nestjs/common';
import { InjectQueue, BullModule } from '@nestjs/bull';
import type { Queue } from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail',
    }),
  ],
})
export class BullDashboardModule {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  static setupDashboard(app: INestApplication, queues: Queue[]) {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: queues.map((q) => new BullAdapter(q)),
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
  }
}
