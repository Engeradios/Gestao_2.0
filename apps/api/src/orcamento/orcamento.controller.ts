import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AtualizarOrcamentoDto,
  ConsultarOrcamentosDto,
  CriarOrcamentoDto,
} from './dto';
import { OrcamentoService } from './orcamento.service';

@Controller('orcamentos')
export class OrcamentoController {
  constructor(private readonly service: OrcamentoService) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Post()
  criar(@Body() dto: CriarOrcamentoDto) {
    return this.service.criar(dto);
  }

  @Get()
  listar(@Query() query: ConsultarOrcamentosDto) {
    return this.service.listar(query);
  }

  @Get(':id')
  buscarPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() dto: AtualizarOrcamentoDto,
  ) {
    /*
     * ORC-0F-B usa o técnico informado no payload de criação.
     * A captura do usuário autenticado será ligada ao padrão
     * RBAC existente na fase ORC-0F-C.
     */
    return this.service
      .buscarPorId(id)
      .then((orcamento) =>
        this.service.atualizar(id, dto, orcamento.tecnicoId),
      );
  }
}
