import { DynamicModule, Module } from '@nestjs/common';
import { GameController, HealthController, AuthController } from './controllers';
import { GameService } from './game.service';
import { PlayerRepository } from './player.repository';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { APP_CONFIG, appConfig, type AppConfig } from './config';
@Module({})
export class AppModule {
  static configure(options: Partial<AppConfig> = {}): DynamicModule {
    return { module: AppModule, controllers: [HealthController, AuthController, GameController],
      providers: [{ provide: APP_CONFIG, useValue: appConfig(options) }, DatabaseService, GameService, PlayerRepository, AuthService, AuthGuard] };
  }
}

