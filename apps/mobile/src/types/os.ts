export type OsResumo={id:string;numero:string|null;clienteNome:string|null;local:string|null;uf:string|null;tipo:string|null;situacao:string|null;status:string|null;contrato:string|null;tecnico:string|null;abertura:string|null;fechamento:string|null;equipamento:string|null;produto:string|null};
export type OsLista={dados:OsResumo[];paginacao:{pagina:number;limite:number;total:number;totalPaginas:number}};
export type Indicadores={total:number;abertas:number;fechadas:number;canceladas:number;clientes:number;ultimaSincronizacao:string|null};
export type OsDetalhe=OsResumo&Record<string,unknown>;
