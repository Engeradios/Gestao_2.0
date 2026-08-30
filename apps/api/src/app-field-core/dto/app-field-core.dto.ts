import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RegisterDeviceDto {
  @IsString() @Length(8, 120) identificador!: string;
  @IsString() @IsIn(['ANDROID', 'IOS', 'WEB']) plataforma!: string;
  @IsOptional() @IsString() @MaxLength(120) modelo?: string;
  @IsOptional() @IsString() @MaxLength(120) fabricante?: string;
  @IsOptional() @IsString() @MaxLength(80) versaoSistema?: string;
  @IsOptional() @IsString() @MaxLength(40) versaoAplicativo?: string;
  @IsOptional() @IsBoolean() corporativo?: boolean;
}

export class StartShiftDto {
  @IsString() @Length(8, 120) eventoInicioId!: string;
  @IsString() @Length(1, 30) dispositivoId!: string;
  @IsDateString() iniciadoDispositivoEm!: string;
}

export class PauseShiftDto {
  @IsString() @Length(8, 120) eventoInicioId!: string;
  @IsDateString() iniciadaDispositivoEm!: string;
  @IsOptional() @IsString() @MaxLength(160) motivo?: string;
}

export class ResumeShiftDto {
  @IsString() @Length(8, 120) eventoFimId!: string;
  @IsDateString() finalizadaDispositivoEm!: string;
}

export class FinishShiftDto {
  @IsString() @Length(8, 120) eventoFimId!: string;
  @IsDateString() finalizadoDispositivoEm!: string;
}

export class TelemetryDto {
  @IsString()
  @Length(8, 120)
  eventoId!: string;

  @IsString()
  @Length(1, 30)
  dispositivoId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  precisaoMetros?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1000)
  @Max(20000)
  altitudeMetros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  velocidadeMetrosSegundo?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bateriaPercentual?: number;

  @IsOptional()
  @IsBoolean()
  carregando?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoConexao?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualidadeSinal?: number;

  @IsOptional()
  @IsBoolean()
  online?: boolean;

  @IsDateString()
  capturadoEm!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  enderecoLogradouro?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  enderecoNumero?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  enderecoBairro?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  enderecoCidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  enderecoUf?: string;

  @IsOptional()
  @IsString()
  @Length(1, 400)
  enderecoCompleto?: string;
}
