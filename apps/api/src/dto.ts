import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { PRODUCTS, SCENES } from '@smoke/domain';
export class PurchaseDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{8,100}$/) requestId!: string;
  @IsIn(PRODUCTS.map(product => product.id)) productId!: string;
}
export class StartSessionDto extends PurchaseDto { @IsIn(SCENES.map(scene => scene.id)) sceneId!: string; }
export class LoginDto { @IsOptional() @IsString() @Length(1, 512) code?: string; }
export class RefreshDto { @Matches(/^[a-f0-9]{64}$/) refreshToken!: string; }
export class AdClaimDto { @IsString() @Matches(/^[a-zA-Z0-9_-]{8,100}$/) ticketId!: string; }
export class PreferencesDto {
  @IsOptional() @IsIn(SCENES.map(scene => scene.id)) sceneId?: string;
  @IsOptional() @IsIn(PRODUCTS.map(product => product.id)) productId?: string;
  @IsOptional() @IsBoolean() vibration?: boolean;
  @IsOptional() @IsBoolean() sound?: boolean;
  @IsOptional() @IsIn(['standard','high']) quality?: 'standard' | 'high';
}
export class ProgressDto {
  @IsNumber() @Min(0) @Max(100) remaining!: number;
  @IsNumber() @Min(0) @Max(30) ash!: number;
  @IsIn(['ready','burning']) phase!: 'ready' | 'burning';
  @IsInt() @Min(1) @Max(2147483647) revision!: number;
}
export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000) offset = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
