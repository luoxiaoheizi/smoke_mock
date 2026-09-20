import { Body, Controller, Get, Inject, Param, Put, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PRODUCTS, SCENES } from '@smoke/domain';
import { GameService } from './game.service';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { APP_CONFIG, type AppConfig } from './config';
import { LoginDto, RefreshDto, PageDto, PreferencesDto, ProgressDto, PurchaseDto, StartSessionDto } from './dto';
@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService, @Inject(APP_CONFIG) private readonly config: AppConfig) {}
  @Get('health') async health() { await this.db.query('SELECT 1'); return { status: 'ok', service: 'smoke-api', storage: this.db.kind }; }
  @Get('catalog') catalog() { return { products: PRODUCTS, scenes: SCENES, authMode: this.config.authMode }; }
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() input: LoginDto) { return this.auth.login(input.code); }
  @Post('refresh') refresh(@Body() input: RefreshDto) { return this.auth.refresh(input.refreshToken); }
}
@Controller()
@UseGuards(AuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}
  @Get('bootstrap') bootstrap(@Req() r: AuthRequest) { return this.game.bootstrap(r.playerId); }
  @Post('purchases') purchase(@Req() r: AuthRequest, @Body() input: PurchaseDto) { return this.game.purchase(r.playerId, input); }
  @Post('sessions') start(@Req() r: AuthRequest, @Body() input: StartSessionDto) { return this.game.start(r.playerId, input); }
  @Put('sessions/:id/progress') progress(@Req() r: AuthRequest, @Param('id') id: string, @Body() body: ProgressDto) { return this.game.progress(r.playerId, id, body); }
  @Post('sessions/:id/end') end(@Req() r: AuthRequest, @Param('id') id: string) { return this.game.end(r.playerId, id); }
  @Get('sessions') history(@Req() r: AuthRequest, @Query() page: PageDto) { return this.game.history(r.playerId, page); }
  @Post('wallet/daily-claim') claim(@Req() r: AuthRequest) { return this.game.claim(r.playerId); }
  @Get('wallet/ledger') ledger(@Req() r: AuthRequest, @Query() page: PageDto) { return this.game.ledger(r.playerId, page); }
  @Post('preferences') preferences(@Req() r: AuthRequest, @Body() patch: PreferencesDto) { return this.game.preferences(r.playerId, patch); }
}
