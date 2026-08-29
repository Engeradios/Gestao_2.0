--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (Debian 18.6-1.pgdg12+2)
-- Dumped by pg_dump version 18.6 (Debian 18.6-1.pgdg12+2)




--
-- Name: gp_custo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_custo (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    categoria character varying(30),
    tipo character varying(10) DEFAULT 'direto'::character varying,
    descricao character varying(255) NOT NULL,
    fornecedor character varying(200),
    documento character varying(60),
    origem character varying(20) DEFAULT 'manual'::character varying,
    ref_id integer,
    valor_orcado numeric(14,2) DEFAULT 0,
    valor_realizado numeric(14,2) DEFAULT 0,
    data_custo date,
    situacao character varying(20) DEFAULT 'Previsto'::character varying,
    criado_em timestamp without time zone DEFAULT now()
);


--
-- Name: gp_custo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_custo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_custo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_custo_id_seq OWNED BY public.gp_custo.id;


--
-- Name: gp_marco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_marco (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    tipo character varying(30),
    titulo character varying(200) NOT NULL,
    descricao text,
    percentual numeric(5,2),
    data_marco date,
    anexo character varying(255),
    anexo_nome character varying(255),
    usuario character varying(120),
    criado_em timestamp without time zone DEFAULT now()
);


--
-- Name: gp_marco_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_marco_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_marco_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_marco_id_seq OWNED BY public.gp_marco.id;


--
-- Name: gp_material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_material (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    produto character varying(200) NOT NULL,
    unidade character varying(20) DEFAULT 'un'::character varying,
    qtd_prevista numeric(12,3) DEFAULT 0,
    qtd_entregue numeric(12,3) DEFAULT 0,
    valor_unit numeric(14,2) DEFAULT 0,
    data_entrega date,
    nf character varying(40),
    observacoes text
);


--
-- Name: gp_material_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_material_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_material_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_material_id_seq OWNED BY public.gp_material.id;


--
-- Name: gp_os; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_os (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    numero_os character varying(40),
    tipo character varying(120),
    situacao character varying(30),
    tecnico character varying(200),
    descricao character varying(300),
    valor numeric(14,2) DEFAULT 0,
    data_abertura timestamp without time zone,
    data_fechamento timestamp without time zone,
    importado_em timestamp without time zone DEFAULT now()
);


--
-- Name: gp_os_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_os_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_os_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_os_id_seq OWNED BY public.gp_os.id;


--
-- Name: gp_projeto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_projeto (
    id integer NOT NULL,
    proposta character varying(40),
    codigo character varying(30),
    nome character varying(200) NOT NULL,
    cliente character varying(200),
    cliente_local character varying(200),
    uf character(2),
    gerente character varying(120),
    valor_contrato numeric(14,2) DEFAULT 0,
    data_inicio date,
    data_fim_prev date,
    data_fim_real date,
    status character varying(30) DEFAULT 'Planejamento'::character varying,
    aliq_simples numeric(6,4) DEFAULT 0.105,
    aliq_iss numeric(6,4) DEFAULT 0.05,
    aliq_outros numeric(6,4) DEFAULT 0,
    observacoes text,
    criado_por character varying(120),
    criado_em timestamp without time zone DEFAULT now(),
    atualizado_em timestamp without time zone DEFAULT now(),
    tipo_escopo character varying(30) DEFAULT 'INSTALACAO_ART'::character varying,
    numero_contrato character varying(40),
    numero_pedido character varying(40),
    meses_contrato integer,
    valor_mensal numeric(14,2),
    valor_residual numeric(14,2),
    transfere_final boolean DEFAULT false
);


--
-- Name: gp_projeto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_projeto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_projeto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_projeto_id_seq OWNED BY public.gp_projeto.id;


--
-- Name: gp_relatorio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_relatorio (
    id integer NOT NULL,
    projeto_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    token character varying(48),
    status character varying(20) DEFAULT 'Rascunho'::character varying,
    responsavel character varying(160),
    data_relatorio date,
    dados jsonb,
    assinatura_tec character varying(160),
    assinatura_cli character varying(160),
    preenchido_em timestamp without time zone,
    criado_por character varying(120),
    criado_em timestamp without time zone DEFAULT now(),
    atualizado_em timestamp without time zone DEFAULT now()
);


--
-- Name: gp_relatorio_foto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gp_relatorio_foto (
    id integer NOT NULL,
    relatorio_id integer NOT NULL,
    arquivo character varying(255),
    legenda character varying(200),
    enviado_em timestamp without time zone DEFAULT now()
);


--
-- Name: gp_relatorio_foto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_relatorio_foto_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_relatorio_foto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_relatorio_foto_id_seq OWNED BY public.gp_relatorio_foto.id;


--
-- Name: gp_relatorio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gp_relatorio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gp_relatorio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gp_relatorio_id_seq OWNED BY public.gp_relatorio.id;


--
-- Name: gp_custo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_custo ALTER COLUMN id SET DEFAULT nextval('public.gp_custo_id_seq'::regclass);


--
-- Name: gp_marco id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_marco ALTER COLUMN id SET DEFAULT nextval('public.gp_marco_id_seq'::regclass);


--
-- Name: gp_material id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_material ALTER COLUMN id SET DEFAULT nextval('public.gp_material_id_seq'::regclass);


--
-- Name: gp_os id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_os ALTER COLUMN id SET DEFAULT nextval('public.gp_os_id_seq'::regclass);


--
-- Name: gp_projeto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_projeto ALTER COLUMN id SET DEFAULT nextval('public.gp_projeto_id_seq'::regclass);


--
-- Name: gp_relatorio id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio ALTER COLUMN id SET DEFAULT nextval('public.gp_relatorio_id_seq'::regclass);


--
-- Name: gp_relatorio_foto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio_foto ALTER COLUMN id SET DEFAULT nextval('public.gp_relatorio_foto_id_seq'::regclass);


--
-- Name: gp_custo gp_custo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_custo
    ADD CONSTRAINT gp_custo_pkey PRIMARY KEY (id);


--
-- Name: gp_marco gp_marco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_marco
    ADD CONSTRAINT gp_marco_pkey PRIMARY KEY (id);


--
-- Name: gp_material gp_material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_material
    ADD CONSTRAINT gp_material_pkey PRIMARY KEY (id);


--
-- Name: gp_os gp_os_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_os
    ADD CONSTRAINT gp_os_pkey PRIMARY KEY (id);


--
-- Name: gp_projeto gp_projeto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_projeto
    ADD CONSTRAINT gp_projeto_pkey PRIMARY KEY (id);


--
-- Name: gp_relatorio_foto gp_relatorio_foto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio_foto
    ADD CONSTRAINT gp_relatorio_foto_pkey PRIMARY KEY (id);


--
-- Name: gp_relatorio gp_relatorio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio
    ADD CONSTRAINT gp_relatorio_pkey PRIMARY KEY (id);


--
-- Name: gp_relatorio gp_relatorio_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio
    ADD CONSTRAINT gp_relatorio_token_key UNIQUE (token);


--
-- Name: idx_gp_contrato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gp_contrato ON public.gp_projeto USING btree (numero_contrato);


--
-- Name: idx_gp_pedido; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gp_pedido ON public.gp_projeto USING btree (numero_pedido);


--
-- Name: idx_gp_proposta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gp_proposta ON public.gp_projeto USING btree (proposta);


--
-- Name: idx_gp_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gp_status ON public.gp_projeto USING btree (status);


--
-- Name: idx_gpc_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpc_cat ON public.gp_custo USING btree (categoria);


--
-- Name: idx_gpc_proj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpc_proj ON public.gp_custo USING btree (projeto_id);


--
-- Name: idx_gpm_proj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpm_proj ON public.gp_material USING btree (projeto_id);


--
-- Name: idx_gpmarco_proj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpmarco_proj ON public.gp_marco USING btree (projeto_id);


--
-- Name: idx_gpos_proj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpos_proj ON public.gp_os USING btree (projeto_id);


--
-- Name: idx_gprel_proj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gprel_proj ON public.gp_relatorio USING btree (projeto_id);


--
-- Name: idx_gprelfoto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gprelfoto ON public.gp_relatorio_foto USING btree (relatorio_id);


--
-- Name: uq_gpos; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_gpos ON public.gp_os USING btree (projeto_id, numero_os);


--
-- Name: uq_gprel_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_gprel_token ON public.gp_relatorio USING btree (token);


--
-- Name: gp_custo gp_custo_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_custo
    ADD CONSTRAINT gp_custo_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.gp_projeto(id) ON DELETE CASCADE;


--
-- Name: gp_marco gp_marco_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_marco
    ADD CONSTRAINT gp_marco_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.gp_projeto(id) ON DELETE CASCADE;


--
-- Name: gp_material gp_material_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_material
    ADD CONSTRAINT gp_material_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.gp_projeto(id) ON DELETE CASCADE;


--
-- Name: gp_os gp_os_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_os
    ADD CONSTRAINT gp_os_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.gp_projeto(id) ON DELETE CASCADE;


--
-- Name: gp_relatorio_foto gp_relatorio_foto_relatorio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio_foto
    ADD CONSTRAINT gp_relatorio_foto_relatorio_id_fkey FOREIGN KEY (relatorio_id) REFERENCES public.gp_relatorio(id) ON DELETE CASCADE;


--
-- Name: gp_relatorio gp_relatorio_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gp_relatorio
    ADD CONSTRAINT gp_relatorio_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.gp_projeto(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


