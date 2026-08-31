import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
type Json = Record<string, unknown>;
@Injectable()
export class FiliaisBrasilApiService {
  private digits(v: unknown) {
    return String(v ?? '').replace(/\D/g, '');
  }
  private text(v: unknown) {
    return typeof v === 'string' ? v.trim() : '';
  }
  private async get(path: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/${path}`, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'Engeradios2/1.0',
        },
      });
      const data = (await r.json().catch(() => ({}))) as Json;
      if (r.status === 404)
        throw new NotFoundException(
          'Cadastro não encontrado na BrasilAPI. Confira os dados informados.',
        );
      if (!r.ok)
        throw new BadGatewayException(
          this.text(data.message) ||
            'Não foi possível consultar a BrasilAPI agora. Tente novamente.',
        );
      return data;
    } catch (e) {
      if (e instanceof BadGatewayException || e instanceof NotFoundException)
        throw e;
      throw new BadGatewayException(
        'Não foi possível consultar a BrasilAPI agora. Tente novamente.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async cnpj(value: string) {
    const cnpj = this.digits(value);
    if (cnpj.length !== 14)
      throw new BadRequestException('Informe um CNPJ válido com 14 dígitos.');
    const d = await this.get(`cnpj/v1/${cnpj}`);
    return {
      cnpj,
      razaoSocial: this.text(d.razao_social),
      nomeFantasia: this.text(d.nome_fantasia),
      cep: this.digits(d.cep),
      logradouro: [
        this.text(d.descricao_tipo_de_logradouro),
        this.text(d.logradouro),
      ]
        .filter(Boolean)
        .join(' '),
      numero: this.text(d.numero),
      complemento: this.text(d.complemento),
      bairro: this.text(d.bairro),
      cidade: this.text(d.municipio),
      uf: this.text(d.uf).toUpperCase(),
    };
  }
  async cep(value: string) {
    const cep = this.digits(value);
    if (cep.length !== 8)
      throw new BadRequestException('Informe um CEP válido com 8 dígitos.');
    const d = await this.get(`cep/v1/${cep}`);
    return {
      cep,
      logradouro: this.text(d.street),
      bairro: this.text(d.neighborhood),
      cidade: this.text(d.city),
      uf: this.text(d.state).toUpperCase(),
    };
  }
}
