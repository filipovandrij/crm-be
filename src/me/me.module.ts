import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { NavigationController } from './navigation.controller';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [MeController, NavigationController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
