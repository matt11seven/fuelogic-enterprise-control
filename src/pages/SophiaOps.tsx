import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import sophiaOpsApi, { SophiaMessageRow, SophiaSessionRow } from "@/services/sophia-ops-api";
import { toast } from "@/hooks/use-toast";
import { Brain, MessageSquare, Search, Send, Database, RefreshCw, Activity } from "lucide-react";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function Section({ title, description, icon: Icon, children }: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          {Icon && <Icon className="h-4 w-4 text-emerald-500" />}
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

const SophiaOps = () => {
  const [summary, setSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [chatNumber, setChatNumber] = useState("+5584");
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatModelInfo, setChatModelInfo] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  const [chargeNumber, setChargeNumber] = useState("+5584");
  const [chargeContext, setChargeContext] = useState("Cobrança de cotação atrasada do dia.");
  const [chargeText, setChargeText] = useState("");
  const [chargeResult, setChargeResult] = useState("");
  const [isSendingCharge, setIsSendingCharge] = useState(false);

  const [selectEntity, setSelectEntity] = useState<"bases" | "combustiveis" | "fornecedores" | "postos">("fornecedores");
  const [selectQuery, setSelectQuery] = useState("");
  const [selectResult, setSelectResult] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);

  const [cotacao, setCotacao] = useState({
    fornecedor_telefone: "",
    fornecedor_nome: "",
    base_nome: "",
    tipo_frete: "FOB",
    combustivel: "",
    preco: "",
  });
  const [insertResult, setInsertResult] = useState("");
  const [isInserting, setIsInserting] = useState(false);
  const [postoOptions, setPostoOptions] = useState<string[]>([]);

  const [sessions, setSessions] = useState<SophiaSessionRow[]>([]);
  const [messages, setMessages] = useState<SophiaMessageRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.session_id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

  const handleLoadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const data = await sophiaOpsApi.getWorkflowSummary();
      setSummary(pretty(data));
      toast({ title: "Resumo carregado", description: "Prompts e integração da SophIA estão ativos." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar resumo";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handlePassivaChat = async () => {
    if (!chatMessage.trim()) return;
    setIsSendingChat(true);
    try {
      const data = await sophiaOpsApi.chatPassiva(chatMessage.trim(), chatNumber.trim() || undefined);
      setChatReply(pretty(data));
      const modelText = `${data.provider || "unknown"} / ${data.model || "unknown"}`;
      setChatModelInfo(modelText);
      toast({ title: "Resposta gerada", description: `Chat executado (${modelText}).` });
      await loadSessions();
      await loadMessages(chatNumber.trim() || undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao processar chat";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSendCharge = async () => {
    if (!chargeNumber.trim()) return;
    setIsSendingCharge(true);
    try {
      const data = await sophiaOpsApi.sendCobranca(
        chargeNumber.trim(),
        chargeContext.trim() || undefined,
        chargeText.trim() || undefined,
      );
      setChargeResult(pretty(data));
      toast({
        title: "Cobrança enviada",
        description: `Mensagem enviada (${data.provider || "unknown"} / ${data.model || "unknown"}).`,
      });
      await loadSessions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar cobrança";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsSendingCharge(false);
    }
  };

  const handleSelect = async () => {
    setIsSelecting(true);
    try {
      const data = await sophiaOpsApi.selectEntity(selectEntity, selectQuery.trim());
      setSelectResult(pretty(data));
      toast({ title: "Consulta executada", description: `${data.count ?? 0} registros retornados.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao consultar entidade";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsSelecting(false);
    }
  };

  const handleInsertCotacao = async () => {
    setIsInserting(true);
    try {
      const data = await sophiaOpsApi.insertCotacao({
        fornecedor_telefone: cotacao.fornecedor_telefone,
        fornecedor_nome: cotacao.fornecedor_nome,
        base_nome: cotacao.base_nome,
        tipo_frete: cotacao.tipo_frete.toUpperCase(),
        combustivel: cotacao.combustivel,
        preco: Number(cotacao.preco),
      });
      setInsertResult(pretty(data));
      toast({ title: "Cotação inserida", description: "Registro criado na tabela cotacoes." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao inserir cotação";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsInserting(false);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await sophiaOpsApi.getObservabilitySessions(100);
      setSessions(data.rows || []);
      if (!selectedSessionId && data.rows?.length > 0) {
        setSelectedSessionId(data.rows[0].session_id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar sessões";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId?: string) => {
    setIsLoadingMessages(true);
    try {
      const sid = sessionId || selectedSessionId;
      const data = await sophiaOpsApi.getObservabilityMessages(sid || undefined, 300);
      setMessages(data.rows || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar mensagens";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSessionId) loadMessages(selectedSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  useEffect(() => {
    const loadPostos = async () => {
      try {
        const data = await sophiaOpsApi.selectEntity("postos", "", 300);
        const names = (data.rows || [])
          .map((row) => {
            if (typeof row === "object" && row !== null && "nome_posto" in row) {
              return String((row as { nome_posto?: unknown }).nome_posto || "");
            }
            return "";
          })
          .filter((v) => v.trim().length > 0);
        setPostoOptions(Array.from(new Set(names)));
      } catch {
        setPostoOptions([]);
      }
    };
    loadPostos();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Header />

        {/* Page title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl glow-emerald">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-shadow">
              Soph<span className="uppercase">IA</span>
            </h2>
            <p className="text-slate-900 dark:text-slate-400 text-sm font-medium">
              Operação local e observabilidade da inteligência artificial
            </p>
          </div>
        </div>

        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="observability">Observabilidade</TabsTrigger>
            <TabsTrigger value="cobranca">Cobrança Ativa</TabsTrigger>
            <TabsTrigger value="dados">Select / Insert</TabsTrigger>
          </TabsList>

          {/* ── CHAT ── */}
          <TabsContent value="chat" className="space-y-4">
            <Section
              title="SophIA Passiva"
              description="Conversa reativa usando o prompt do workflow n8n."
              icon={MessageSquare}
            >
              <div className="grid gap-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Número / Sessão</Label>
                <Input value={chatNumber} onChange={(e) => setChatNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Mensagem</Label>
                <Textarea value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} rows={4} />
              </div>
              <Button onClick={handlePassivaChat} disabled={isSendingChat}>
                <Send className="h-4 w-4 mr-2" />
                {isSendingChat ? "Processando..." : "Enviar para SophIA"}
              </Button>
              {chatModelInfo && (
                <p className="text-xs text-emerald-500 font-medium">Modelo: {chatModelInfo}</p>
              )}
              {chatReply && (
                <Textarea value={chatReply} readOnly rows={12} className="font-mono text-xs" />
              )}
            </Section>
          </TabsContent>

          {/* ── OBSERVABILIDADE ── */}
          <TabsContent value="observability" className="space-y-4">
            <Section
              title="Conversas da SophIA"
              description="Histórico completo por sessão com provider e modelo."
              icon={Activity}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sessões */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Sessões</Label>
                    <Button size="sm" variant="outline" onClick={loadSessions} disabled={isLoadingSessions}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Atualizar
                    </Button>
                  </div>
                  <div className="max-h-[440px] overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                    {sessions.map((s) => (
                      <button
                        key={s.session_id}
                        type="button"
                        onClick={() => setSelectedSessionId(s.session_id)}
                        className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-emerald-500/5 ${
                          selectedSessionId === s.session_id
                            ? "bg-emerald-500/10 border-l-2 border-emerald-500"
                            : ""
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                          {s.session_id}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.provider || "?"} / {s.model || "?"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(s.last_message_at).toLocaleString("pt-BR")} · {s.total_messages} msgs
                        </p>
                      </button>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-sm text-slate-500 p-3">Sem sessões registradas.</p>
                    )}
                  </div>
                </div>

                {/* Mensagens */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">
                      Timeline{selectedSession ? ` — ${selectedSession.session_id}` : ""}
                    </Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadMessages(selectedSessionId)}
                      disabled={isLoadingMessages || !selectedSessionId}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Atualizar
                    </Button>
                  </div>
                  <div className="max-h-[440px] overflow-y-auto rounded-lg border border-white/10 p-3 space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-lg border text-sm ${
                          m.role === "assistant"
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${
                            m.role === "assistant" ? "text-emerald-500" : "text-slate-400"
                          }`}>
                            {m.role} · {m.channel}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-200 leading-relaxed">
                          {m.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5">
                          {m.provider || "?"} / {m.model || "?"}
                        </p>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-sm text-slate-500">Sem mensagens para a sessão selecionada.</p>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* ── COBRANÇA ATIVA ── */}
          <TabsContent value="cobranca" className="space-y-4">
            <Section
              title="SophIA Ativa — Cobrança"
              description="Gera e dispara mensagem ativa para fornecedor atrasado."
              icon={Send}
            >
              <div className="grid gap-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Número destino</Label>
                <Input value={chargeNumber} onChange={(e) => setChargeNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Contexto</Label>
                <Textarea value={chargeContext} onChange={(e) => setChargeContext(e.target.value)} rows={3} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Texto manual (opcional)</Label>
                <Textarea value={chargeText} onChange={(e) => setChargeText(e.target.value)} rows={3} />
              </div>
              <Button onClick={handleSendCharge} disabled={isSendingCharge}>
                <Send className="h-4 w-4 mr-2" />
                {isSendingCharge ? "Enviando..." : "Enviar Cobrança"}
              </Button>
              {chargeResult && (
                <Textarea value={chargeResult} readOnly rows={12} className="font-mono text-xs" />
              )}
            </Section>
          </TabsContent>

          {/* ── SELECT / INSERT ── */}
          <TabsContent value="dados" className="space-y-4">
            <Section
              title="Tool Select"
              description="Consulta whitelist de entidades para validação da SophIA."
              icon={Search}
            >
              <div className="flex flex-wrap gap-2">
                {(["fornecedores", "bases", "combustiveis", "postos"] as const).map((e) => (
                  <Button
                    key={e}
                    size="sm"
                    variant={selectEntity === e ? "default" : "outline"}
                    onClick={() => setSelectEntity(e)}
                    className="capitalize"
                  >
                    {e}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Termo de busca"
                value={selectQuery}
                onChange={(e) => setSelectQuery(e.target.value)}
              />
              <Button onClick={handleSelect} disabled={isSelecting}>
                <Database className="h-4 w-4 mr-2" />
                {isSelecting ? "Consultando..." : "Executar Select"}
              </Button>
              {selectResult && (
                <Textarea value={selectResult} readOnly rows={10} className="font-mono text-xs" />
              )}
            </Section>

            <Section title="Tool Insert — cotacoes" description="Insere cotação estruturada conforme fluxo SophIA.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Telefone fornecedor"
                  value={cotacao.fornecedor_telefone}
                  onChange={(e) => setCotacao((p) => ({ ...p, fornecedor_telefone: e.target.value }))}
                />
                <Input
                  placeholder="Nome fornecedor"
                  value={cotacao.fornecedor_nome}
                  onChange={(e) => setCotacao((p) => ({ ...p, fornecedor_nome: e.target.value }))}
                />
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Posto / Base</Label>
                  <select
                    value={cotacao.base_nome}
                    onChange={(e) => setCotacao((p) => ({ ...p, base_nome: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Selecione o posto</option>
                    {postoOptions.map((posto) => (
                      <option key={posto} value={posto}>
                        {posto}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Tipo frete (FOB / CIF)"
                  value={cotacao.tipo_frete}
                  onChange={(e) => setCotacao((p) => ({ ...p, tipo_frete: e.target.value }))}
                />
                <Input
                  placeholder="Combustível"
                  value={cotacao.combustivel}
                  onChange={(e) => setCotacao((p) => ({ ...p, combustivel: e.target.value }))}
                />
                <Input
                  placeholder="Preço"
                  type="number"
                  value={cotacao.preco}
                  onChange={(e) => setCotacao((p) => ({ ...p, preco: e.target.value }))}
                />
              </div>
              <Button onClick={handleInsertCotacao} disabled={isInserting}>
                {isInserting ? "Inserindo..." : "Inserir Cotação"}
              </Button>
              {insertResult && (
                <Textarea value={insertResult} readOnly rows={10} className="font-mono text-xs" />
              )}
            </Section>
          </TabsContent>
        </Tabs>

        {/* Workflow Summary */}
        <div className="mt-4">
          <Section title="Workflow Summary" description="Leitura dos prompts carregados de N8N Sophia New.json.">
            <Button variant="outline" onClick={handleLoadSummary} disabled={isLoadingSummary}>
              {isLoadingSummary ? "Carregando..." : "Carregar Resumo"}
            </Button>
            {summary && <Textarea value={summary} readOnly rows={8} className="font-mono text-xs" />}
          </Section>
        </div>
      </div>
    </div>
  );
};

export default SophiaOps;
