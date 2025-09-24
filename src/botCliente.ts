import { TeamSpeak } from "ts3-nodejs-library";
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface BotClientConfig {
  host: string;
  serverport: number;
  queryport: number;
  username: string;
  password: string;
  nickname: string;
  protocol: "raw" | "ssh";
  channelId?: string;
}

interface ClaimedTimer {
  userId: string;
  userName: string;
  codigo: string;
  nomeRespawn: string;
  tier: string;
  tempoRestante: number; // em minutos
  intervalId: NodeJS.Timeout;
  iniciadoEm: number; // timestamp quando foi criado
}

interface TimerPersistencia {
  userId: string;
  userName: string;
  codigo: string;
  nomeRespawn: string;
  tier: string;
  tempoRestante: number;
  iniciadoEm: number;
  salvoEm?: number; // timestamp quando foi salvo (opcional para compatibilidade)
}

interface NextQueue {
  userId: string;
  userName: string;
  codigo: string;
  tempoDesejado: number; // em minutos
  adicionadoEm: number; // timestamp
}

interface NextTimeout {
  userId: string;
  userName: string;
  codigo: string;
  tempoDesejado: number;
  timeoutId: NodeJS.Timeout;
  expiraEm: number; // timestamp quando expira
}

interface QueuePersistencia {
  filas: NextQueue[];
  timeouts: Omit<NextTimeout, 'timeoutId'>[];
}

interface RespawnInfo {
  nome: string;
  tier: string;
}

class TS3ClientBot {
  private teamspeak: TeamSpeak | null = null;
  private config: BotClientConfig;
  private botClientId: string | null = null;
  private timers: Map<string, ClaimedTimer> = new Map(); // key: userId-codigo
  private timersFilePath: string;
  private nextQueues: Map<string, NextQueue[]> = new Map(); // key: codigo, value: array de usuarios na fila
  private nextTimeouts: Map<string, NextTimeout> = new Map(); // key: userId-codigo, value: timeout ativo
  private queueFilePath: string;
  private tentandoReconectar: boolean = false; // Flag para evitar reconexões simultâneas
  private ultimaAtualizacaoTibia: number = 0; // Cache para API do Tibia
  private membrosOnlineTibia: any[] = []; // Cache dos membros online
  private tibiaCacheFilePath: string; // Caminho do arquivo de cache da API Tibia
  private atualizandoTibia: boolean = false; // Flag para evitar requisições simultâneas
  
  // Mapa de códigos para informações de respawn
  private respawns: Map<string, RespawnInfo> = new Map([
    ['f4', { nome: 'Cobra Castelo', tier: 'Tier 1' }],
    ['a1', { nome: 'Dragão Vermelho', tier: 'Tier 2' }],
    ['b3', { nome: 'Lich Supremo', tier: 'Tier 3' }],
    ['x7', { nome: 'Demônio Ancião', tier: 'Tier 4' }],
    ['c2', { nome: 'Orc Warlord', tier: 'Tier 1' }],
    ['d5', { nome: 'Hydra Anciã', tier: 'Tier 2' }],
    ['e8', { nome: 'Necromante Negro', tier: 'Tier 3' }],
    ['g1', { nome: 'Titan de Ferro', tier: 'Tier 4' }]
  ]);

  constructor(config: BotClientConfig) {
    this.config = config;
    this.timersFilePath = path.join(__dirname, '..', 'timers-backup.json');
    this.queueFilePath = path.join(__dirname, '..', 'queue-backup.json');
    this.tibiaCacheFilePath = path.join(__dirname, '..', 'tibia-cache.json');
  }

  // Imagem permanente que aparece no topo do canal Claimeds
  private readonly imagemClaimeds = `[img]https://i.imgur.com/qzjiLZT.png[/img]

🎯 **SISTEMA DE CLAIMEDS - ALIBOT** 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ **Respawns** ⚔️
📋 Use: [b]!resp [código] [tempo][/b] Entrar/Aceitar o claimed
🚪 Use: [b]!leave [código][/b] - Sair Fila/Respawn
📝 Use: [b]!next [código] [tempo][/b] - Entrar na fila
📊 Use: [b]!respinfo [código][/b] - Ver fila do respawn

🤡 Exemplo de uso com tempo: !resp f4 00:30 ou !next f4 00:30 --> (horas:minutos)
    ps: Caso não adicione valor ao tempo, será considerado 2 horas e 30 minutos.


⏰ Claimeds abaixo:

`;

  // Método para obter descrição base com imagem
  private obterDescricaoBaseClaimeds(): string {
    return this.imagemClaimeds;
  }

  // Método para inicializar canal Claimeds com imagem permanente
  private async inicializarCanalClaimeds(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      const claimedChannelId = "2";
      
      // Verificar se o canal já tem a imagem
      const channelInfo = await this.teamspeak.channelInfo(claimedChannelId);
      let descricaoAtual = channelInfo.channelDescription || "";
      
      // Se não tem a imagem ou está vazio, inicializar
      if (!descricaoAtual.includes('🎯 **SISTEMA DE CLAIMEDS** 🎯')) {
        const descricaoInicial = this.obterDescricaoBaseClaimeds();
        
        await this.teamspeak.channelEdit(claimedChannelId, {
          channelDescription: descricaoInicial
        });
        
        console.log("🖼️ Canal Claimeds inicializado com imagem permanente");
      } else {
        console.log("✅ Canal Claimeds já possui imagem permanente");
      }
      
    } catch (error: any) {
      console.error("❌ Erro ao inicializar canal Claimeds:", error.msg || error.message);
    }
  }

  // Método para salvar filas em arquivo JSON
  private salvarFilas(): void {
    try {
      const filasParaSalvar: NextQueue[] = [];
      const timeoutsParaSalvar: Omit<NextTimeout, 'timeoutId'>[] = [];
      
      // Salvar todas as filas
      this.nextQueues.forEach((fila, codigo) => {
        fila.forEach(item => {
          filasParaSalvar.push(item);
        });
      });

      // Salvar timeouts ativos
      this.nextTimeouts.forEach((timeout) => {
        timeoutsParaSalvar.push({
          userId: timeout.userId,
          userName: timeout.userName,
          codigo: timeout.codigo,
          tempoDesejado: timeout.tempoDesejado,
          expiraEm: timeout.expiraEm
        });
      });

      const dadosParaSalvar: QueuePersistencia = {
        filas: filasParaSalvar,
        timeouts: timeoutsParaSalvar
      };

      fs.writeFileSync(this.queueFilePath, JSON.stringify(dadosParaSalvar, null, 2));
      console.log(`💾 Filas salvas: ${filasParaSalvar.length} itens na fila, ${timeoutsParaSalvar.length} timeouts ativos`);
    } catch (error) {
      console.error("❌ Erro ao salvar filas:", error);
    }
  }

  // Método para carregar filas do arquivo JSON
  private async carregarFilas(): Promise<void> {
    try {
      if (!fs.existsSync(this.queueFilePath)) {
        console.log("📂 Nenhum arquivo de backup de filas encontrado");
        return;
      }

      const dados = fs.readFileSync(this.queueFilePath, 'utf8');
      const dadosSalvos: QueuePersistencia = JSON.parse(dados);
      
      if (!dadosSalvos.filas && !dadosSalvos.timeouts) {
        console.log("📂 Nenhuma fila salva para recuperar");
        return;
      }

      console.log(`🔄 Recuperando ${dadosSalvos.filas?.length || 0} itens de fila e ${dadosSalvos.timeouts?.length || 0} timeouts...`);
      
      // Recriar filas
      if (dadosSalvos.filas) {
        for (const item of dadosSalvos.filas) {
          if (!this.nextQueues.has(item.codigo)) {
            this.nextQueues.set(item.codigo, []);
          }
          this.nextQueues.get(item.codigo)!.push(item);
        }
      }

      // Recriar timeouts ativos
      const agora = Date.now();
      if (dadosSalvos.timeouts) {
        for (const timeoutData of dadosSalvos.timeouts) {
          if (timeoutData.expiraEm > agora) {
            // Timeout ainda válido, recriar
            await this.criarTimeoutNext(timeoutData.userName, timeoutData.codigo, timeoutData.userId, timeoutData.tempoDesejado, timeoutData.expiraEm - agora);
          } else {
            // Timeout expirou, remover da fila automaticamente
            console.log(`⏰ Timeout de ${timeoutData.userName} (${timeoutData.codigo}) expirou durante desconexão`);
            await this.removerDaFilaNext(timeoutData.userName, timeoutData.codigo, timeoutData.userId);
          }
        }
      }

      // Limpar arquivo após recuperação
      fs.unlinkSync(this.queueFilePath);
      console.log("🗑️ Arquivo de backup de filas limpo após recuperação");

    } catch (error) {
      console.error("❌ Erro ao carregar filas:", error);
    }
  }

  // Método para salvar timers em arquivo JSON
  private salvarTimers(): void {
    try {
      const timersParaSalvar: TimerPersistencia[] = [];
      const agora = Date.now();
      
      this.timers.forEach((timer) => {
        timersParaSalvar.push({
          userId: timer.userId,
          userName: timer.userName,
          codigo: timer.codigo,
          nomeRespawn: timer.nomeRespawn,
          tier: timer.tier,
          tempoRestante: timer.tempoRestante,
          iniciadoEm: timer.iniciadoEm,
          salvoEm: agora // Timestamp atual quando foi salvo
        });
      });

      fs.writeFileSync(this.timersFilePath, JSON.stringify(timersParaSalvar, null, 2));
      console.log(`💾 Timers salvos: ${timersParaSalvar.length} ativos`);
    } catch (error) {
      console.error("❌ Erro ao salvar timers:", error);
    }
  }

  // Método para carregar timers do arquivo JSON
  private async carregarTimers(): Promise<void> {
    try {
      if (!fs.existsSync(this.timersFilePath)) {
        console.log("📂 Nenhum arquivo de backup de timers encontrado");
        return;
      }

      const dados = fs.readFileSync(this.timersFilePath, 'utf8');
      const timersSalvos: TimerPersistencia[] = JSON.parse(dados);
      
      if (timersSalvos.length === 0) {
        console.log("📂 Nenhum timer salvo para recuperar");
        return;
      }

      console.log(`🔄 Recuperando ${timersSalvos.length} timers salvos...`);
      
      const agora = Date.now();
      
      for (const timerSalvo of timersSalvos) {
        // Calcular tempo decorrido desde que foi salvo (compatibilidade com arquivos antigos)
        let momentoSalvo: number;
        let metodoCalculo: string;
        
        if (timerSalvo.salvoEm) {
          // Novo formato: usar timestamp de quando foi salvo
          momentoSalvo = timerSalvo.salvoEm;
          metodoCalculo = "salvo em";
        } else {
          // Formato antigo: usar timestamp de criação (fallback)
          momentoSalvo = timerSalvo.iniciadoEm;
          metodoCalculo = "iniciado em";
          console.log(`⚠️ Timer antigo detectado para ${timerSalvo.userName}, usando fallback de cálculo`);
        }
        
        const tempoDecorrido = Math.floor((agora - momentoSalvo) / (1000 * 60)); // em minutos
        const tempoRestanteAtual = timerSalvo.tempoRestante - tempoDecorrido;
        
        console.log(`🔍 Timer ${timerSalvo.userName} (${timerSalvo.codigo}): ${timerSalvo.tempoRestante}min salvos, ${tempoDecorrido}min decorridos (${metodoCalculo}) = ${tempoRestanteAtual}min restantes`);
        
        if (tempoRestanteAtual <= 0) {
          // Timer expirou enquanto bot estava offline
          console.log(`⏰ Timer de ${timerSalvo.userName} (${timerSalvo.codigo}) expirou durante desconexão`);
          await this.removerClaimedAutomatico(timerSalvo.userName, timerSalvo.codigo, timerSalvo.userId);
          continue;
        }

        // Recriar timer com tempo atualizado
        await this.recriarTimer(
          timerSalvo.userName, 
          timerSalvo.codigo, 
          timerSalvo.userId, 
          tempoRestanteAtual, 
          timerSalvo.iniciadoEm
        );
        
        console.log(`✅ Timer restaurado: ${timerSalvo.userName} (${timerSalvo.codigo}) - ${tempoRestanteAtual} min restantes`);
      }

      // Limpar arquivo após recuperação
      fs.unlinkSync(this.timersFilePath);
      console.log("🗑️ Arquivo de backup limpo após recuperação");

      // Atualizar canal com todos os timers recuperados
      if (this.timers.size > 0) {
        await this.atualizarTodosTimersNoCanal();
        console.log(`🔄 Canal Claimeds atualizado com ${this.timers.size} timers restaurados`);
      }

    } catch (error) {
      console.error("❌ Erro ao carregar timers:", error);
    }
  }

  // Método para recriar um timer recuperado (sem atualizar canal individualmente)
  private async recriarTimer(nomeUsuario: string, codigo: string, userId: string, tempoRestante: number, iniciadoEm: number): Promise<void> {
    const timerKey = `${userId}-${codigo}`;
    const respawnInfo = this.obterInfoRespawn(codigo);

    // Não atualizar canal individualmente durante recuperação - será feito em lote

    // Criar novo interval
    const intervalId = setInterval(async () => {
      const timer = this.timers.get(timerKey);
      if (!timer) {
        console.log(`⚠️ Timer recuperado ${timerKey} não encontrado, parando intervalo`);
        clearInterval(intervalId);
        return;
      }

      timer.tempoRestante--;
      console.log(`⏰ Timer recuperado atualizado: ${timer.userName} (${timer.codigo}) - ${timer.tempoRestante} min restantes`);

      if (timer.tempoRestante <= 0) {
        // Tempo esgotado - remover automaticamente
        await this.removerClaimedAutomatico(nomeUsuario, codigo, userId);
        clearInterval(intervalId);
        this.timers.delete(timerKey);
        this.salvarTimers(); // Salvar após remoção
        console.log(`⏰ Timer expirado para ${nomeUsuario} no código ${codigo}`);
      } else {
        // Atualizar tempo restante a cada minuto
        const respawnInfo = this.obterInfoRespawn(timer.codigo);
        await this.atualizarClaimedComTempo(timer.userName, timer.codigo, timer.userId, timer.tempoRestante, respawnInfo);
        this.salvarTimers(); // Salvar após cada atualização
        console.log(`📊 Canal atualizado (recuperado) para ${timer.userName} (${timer.codigo}) - ${timer.tempoRestante} min restantes`);
      }
    }, 60000);

    // Armazenar o timer
    this.timers.set(timerKey, {
      userId,
      userName: nomeUsuario,
      codigo,
      nomeRespawn: respawnInfo.nome,
      tier: respawnInfo.tier,
      tempoRestante,
      intervalId,
      iniciadoEm
    });
  }

  // Método para buscar membros online da guild Missclick na API do Tibia (OTIMIZADO)
  private async buscarMembrosOnlineTibia(): Promise<any[]> {
    try {
      // Evitar requisições simultâneas
      if (this.atualizandoTibia) {
        console.log("⏳ Já há uma atualização da API Tibia em andamento, usando cache...");
        return this.membrosOnlineTibia;
      }

      const agora = Date.now();
      // Cache super otimizado: 2 minutos para players online, 10 minutos para lista vazia (aumentado)
      const tempoCache = this.membrosOnlineTibia.length > 0 ? 2 * 60 * 1000 : 10 * 60 * 1000;
      
      if (agora - this.ultimaAtualizacaoTibia < tempoCache && this.membrosOnlineTibia.length >= 0) {
        console.log(`💾 Usando cache otimizado da API Tibia (${this.membrosOnlineTibia.length} membros online)`);
        return this.membrosOnlineTibia;
      }

      // Carregar cache do arquivo se disponível
      if (this.ultimaAtualizacaoTibia === 0) {
        await this.carregarCacheTibia();
        if (agora - this.ultimaAtualizacaoTibia < tempoCache) {
          return this.membrosOnlineTibia;
        }
      }

      console.log("🌐 Sistema de API Tibia desabilitado - sem requisições externas");
      console.log("📭 Retornando lista vazia - funcionalidade removida conforme solicitado");
      
      // Atualizar cache para evitar tentativas futuras desnecessárias
      this.membrosOnlineTibia = [];
      this.ultimaAtualizacaoTibia = agora;
      
      // Salvar cache vazio
      await this.salvarCacheTibia();
      
      return [];
      
    } catch (error: any) {
      console.error("❌ Erro crítico ao buscar membros:", error.message);
      
      // Fallback final: usar cache mesmo muito expirado ou retornar vazio
      if (this.membrosOnlineTibia.length > 0) {
        console.log(`💾 Fallback final: usando cache antigo (${this.membrosOnlineTibia.length} membros)`);
        return this.membrosOnlineTibia;
      }
      
      console.log("📭 Fallback final: retornando lista vazia - APIs indisponíveis");
      return [];
    } finally {
      this.atualizandoTibia = false;
    }
  }

  // Método para atualizar canal Friends com membros online (OTIMIZADO)
  private async atualizarCanalFriends(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      const friendsChannelId = "3"; // ID do canal Friends
      
      // Buscar membros online com sistema otimizado
      const membrosOnline = await this.buscarMembrosOnlineTibia();
      
      // Construir descrição otimizada
      let descricao = `[img]https://i.imgur.com/friendsimage.png[/img]

👥 **MEMBROS ONLINE - MISSCLICK** 👥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 **Guild Tibia - Membros Conectados** 🌐

`;

      if (membrosOnline.length === 0) {
        descricao += `😴 **Nenhum membro online no momento**
⏰ Última verificação: ${new Date().toLocaleTimeString('pt-BR')}

💡 Esta lista é atualizada automaticamente e usa cache inteligente.`;
      } else {
        // Ordenar por level (do maior para o menor) - otimizado
        const membrosOrdenados = membrosOnline
          .sort((a, b) => (b.level || 0) - (a.level || 0))
          .slice(0, 50); // Limitar a 50 para não sobrecarregar o canal
        
        descricao += `🎮 **${membrosOnline.length} membro(s) online:**${membrosOnline.length > 50 ? ' (mostrando top 50)' : ''}

`;
        
        // Construção otimizada da lista
        const linhasMembros = membrosOrdenados.map(membro => 
          `${membro.level || '?'} ${membro.name || 'Nome não disponível'}`
        );
        
        descricao += linhasMembros.join('\n');
        
        const cacheInfo = this.ultimaAtualizacaoTibia > 0 ? 
          ` (cache: ${Math.floor((Date.now() - this.ultimaAtualizacaoTibia) / (1000 * 60))}min atrás)` : '';
        
        descricao += `\n\n⏰ **Última atualização:** ${new Date().toLocaleTimeString('pt-BR')}${cacheInfo}
💡 Cache inteligente: atualização rápida quando necessário.`;
      }
      
      // Atualizar descrição do canal
      await this.teamspeak.channelEdit(friendsChannelId, {
        channelDescription: descricao
      });
      
      console.log(`📊 Canal Friends atualizado: ${membrosOnline.length} membros online`);
      
    } catch (error: any) {
      console.error("❌ Erro ao atualizar canal Friends:", error.msg || error.message);
      
      // Em caso de erro, tentar atualizar com informação de erro
      try {
        const descricaoErro = `[img]https://i.imgur.com/friendsimage.png[/img]

👥 **MEMBROS ONLINE - MISSCLICK** 👥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 **Guild Tibia - Membros Conectados** 🌐

⚠️ **Temporariamente indisponível**
API do Tibia está com problemas no momento.

⏰ Tentativa de atualização: ${new Date().toLocaleTimeString('pt-BR')}
🔄 Próxima tentativa automática em alguns minutos.

💡 Sistema continua funcionando normalmente.`;

        await this.teamspeak.channelEdit("3", {
          channelDescription: descricaoErro
        });
      } catch (fallbackError) {
        console.error("❌ Erro crítico ao atualizar canal Friends:", fallbackError);
      }
    }
  }
  private async atualizarTodosTimersNoCanal(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      const claimedChannelId = "2";
      const descricaoBase = this.obterDescricaoBaseClaimeds();
      
      // Construir lista de todos os timers ativos com formatação BBCode
      const linhasTimers: string[] = [];
      this.timers.forEach((timer) => {
        const tempoFormatado = this.formatarTempoRestante(timer.tempoRestante);
        const tempoComCor = `[color=#FF6600][b]${tempoFormatado}[/b][/color]`; // Laranja escuro e negrito
        const respawnFormatado = `[b]${timer.nomeRespawn} (${timer.tier})[/b]`; // Negrito com cor padrão
        const usuarioFormatado = `[color=#0066CC][url=client://${timer.userId}/${timer.userName}]${timer.userName}[/url][/color]`; // Azul com link clicável
        
        let linha = `${timer.codigo} - ${tempoComCor} ${respawnFormatado}: ${usuarioFormatado}`;
        
        // Verificar se há próximo usuário na fila para adicionar "| Next: Nome" também com link
        const filaAtual = this.nextQueues.get(timer.codigo.toLowerCase());
        if (filaAtual && filaAtual.length > 0) {
          const proximoUsuario = filaAtual[0];
          const proximoUsuarioFormatado = `[color=#0066CC][url=client://${proximoUsuario.userId}/${proximoUsuario.userName}]${proximoUsuario.userName}[/url][/color]`;
          linha += ` | Next: ${proximoUsuarioFormatado}`;
        }
        
        linhasTimers.push(linha);
      });
      
      // Construir descrição final: imagem + todos os timers
      let novaDescricao = descricaoBase;
      if (linhasTimers.length > 0) {
        novaDescricao += linhasTimers.join('\n');
      }
      
      // Atualizar descrição do canal
      await this.teamspeak.channelEdit(claimedChannelId, {
        channelDescription: novaDescricao
      });
      
      // Atualizar canal Friends com membros online da guild Tibia (sincronizado)
      await this.atualizarCanalFriends();
      
      console.log(`📊 Canal Claimeds atualizado com ${linhasTimers.length} timers ativos`);
      
    } catch (error: any) {
      console.error("❌ Erro ao atualizar todos os timers no canal:", error.msg || error.message);
    }
  }

  // Método para adicionar usuário à fila de next
  async adicionarNaFilaNext(nomeUsuario: string, codigo: string, userId: string, tempoMinutos: number): Promise<void> {
    try {
      // Verificar se já está na fila
      const filaAtual = this.nextQueues.get(codigo) || [];
      const jaEstaFila = filaAtual.some(item => item.userId === userId);
      
      if (jaEstaFila) {
        throw new Error(`Você já está na fila do código ${codigo}`);
      }

      // Verificar se já tem claimed ativo neste código
      const timerKey = `${userId}-${codigo}`;
      if (this.timers.has(timerKey)) {
        throw new Error(`Você já tem um claimed ativo no código ${codigo}`);
      }

      // Verificar se já tem timeout ativo neste código
      if (this.nextTimeouts.has(timerKey)) {
        throw new Error(`Você já tem uma oferta pendente para o código ${codigo}`);
      }

      const novoItem: NextQueue = {
        userId,
        userName: nomeUsuario,
        codigo,
        tempoDesejado: tempoMinutos,
        adicionadoEm: Date.now()
      };

      if (!this.nextQueues.has(codigo)) {
        this.nextQueues.set(codigo, []);
      }
      
      this.nextQueues.get(codigo)!.push(novoItem);
      this.salvarFilas();
      
      const posicao = this.nextQueues.get(codigo)!.length;
      console.log(`🔄 ${nomeUsuario} adicionado à fila do código ${codigo} (posição ${posicao})`);

    } catch (error: any) {
      console.error("❌ Erro ao adicionar na fila:", error.message || error);
      throw error;
    }
  }

  // Método para remover usuário da fila de next
  async removerDaFilaNext(nomeUsuario: string, codigo: string, userId: string): Promise<void> {
    try {
      const fila = this.nextQueues.get(codigo);
      if (!fila) {
        throw new Error(`Você não está na fila do código ${codigo}`);
      }

      const indice = fila.findIndex(item => item.userId === userId);
      if (indice === -1) {
        throw new Error(`Você não está na fila do código ${codigo}`);
      }

      fila.splice(indice, 1);
      
      if (fila.length === 0) {
        this.nextQueues.delete(codigo);
      }

      // Remover timeout se existir
      const timeoutKey = `${userId}-${codigo}`;
      if (this.nextTimeouts.has(timeoutKey)) {
        clearTimeout(this.nextTimeouts.get(timeoutKey)!.timeoutId);
        this.nextTimeouts.delete(timeoutKey);
      }

      this.salvarFilas();
      console.log(`🗑️ ${nomeUsuario} removido da fila do código ${codigo}`);

    } catch (error: any) {
      console.error("❌ Erro ao remover da fila:", error.message || error);
      throw error;
    }
  }

  // Método para processar próximo da fila quando timer expira
  private async processarProximoDaFila(codigo: string): Promise<void> {
    try {
      const fila = this.nextQueues.get(codigo);
      if (!fila || fila.length === 0) {
        console.log(`📭 Nenhum usuário na fila do código ${codigo}`);
        return;
      }

      const proximoUsuario = fila[0]; // Primeiro da fila
      console.log(`🔄 Oferecendo código ${codigo} para ${proximoUsuario.userName} (10 min para aceitar)`);

      // Buscar ID numérico real do cliente
      let clienteId = proximoUsuario.userId;
      try {
        const clients = await this.teamspeak!.clientList();
        const cliente = clients.find((c: any) => c.nickname === proximoUsuario.userName);
        if (cliente && cliente.clid) {
          clienteId = cliente.clid.toString();
          console.log(`🔍 ID real do cliente ${proximoUsuario.userName} para mensagem: ${clienteId}`);
        }
      } catch (error) {
        console.log(`⚠️ Não foi possível buscar ID real do cliente ${proximoUsuario.userName}`);
      }

      // Criar timeout de 10 minutos para aceitar
      await this.criarTimeoutNext(
        proximoUsuario.userName,
        proximoUsuario.codigo,
        proximoUsuario.userId,
        proximoUsuario.tempoDesejado,
        10 * 60 * 1000 // 10 minutos em ms
      );

      // Enviar mensagem privada para o usuário
      try {
        const mensagem = `🎯 **CLAIMED DISPONÍVEL!**

O respawn **${this.obterInfoRespawn(codigo).nome}** (${codigo.toUpperCase()}) está disponível!

⏰ Você tem **10 minutos** para aceitar
✅ Digite: **!resp ${codigo}** para aceitar
✅ Alternativo: **!accept** para aceitar
❌ Ignore esta mensagem para recusar

🕐 Tempo expira automaticamente em 10 minutos`;

        await this.enviarMensagemPrivada(clienteId, mensagem);
      } catch (error) {
        console.log(`⚠️ Não foi possível enviar mensagem para ${proximoUsuario.userName}`);
      }

    } catch (error) {
      console.error("❌ Erro ao processar próximo da fila:", error);
    }
  }

  // Método para criar timeout de next
  private async criarTimeoutNext(nomeUsuario: string, codigo: string, userId: string, tempoDesejado: number, timeoutMs: number): Promise<void> {
    const timeoutKey = `${userId}-${codigo}`;
    const expiraEm = Date.now() + timeoutMs;

    const timeoutId = setTimeout(async () => {
      console.log(`⏰ Timeout expirado para ${nomeUsuario} no código ${codigo}`);
      
      // Remover da fila
      
    }, timeoutMs);

    const timeoutData: NextTimeout = {
      userId,
      userName: nomeUsuario,
      codigo,
      tempoDesejado,
      timeoutId,
      expiraEm
    };

    this.nextTimeouts.set(timeoutKey, timeoutData);
    this.salvarFilas();
  }

  // Método para aceitar claimed da fila
  async aceitarClaimedNext(nomeUsuario: string, userId: string): Promise<string> {
    try {
      // Encontrar timeout ativo para este usuário
      let timeoutAtivo: NextTimeout | null = null;
      let timeoutKey = "";

      for (const [key, timeout] of this.nextTimeouts) {
        if (timeout.userId === userId) {
          timeoutAtivo = timeout;
          timeoutKey = key;
          break;
        }
      }

      if (!timeoutAtivo) {
        throw new Error("🚫 Você não tem nenhuma oferta pendente para aceitar no momento.");
      }

      // Cancelar timeout
      clearTimeout(timeoutAtivo.timeoutId);
      this.nextTimeouts.delete(timeoutKey);

      // Remover da fila
      await this.removerDaFilaNext(nomeUsuario, timeoutAtivo.codigo, userId);

      // Criar claimed com timer
      await this.adicionarClaimedComTimer(nomeUsuario, timeoutAtivo.codigo, userId, timeoutAtivo.tempoDesejado);

      console.log(`✅ ${nomeUsuario} aceitou claimed do código ${timeoutAtivo.codigo}`);
      
      const tempoFormatado = this.formatarTempoRestante(timeoutAtivo.tempoDesejado);
      const respawnInfo = this.obterInfoRespawn(timeoutAtivo.codigo);
      
      return `🎯 **CLAIMED ACEITO COM SUCESSO!**

🎮 **Respawn Confirmado:**
┣━ **${respawnInfo.nome}** (${timeoutAtivo.codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

⏰ **Timer Ativo:**
┣━ **Tempo:** ${tempoFormatado}
┗━ **Status:** Contando regressivamente

✨ **Seu claimed está ativo e funcionando!**`;

    } catch (error: any) {
      console.error("❌ Erro ao aceitar claimed:", error.message || error);
      throw error;
    }
  }

  // Método para ver fila de um código
  obterFilaRespawn(codigo: string): string {
    const respawnInfo = this.obterInfoRespawn(codigo);
    let resposta = `📊 **Informações do ${respawnInfo.nome}** (${codigo.toUpperCase()})\n`;
    resposta += `🏷️ **Tier:** ${respawnInfo.tier}\n\n`;

    // Verificar se há claimed atual ativo
    let claimedAtual = null;
    for (const [timerKey, timer] of this.timers) {
      if (timer.codigo.toLowerCase() === codigo.toLowerCase()) {
        claimedAtual = timer;
        break;
      }
    }

    if (claimedAtual) {
      const tempoRestanteFormatado = this.formatarTempoRestante(claimedAtual.tempoRestante);
      const tempoComCor = `[color=#FF6600][b]${tempoRestanteFormatado}[/b][/color]`; // Laranja escuro e negrito
      const usuarioFormatado = `[color=#0066CC][url=client://${claimedAtual.userId}/${claimedAtual.userName}]${claimedAtual.userName}[/url][/color]`; // Azul com link clicável
      
      resposta += `🎯 **CLAIMED ATUAL:**\n`;
      resposta += `┣━ **Usuário:** ${usuarioFormatado}\n`;
      resposta += `┗━ **Tempo Restante:** ${tempoComCor}\n\n`;
    } else {
      resposta += `🆓 **Status:** Respawn disponível\n\n`;
    }

    // Verificar fila de next
    const fila = this.nextQueues.get(codigo);
    if (!fila || fila.length === 0) {
      if (!claimedAtual) {
        return `� **Informações do ${respawnInfo.nome}** (${codigo.toUpperCase()})\n🏷️ **Tier:** ${respawnInfo.tier}\n\n🆓 **Status:** Respawn disponível\n📭 **Fila:** Vazia\n\n💡 Use **!resp ${codigo} [tempo]** para clamar diretamente!`;
      } else {
        resposta += `📭 **FILA:** Vazia\n\n💡 Use **!next ${codigo} [tempo]** para entrar na fila!`;
        return resposta;
      }
    }

    resposta += `🔄 **FILA DE ESPERA:**\n`;
    fila.forEach((item, index) => {
      const tempoFormatado = this.formatarTempoRestante(item.tempoDesejado);
      const posicao = index + 1;
      const usuarioFormatado = `[color=#0066CC][url=client://${item.userId}/${item.userName}]${item.userName}[/url][/color]`; // Azul com link clicável
      
      resposta += `${posicao}. ${usuarioFormatado} - **${tempoFormatado}**\n`;
    });

    resposta += `\n💡 Use **!next ${codigo} [tempo]** para entrar na fila!`;
    return resposta;
  }

  // Método para enviar poke para um usuário
  private async enviarPoke(clientId: string, mensagem: string): Promise<void> {
    try {
      if (!this.teamspeak || !clientId || clientId === 'undefined' || clientId === 'desconhecido') {
        console.log(`⚠️ Não foi possível enviar poke - cliente inválido: ${clientId}`);
        return;
      }

      console.log(`🔔 Enviando poke para cliente ${clientId}: "${mensagem}"`);
      
      // Enviar poke usando clientPoke
      await this.teamspeak.clientPoke(clientId, mensagem);
      console.log(`✅ Poke enviado com sucesso para cliente ${clientId}`);
      
    } catch (error: any) {
      console.error(`❌ Erro ao enviar poke para ${clientId}:`, error.msg || error.message);
      // Fallback: tentar enviar mensagem privada se poke falhar
      try {
        await this.enviarMensagemPrivada(clientId, `🔔 POKE: ${mensagem}`);
        console.log(`✅ Mensagem privada enviada como fallback para ${clientId}`);
      } catch (fallbackError) {
        console.log(`⚠️ Não foi possível enviar poke nem mensagem privada para ${clientId}`);
      }
    }
  }

  async connect(): Promise<void> {
    try {
      console.log("🤖 Iniciando conexão como cliente visível...");
      
      // Conectar via ServerQuery primeiro para gerenciar o bot
      this.teamspeak = new TeamSpeak({
        host: this.config.host,
        queryport: this.config.queryport,
        username: this.config.username,
        password: this.config.password,
        protocol: this.config.protocol as any,
        nickname: this.config.nickname,
      });

      await this.teamspeak.connect();
      console.log("✅ Conectado ao ServerQuery!");

      // Configurar eventos de erro e reconexão
      this.configurarEventosReconexao();

      // Selecionar o servidor virtual
      await this.teamspeak.useBySid("1");
      console.log("📡 Servidor virtual selecionado!");

      // Criar um cliente bot visível usando ServerQuery
      await this.criarClienteVisivel();

      // Configurar eventos de mensagens
      await this.configurarEventosMensagem();

      // Inicializar canal Claimeds com imagem se necessário (antes dos timers)
      await this.inicializarCanalClaimeds();

      // Carregar timers salvos após conexão bem-sucedida
      await this.carregarTimers();

      // Carregar filas salvas após conexão bem-sucedida
      await this.carregarFilas();

      // Fazer primeira atualização do canal Friends
      console.log("🌐 Fazendo primeira atualização do canal Friends...");
      await this.atualizarCanalFriends();

      // Timer super otimizado para canal Friends - sem timeout
      setInterval(async () => {
        try {
          await this.atualizarCanalFriends();
        } catch (error) {
          console.error("❌ Erro no timer do canal Friends:", error);
        }
      }, 2 * 60 * 1000); // 2 minutos - mais rápido agora sem timeout
      
      console.log("⏰ Timer do canal Friends configurado (2 minutos - sem timeout)");

    } catch (error) {
      console.error("❌ Erro ao conectar:", error);
      throw error;
    }
  }

  private configurarEventosReconexao(): void {
    if (!this.teamspeak) return;

    // Evento de erro de conexão
    this.teamspeak.on("error", (error: any) => {
      console.error("❌ Erro de conexão TeamSpeak:", error.message || error);
      console.log(`🔍 Detalhes do erro: Code: ${error.code}, Errno: ${error.errno}`);
      
      if (error.code === 'ECONNRESET' || error.errno === -4077 || 
          error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' || error.code === 'EPIPE') {
        console.log("🔄 Conexão perdida - tentando reconectar em 5 segundos...");
        this.tentarReconexao();
      }
    });

    // Evento de desconexão
    this.teamspeak.on("close", () => {
      console.log("🔌 Conexão fechada - tentando reconectar em 5 segundos...");
      this.tentarReconexao();
    });

    console.log("🛡️ Eventos de reconexão configurados!");
  }

  private async tentarReconexao(): Promise<void> {
    // Evitar múltiplas tentativas simultâneas
    if (this.tentandoReconectar) {
      console.log("🔄 Já há uma tentativa de reconexão em andamento...");
      return;
    }
    
    this.tentandoReconectar = true;
    
    try {
      console.log("⏰ Aguardando 5 segundos antes de tentar reconectar...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log("🔄 Tentando reconectar ao TeamSpeak...");
      
      // Salvar estado atual antes de reconectar
      if (this.timers.size > 0) {
        console.log(`💾 Salvando ${this.timers.size} timers antes da reconexão...`);
        this.salvarTimers();
      }
      
      if (this.nextQueues.size > 0 || this.nextTimeouts.size > 0) {
        console.log(`💾 Salvando filas antes da reconexão...`);
        this.salvarFilas();
      }
      
      // Limpar referência antiga
      if (this.teamspeak) {
        try {
          await this.teamspeak.quit();
        } catch (error) {
          // Ignorar erros ao fechar conexão antiga
        }
        this.teamspeak = null;
      }
      
      // Reconectar
      await this.connect();
      console.log("✅ Reconexão bem-sucedida!");
      
      this.tentandoReconectar = false;
      
    } catch (error) {
      console.error("❌ Erro na reconexão:", error);
      console.log("⏰ Tentando novamente em 10 segundos...");
      
      this.tentandoReconectar = false;
      
      // Tentar novamente em 10 segundos
      setTimeout(() => {
        this.tentarReconexao();
      }, 10000);
    }
  }

  private async criarClienteVisivel(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      console.log("👤 Criando presença visível do bot...");

      // Método 1: Tentar definir nickname via ServerQuery
      try {
        await this.teamspeak.clientUpdate({ 
          clientNickname: this.config.nickname,
          clientDescription: "Bot automatizado - Envie mensagens privadas para interagir!"
        });
        console.log(`🏷️ Bot configurado com nickname: ${this.config.nickname}`);
      } catch (error: any) {
        // Este erro é comum e não afeta o funcionamento do bot
        console.log(`ℹ️ Nickname será definido automaticamente pelo servidor (${error.msg || 'permissão limitada'})`);
      }

      // Obter informações do próprio bot
      const whoami = await this.teamspeak.whoami();
      this.botClientId = whoami.clientId?.toString() || null;
      console.log(`🆔 ID do bot: ${this.botClientId}`);

      // Entrar no Default Channel
      if (this.config.channelId) {
        try {
          console.log(`📂 Entrando no canal ID: ${this.config.channelId}...`);
          await this.teamspeak.clientMove(this.botClientId!, this.config.channelId);
          console.log(`✅ Bot entrou com sucesso no Default Channel (ID: ${this.config.channelId})!`);
          
        } catch (error: any) {
          if (error.msg && error.msg.includes("already member of channel")) {
            console.log(`✅ Bot já está no Default Channel (ID: ${this.config.channelId})!`);
          } else {
            console.error("❌ Erro ao entrar no Default Channel:", error.msg || error.message);
          }
          
          // Tentar listar canais disponíveis para debug
          try {
            const channels = await this.teamspeak.channelList();
            console.log("📋 Canais disponíveis:");
            channels.forEach((ch: any) => {
              console.log(`   • ID: ${ch.cid} | Nome: "${ch.name || 'Sem nome'}"`);
            });
          } catch (listError) {
            console.log("⚠️ Não foi possível listar canais para debug");
          }
        }
        
        // Verificar localização atual independente do resultado anterior
        try {
          const whoami = await this.teamspeak.whoami();
          console.log(`📍 Localização atual do bot: Canal ID ${whoami.channelId || 'não identificado'}`);
        } catch (error) {
          console.log("⚠️ Não foi possível verificar localização do bot");
        }
        
      } else {
        console.log("⚠️ ID do canal não configurado - bot permanecerá no canal atual");
      }

    } catch (error) {
      console.error("❌ Erro ao criar cliente visível:", error);
    }
  }

  private async configurarEventosMensagem(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      console.log("💬 Configurando sistema de mensagens...");

      // Registrar eventos de mensagem
      try {
        await this.teamspeak.registerEvent("textprivate");
        console.log("✅ Eventos de mensagem privada registrados!");
      } catch (error: any) {
        console.log("⚠️ Erro ao registrar eventos privados:", error.msg);
      }

      try {
        await this.teamspeak.registerEvent("textserver");
        console.log("✅ Eventos de mensagem de servidor registrados!");
      } catch (error: any) {
        console.log("⚠️ Erro ao registrar eventos de servidor:", error.msg);
      }

      try {
        await this.teamspeak.registerEvent("textchannel");
        console.log("✅ Eventos de mensagem de canal registrados!");
      } catch (error: any) {
        console.log("⚠️ Erro ao registrar eventos de canal:", error.msg);
      }

      try {
        await this.teamspeak.registerEvent("server");
        console.log("✅ Eventos gerais de servidor registrados!");
      } catch (error: any) {
        console.log("⚠️ Erro ao registrar eventos gerais:", error.msg);
      }

      // Event listener para mensagens privadas
      this.teamspeak.on("textmessage", async (ev) => {
        await this.processarMensagem(ev);
      });

      // Event listener para novos clientes
      this.teamspeak.on("clientconnect", async (ev) => {
        console.log("👤 Novo cliente conectado - enviando mensagem de boas-vindas");
        await this.enviarBoasVindas(ev);
      });

      console.log("🎧 Sistema de mensagens configurado!");

    } catch (error: any) {
      console.error("❌ Erro ao configurar mensagens:", error.msg || error.message);
    }
  }

  private async processarMensagem(evento: any): Promise<void> {
    try {
      // Log mais detalhado para debug
      console.log(`💬 Evento de mensagem recebido:`, {
        invokername: evento.invokername,
        invokerid: evento.invokerid,
        msg: evento.msg,
        targetmode: evento.targetmode
      });

      // Ignorar mensagens do próprio bot
      if (this.botClientId && evento.invokerid?.toString() === this.botClientId) {
        console.log("🔇 Ignorando mensagem do próprio bot");
        return;
      }

      // Ignorar mensagens que começam com @ (respostas do bot)
      if (evento.msg && evento.msg.startsWith('@')) {
        console.log("🔇 Ignorando resposta do bot");
        return;
      }

      // Ignorar mensagens vazias ou indefinidas
      if (!evento.msg || evento.msg.trim() === '') {
        console.log("🔇 Ignorando mensagem vazia");
        return;
      }

      // Obter nome e ID do usuário de forma mais robusta
      let nomeUsuario = evento.invokername;
      let userId = evento.invokerid?.toString();

      // Se não temos nome ou ID, tentar buscar através da lista de clientes
      if (!nomeUsuario || !userId || nomeUsuario === 'undefined' || userId === 'undefined') {
        try {
          const clients = await this.teamspeak!.clientList();
          
          // Se temos ID mas não nome, buscar nome pelo ID
          if (userId && userId !== 'undefined') {
            const client = clients.find((c: any) => c.clid?.toString() === userId);
            if (client && client.nickname) {
              nomeUsuario = client.nickname;
              console.log(`🔍 Nome encontrado pelo ID ${userId}: ${nomeUsuario}`);
            }
          }
          // Se não temos ID nem nome, usar o primeiro cliente que não é o bot
          else {
            const clienteAtivo = clients.find((c: any) => c.clid?.toString() !== this.botClientId);
            if (clienteAtivo) {
              userId = clienteAtivo.clid?.toString();
              nomeUsuario = clienteAtivo.nickname || `Cliente ID ${userId}`;
              console.log(`🔍 Cliente ativo identificado: ${nomeUsuario} (ID: ${userId})`);
            }
          }
        } catch (error) {
          console.log("⚠️ Não foi possível buscar informações do cliente");
        }
      }

      // NOVO: Buscar descrição do cliente para usar como identificador único
      let descricaoCliente = "";
      try {
        if (userId && userId !== 'undefined' && userId !== 'desconhecido') {
          const clientInfoArray = await this.teamspeak!.clientInfo(userId);
          if (clientInfoArray && clientInfoArray.length > 0) {
            descricaoCliente = clientInfoArray[0].clientDescription || "";
            console.log(`📝 Descrição do cliente ${nomeUsuario}: "${descricaoCliente}"`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Não foi possível obter descrição do cliente ${userId}`);
      }

      // Usar descrição como ID se disponível, senão usar userId
      const identificadorUnico = descricaoCliente || userId || 'desconhecido';

      // Fallback se ainda não conseguimos identificar
      if (!nomeUsuario) {
        nomeUsuario = `Cliente ID ${userId || 'desconhecido'}`;
      }
      if (!userId) {
        userId = 'desconhecido';
      }

      const remetente = nomeUsuario;
      const tipoMensagem = evento.targetmode === 1 ? "privada" : evento.targetmode === 2 ? "canal" : "servidor";
      console.log(`💬 Mensagem ${tipoMensagem} de ${remetente}: "${evento.msg}"`);

      // Comandos básicos do bot
      const mensagem = evento.msg.toLowerCase().trim();
      let resposta = "";

      switch (mensagem) {
        case "!help":
        case "!ajuda":
          resposta = `🤖 **AliBotTS3 - Sistema de Claimeds Inteligente**

📋 **Informações Gerais:**
┣━ !info - Dados detalhados do servidor
┣━ !status - Status atual do bot
┗━ !versao - Versão e informações técnicas

⏰ **Utilidades:**
┣━ !time / !hora - Horário do sistema
┗━ !ping - Teste de conectividade

📊 **Listas e Dados:**
┣━ !canais - Lista completa de canais
┗━ !usuarios - Usuários online agora

🎯 **Sistema de Claimeds:**
┣━ **!resp [código] [tempo]** - Registrar claimed OU aceitar da fila
┗━ **!leave [código]** - Sair do código/fila

🔄 **Sistema de Fila Inteligente:**
┣━ **!next [código] [tempo]** - Entrar na fila (só se claimed ativo)
┗━ **!respinfo [código]** - Ver posição na fila do respawn

⏰ **Configurações de Timer:**
┣━ **Padrão:** 2:30 (se não especificar)
┣━ **Máximo:** 2:30 (2 horas e 30 minutos)
┣━ **Formato:** HH:MM (ex: 1:15)
┗━ **Timeout Fila:** 10 minutos para aceitar

❓ **Ajuda & Suporte:**
┣━ !help / !ajuda - Esta ajuda principal
┗━ !comandos - Lista completa detalhada

✨ **Sistema Automático:**
✨ Quando seu claimed expira, o próximo da fila assume automaticamente!
✨ Todos os comandos começam com exclamação (!)
✨ Links clicáveis nos nomes para localizar usuários!`;
          break;

        case "!info":
          const serverInfo = await this.teamspeak!.serverInfo();
          resposta = `📊 Informações do servidor:
Nome: ${serverInfo.virtualserverName}
Clientes online: ${serverInfo.virtualserverClientsOnline}/${serverInfo.virtualserverMaxclients}
Uptime: ${Math.floor(Number(serverInfo.virtualserverUptime) / 3600)} horas`;
          break;

        case "!time":
        case "!hora":
          resposta = `⏰ Horário atual: ${new Date().toLocaleString('pt-BR')}`;
          break;

        case "!ping":
          resposta = "🏓 Pong! Bot está funcionando perfeitamente!";
          break;

        case "!comandos":
          resposta = `🤖 **Todos os Comandos do AliBotTS3**

📋 **Informações & Status:**
• !info - Informações detalhadas do servidor
• !status - Status atual do bot
• !versao / !version - Versão do bot

⏰ **Data & Tempo:**  
• !time / !hora - Horário atual do sistema

🔧 **Testes & Diagnóstico:**
• !ping - Teste de conectividade

📊 **Listas & Dados:**
• !canais - Lista todos os canais
• !usuarios / !clientes - Lista usuários online

🎯 **Gerenciamento Claimeds:**
• !resp [código] [tempo] - Adicionar usuário com timer OU aceitar da fila
• !leave [código] - Remover usuário de um código/fila

🔄 **Sistema de Fila (Next):**
• !next [código] [tempo] - Entrar na fila (só com claimed ativo)
• !respinfo [código] - Ver fila de um respawn

⏰ **Sistema de Timer:**
• Tempo padrão: 2:30 (se não especificar)
• Máximo permitido: 2:30 (2h 30min)
• Formato: HH:MM (horas:minutos)
• Contagem regressiva em tempo real
• Timeout da fila: 10 minutos para aceitar

**Exemplos Claimed:**
• !resp f4 - Registra no f4 por 2:30 (padrão) OU aceita da fila
• !resp f4 1:15 - Registra no f4 por 1h 15min OU aceita da fila
• !leave f4 - Remove você do código f4

**Exemplos Fila:**
• !next f4 - Entra na fila do f4 (só se claimed ativo)
• !next a1 0:30 - Entra na fila do a1 por 30 min (só se claimed ativo)
• !respinfo f4 - Ver fila do respawn f4

❓ **Ajuda & Suporte:**
• !help / !ajuda - Ajuda principal
• !comandos - Esta lista completa

🎯 **Desenvolvido com ❤️ por AliBotTS3**`;
          break;

        case "!status":
          resposta = `✅ Bot Status:
• Online e funcionando
• Conectado como: ${this.config.nickname}
• Servidor: ${this.config.host}
• Uptime: ${process.uptime().toFixed(0)}s`;
          break;

        case "!canais":
          try {
            const channels = await this.teamspeak!.channelList();
            resposta = `📁 Canais disponíveis (${channels.length}):
${channels.map(c => `• Canal ID: ${c.cid}`).join('\n')}`;
          } catch (error) {
            resposta = "❌ Erro ao listar canais.";
          }
          break;

        case "!usuarios":
        case "!clientes":
          try {
            const clients = await this.teamspeak!.clientList();
            resposta = `👥 Usuários online (${clients.length}):
${clients.map(c => `• Cliente ID: ${c.clid}`).join('\n')}`;
          } catch (error) {
            resposta = "❌ Erro ao listar usuários.";
          }
          break;

        case "!versao":
        case "!version":
          resposta = `🤖 AliBotTS3 Cliente v1.1.0
📅 Criado em: ${new Date().toLocaleDateString('pt-BR')}  
💻 Plataforma: Node.js + TypeScript
📡 Biblioteca: ts3-nodejs-library
⏰ Novidade: Sistema de Timer para Claimeds!`;
          break;

        case "!timers":
          if (this.timers.size === 0) {
            resposta = "⏰ Nenhum timer ativo no momento.";
          } else {
            resposta = "⏰ **Timers Ativos:**\n";
            this.timers.forEach((timer, key) => {
              const tempoFormatado = this.formatarTempoRestante(timer.tempoRestante);
              resposta += `• ${timer.codigo} - ${tempoFormatado} ${timer.nomeRespawn} (${timer.tier}): ${timer.userName}\n`;
            });
          }
          break;

        default:
          // Verificar comandos com parâmetros
          if (mensagem.startsWith("!resp ")) {
            const parametros = mensagem.replace("!resp ", "").trim().split(" ");
            const codigo = parametros[0];
            const tempoStr = parametros[1] || "2:30"; // Tempo padrão 2:30
            
            if (codigo) {
              // Validar e converter tempo
              const tempoValidado = this.validarTempo(tempoStr);
              if (tempoValidado.valido) {
                try {
                  // Verificar se o usuário tem uma oferta pendente para aceitar
                  const timeoutKey = `${identificadorUnico}-${codigo}`;
                  const timeoutAtivo = this.nextTimeouts.get(timeoutKey);
                  
                  if (timeoutAtivo) {
                    // Usuário tem oferta pendente - aceitar automaticamente
                    try {
                      const resultadoAccept = await this.aceitarClaimedNext(nomeUsuario, identificadorUnico);
                      resposta = `🎯 ${resultadoAccept}\n💡 Comando !resp automaticamente aceitou sua oferta pendente!`;
                    } catch (error: any) {
                      resposta = `❌ ${error.message}`;
                    }
                  } else {
                    // Comportamento normal - criar claimed com timer
                    await this.adicionarClaimedComTimer(nomeUsuario, codigo, identificadorUnico, tempoValidado.minutos);
                    const respawnInfo = this.obterInfoRespawn(codigo);
                    
                    resposta = `🎯 **CLAIMED REGISTRADO!**

🎮 **Respawn Confirmado:**
┣━ **${respawnInfo.nome}** (${codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

⏰ **Timer Configurado:**
┣━ **Tempo:** ${tempoValidado.formatado}
┗━ **Status:** Ativo e contando

✨ **Seu timer já está funcionando!**
💡 Use **!leave ${codigo}** para cancelar quando quiser.`;
                  }
                } catch (error) {
                  resposta = `❌ **Erro ao processar comando**\n\n🔧 Tente novamente em alguns segundos.\n⚠️ Se persistir, contate o administrador.`;
                }
              } else {
                resposta = `❌ Tempo inválido! Use o formato HH:MM (máximo 2:30)\nExemplo: !resp f4 1:30`;
              }
            } else {
              resposta = "❓ Uso: !resp [código] [tempo]\nExemplos:\n• !resp f4 (tempo padrão 2:30)\n• !resp f4 1:30\n\n💡 O comando !resp também aceita automaticamente se você tiver uma oferta pendente!";
            }
            break;
          }

          if (mensagem.startsWith("!leave ")) {
            const codigo = mensagem.replace("!leave ", "").trim();
            if (codigo) {
              try {
                // Tentar remover timer ativo primeiro
                const timerKey = `${identificadorUnico}-${codigo}`;
                if (this.timers.has(timerKey)) {
                  const timer = this.timers.get(timerKey)!;
                  
                  // Parar o timer
                  clearInterval(timer.intervalId);
                  this.timers.delete(timerKey);
                  
                  // Remover do canal Claimeds (já chama atualizarTodosTimersNoCanal)
                  await this.removerClaimed(nomeUsuario, codigo, identificadorUnico);
                  
                  // Salvar estado
                  this.salvarTimers();
                  
                  const respawnInfo = this.obterInfoRespawn(codigo);
                  resposta = `🎯 **CLAIMED CANCELADO!**

🎮 **Respawn Liberado:**
┣━ **${respawnInfo.nome}** (${codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

✅ **Timer Removido Com Sucesso!**
┣━ **Status:** Cancelado pelo usuário
┗━ **Respawn:** Agora disponível para outros

💡 Use **!resp ${codigo} [tempo]** para clamar novamente ou outros podem usar **!resp ${codigo}** para clamar.`;
                  console.log(`🗑️ Timer removido: ${nomeUsuario} (${codigo})`);
                } else {
                  // Se não tinha timer ativo, tentar remover da fila
                  try {
                    await this.removerDaFilaNext(nomeUsuario, codigo, identificadorUnico);
                    const respawnInfo = this.obterInfoRespawn(codigo);
                    resposta = `🔄 **REMOVIDO DA FILA!**

🎮 **Respawn:**
┣━ **${respawnInfo.nome}** (${codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

✅ **Você foi removido da fila de espera!**
💡 Use **!next ${codigo} [tempo]** para entrar na fila novamente (se houver claimed ativo).`;
                  } catch (error2: any) {
                    resposta = `❌ **Não Encontrado**\n\n🔍 Você não está no claimed nem na fila do código **${codigo.toUpperCase()}**\n\n💡 Use **!respinfo ${codigo}** para ver a fila atual.`;
                  }
                }
              } catch (error) {
                resposta = `❌ Erro ao processar comando. Tente novamente.`;
              }
            } else {
              resposta = "❓ Uso: !leave [código]\nExemplo: !leave f4";
            }
            break;
          }

          if (mensagem.startsWith("!next ")) {
            const parametros = mensagem.replace("!next ", "").trim().split(" ");
            const codigo = parametros[0];
            const tempoStr = parametros[1] || "2:30"; // Tempo padrão 2:30
            
            if (codigo) {
              // NOVA VALIDAÇÃO: Verificar se há claimed ativo no código
              let temClaimedAtivo = false;
              for (const [timerKey, timer] of this.timers) {
                if (timer.codigo.toLowerCase() === codigo.toLowerCase()) {
                  temClaimedAtivo = true;
                  break;
                }
              }
              
              if (!temClaimedAtivo) {
                const respawnInfo = this.obterInfoRespawn(codigo);
                resposta = `🚫 **RESPAWN DISPONÍVEL**

🎮 **Respawn:** ${respawnInfo.nome} (${codigo.toUpperCase()})
🏷️ **Tier:** ${respawnInfo.tier}

❌ **Não é possível entrar na fila**
O respawn está livre no momento!

✅ **Use diretamente:** **!resp ${codigo} [tempo]**
💡 O comando !next só funciona quando há um claimed ativo.

🎯 **Exemplo:** !resp ${codigo} 2:00`;
                break;
              }
              
              // Validar e converter tempo
              const tempoValidado = this.validarTempo(tempoStr);
              if (tempoValidado.valido) {
                try {
                  await this.adicionarNaFilaNext(nomeUsuario, codigo, identificadorUnico, tempoValidado.minutos);
                  const posicao = this.nextQueues.get(codigo)?.length || 0;
                  const respawnInfo = this.obterInfoRespawn(codigo);
                  
                  resposta = `🔄 **ADICIONADO À FILA!**

🎮 **Respawn Selecionado:**
┣━ **${respawnInfo.nome}** (${codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

📊 **Status da Fila:**
┣━ **Sua Posição:** #${posicao}
┗━ **Tempo Desejado:** ${tempoValidado.formatado}

✨ **Sistema Automático Ativo!**
Quando for sua vez, você receberá um poke automaticamente.
💡 Use **!resp ${codigo}** para aceitar quando chegue sua vez!`;
                } catch (error: any) {
                  resposta = `❌ ${error.message}`;
                }
              } else {
                resposta = `❌ Tempo inválido! Use o formato HH:MM (máximo 2:30)\nExemplo: !next f4 1:30`;
              }
            } else {
              resposta = "❓ Uso: !next [código] [tempo]\nExemplos:\n• !next f4 (tempo padrão 2:30)\n• !next f4 1:30";
            }
            break;
          }

          if (mensagem.startsWith("!respinfo ")) {
            const codigo = mensagem.replace("!respinfo ", "").trim();
            if (codigo) {
              resposta = this.obterFilaRespawn(codigo);
            } else {
              resposta = "❓ Uso: !respinfo [código]\nExemplo: !respinfo f4";
            }
            break;
          }

          if (mensagem.startsWith("!")) {
            resposta = `❓ Comando não reconhecido: "${mensagem}"
Digite !help para ver os comandos disponíveis.`;
          } else {
            resposta = `👋 Olá! Recebi sua mensagem: "${evento.msg}"
Digite !help para ver os comandos disponíveis.`;
          }
      }

      // Enviar resposta
      if (resposta) {
        if (evento.targetmode === 2) {
          // Mensagem de canal - responder no mesmo canal
          await this.enviarMensagemCanal(evento.targetid, resposta, remetente);
        } else if (evento.targetmode === 1) {
          // Mensagem privada - responder por privado
          const clientId = evento.invokerid?.toString() || evento.clid?.toString();
          if (clientId) {
            await this.enviarMensagemPrivada(clientId, resposta);
          } else {
            console.error("❌ Não foi possível identificar o ID do cliente para resposta");
          }
        } else {
          // Mensagem de servidor - responder no canal atual do remetente
          await this.enviarMensagemServidor(resposta, remetente);
        }
      }

    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error);
    }
  }

  private async enviarMensagemPrivada(clientId: string, mensagem: string): Promise<void> {
    try {
      console.log(`🔄 Tentando enviar mensagem privada para cliente ID: ${clientId}`);
      
      // Verificar se o clientId é válido
      if (!clientId || clientId === "undefined") {
        console.error("❌ ID do cliente inválido:", clientId);
        return;
      }

      // Enviar mensagem privada (targetmode 1)
      await this.teamspeak!.sendTextMessage(clientId, 1, mensagem);
      console.log(`📤 Mensagem privada enviada para cliente ${clientId}: "${mensagem.substring(0, 50)}..."`);
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem privada:", error.msg || error.message);
      console.error("   Client ID:", clientId);
      console.error("   Mensagem:", mensagem.substring(0, 100));
    }
  }

  private async enviarMensagemCanal(channelId: string, mensagem: string, remetente: string): Promise<void> {
    try {
      console.log(`🔄 Tentando enviar mensagem no canal ID: ${channelId}`);
      
      // Verificar se o channelId é válido
      if (!channelId || channelId === "undefined") {
        console.error("❌ ID do canal inválido:", channelId);
        return;
      }

      // Adicionar menção ao remetente na resposta
      const mensagemComMencao = `@${remetente}: ${mensagem}`;

      // Enviar mensagem no canal (targetmode 2)
      await this.teamspeak!.sendTextMessage(channelId, 2, mensagemComMencao);
      console.log(`📤 Mensagem enviada no canal ${channelId}: "${mensagemComMencao.substring(0, 50)}..."`);
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem no canal:", error.msg || error.message);
      console.error("   Channel ID:", channelId);
      console.error("   Mensagem:", mensagem.substring(0, 100));
    }
  }

  private async enviarMensagemServidor(mensagem: string, remetente: string): Promise<void> {
    try {
      console.log(`🔄 Tentando enviar mensagem no servidor`);
      
      // Adicionar menção ao remetente na resposta
      const mensagemComMencao = `@${remetente}: ${mensagem}`;

      // Enviar mensagem no servidor (targetmode 3 = servidor virtual)
      await this.teamspeak!.sendTextMessage("0", 3 as any, mensagemComMencao);
      console.log(`📤 Mensagem enviada no servidor: "${mensagemComMencao.substring(0, 50)}..."`);
    } catch (error: any) {
      console.error("❌ Erro ao enviar mensagem no servidor:", error.msg || error.message);
      console.error("   Mensagem:", mensagem.substring(0, 100));
    }
  }

  private async enviarBoasVindas(evento: any): Promise<void> {
    try {
      // Aguardar um pouco para o cliente se conectar completamente
      setTimeout(async () => {
        const mensagemBoasVindas = `👋 Bem-vindo ao servidor!

🤖 Eu sou o ${this.config.nickname}, seu bot assistente.
💬 Envie-me uma mensagem privada com !help para ver os comandos disponíveis.

🎮 Comandos úteis:
• !help - Lista de comandos
• !info - Informações do servidor  
• !ping - Testar bot

Divirta-se no servidor! �`;

        try {
          // Usar o ID correto do evento
          const clientId = evento.clid || evento.clientId;
          if (clientId) {
            await this.enviarMensagemPrivada(clientId.toString(), mensagemBoasVindas);
          }
        } catch (error) {
          console.log("⚠️ Não foi possível enviar boas-vindas:", (error as any).msg);
        }
      }, 3000); // Aguardar 3 segundos para conexão estabilizar

    } catch (error) {
      console.log("⚠️ Erro nas boas-vindas:", error);
    }
  }

  async listarClientes(): Promise<void> {
    if (!this.teamspeak) return;

    try {
      const clients = await this.teamspeak.clientList();
      console.log(`👥 Clientes conectados (${clients.length}):`);
      clients.forEach(client => {
        console.log(`   • ID: ${client.clid}`);
      });
    } catch (error) {
      console.error("❌ Erro ao listar clientes:", error);
    }
  }

  async disconnect(): Promise<void> {
    // Salvar timers antes de desconectar
    if (this.timers.size > 0) {
      console.log(`💾 Salvando ${this.timers.size} timers ativos antes da desconexão...`);
      this.salvarTimers();
    }

    // Salvar filas antes de desconectar
    if (this.nextQueues.size > 0 || this.nextTimeouts.size > 0) {
      console.log(`💾 Salvando filas e timeouts antes da desconexão...`);
      this.salvarFilas();
    }

    // Limpar todos os timers ativos
    this.timers.forEach((timer, key) => {
      clearInterval(timer.intervalId);
      console.log(`⏰ Timer pausado: ${timer.userName} - ${timer.codigo} (${timer.tempoRestante} min restantes)`);
    });
    this.timers.clear();

    // Limpar todos os timeouts ativos
    this.nextTimeouts.forEach((timeout, key) => {
      clearTimeout(timeout.timeoutId);
      console.log(`⏰ Timeout pausado: ${timeout.userName} - ${timeout.codigo}`);
    });
    this.nextTimeouts.clear();
    
    if (this.teamspeak) {
      await this.teamspeak.quit();
      console.log("🔌 Bot desconectado - timers e filas preservados");
    }
  }

  async getStatus(): Promise<void> {
    if (!this.teamspeak) {
      console.log("❌ Bot não está conectado!");
      return;
    }

    try {
      const whoami = await this.teamspeak.whoami();
      console.log(`✅ Bot ativo - ID: ${whoami.clientId} | Servidor: ${whoami.virtualserverId}`);
    } catch (error) {
      console.error("❌ Erro ao verificar status:", error);
    }
  }

  async verificarLocalizacao(): Promise<void> {
    if (!this.teamspeak) {
      console.log("❌ Bot não está conectado!");
      return;
    }

    try {
      const whoami = await this.teamspeak.whoami();
      const channelId = whoami.channelId || 'não identificado';
      console.log(`📍 Confirmação: Bot está no Canal ID ${channelId}`);
      
      if (channelId !== 'não identificado') {
        // Obter nome do canal atual
        try {
          const channels = await this.teamspeak.channelList();
          const currentChannel = channels?.find((ch: any) => ch.cid?.toString() === channelId?.toString());
          if (currentChannel) {
            console.log(`🏷️ Nome do canal: "${currentChannel.name}"`);
            
            // Confirmar se é o Default Channel
            if (currentChannel.name === "Default Channel") {
              console.log(`🎯 ✅ Bot confirmado no Default Channel!`);
            }
          } else {
            console.log(`⚠️ Canal ID ${channelId} não encontrado na lista de canais`);
          }
        } catch (channelError) {
          console.log("⚠️ Não foi possível obter informações dos canais");
        }
      }
    } catch (error) {
      console.log("⚠️ Não foi possível verificar localização do bot:", error);
    }
  }

  private validarTempo(tempoStr: string): { valido: boolean, minutos: number, formatado: string } {
    // Regex para validar formato HH:MM ou H:MM
    const regex = /^(\d{1,2}):(\d{2})$/;
    const match = tempoStr.match(regex);
    
    if (!match) {
      return { valido: false, minutos: 0, formatado: "" };
    }
    
    const horas = parseInt(match[1]);
    const minutosInput = parseInt(match[2]);
    
    // Validações
    if (horas < 0 || horas > 2 || minutosInput < 0 || minutosInput >= 60) {
      return { valido: false, minutos: 0, formatado: "" };
    }
    
    // Verificar se não excede 2:30 (2 horas e 30 minutos = 150 minutos)
    const totalMinutos = (horas * 60) + minutosInput;
    if (totalMinutos > 150) { // 2:30 = 150 minutos
      return { valido: false, minutos: 0, formatado: "" };
    }
    
    const formatado = `${horas}:${minutosInput.toString().padStart(2, '0')}`;
    
    return { valido: true, minutos: totalMinutos, formatado };
  }

  private formatarTempoRestante(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    return `[${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}]`;
  }

  private obterInfoRespawn(codigo: string): RespawnInfo {
    return this.respawns.get(codigo.toLowerCase()) || { nome: `Respawn ${codigo.toUpperCase()}`, tier: 'Tier ?' };
  }

  async adicionarClaimed(nomeUsuario: string, codigo: string, userId: string): Promise<void> {
    if (!this.teamspeak) {
      throw new Error("Bot não está conectado!");
    }

    try {
      console.log(`🔄 Adicionando ${nomeUsuario} (ID: ${userId}) ao código ${codigo} no canal Claimeds...`);
      
      // ID do canal Claimeds é 2 (descoberto anteriormente)
      const claimedChannelId = "2";
      
      // Obter descrição atual do canal Claimeds
      const channelInfo = await this.teamspeak.channelInfo(claimedChannelId);
      let descricaoAtual = channelInfo.channelDescription || "";
      
      // Criar linha de informação para o usuário
      const novaLinha = `👤 ${nomeUsuario} (ID: ${userId}) está no ${codigo.toUpperCase()}`;
      
      // Verificar se o usuário já está listado neste código
      const linhaExistente = descricaoAtual
        .split('\n')
        .find(linha => linha.includes(`(ID: ${userId})`) && linha.includes(codigo.toUpperCase()));
      
      if (linhaExistente) {
        console.log(`⚠️ Usuário ${nomeUsuario} já está registrado no código ${codigo}`);
        return;
      }
      
      // Adicionar nova linha
      let novaDescricao = descricaoAtual;
      if (novaDescricao && !novaDescricao.endsWith('\n')) {
        novaDescricao += '\n';
      }
      novaDescricao += novaLinha;
      
      // Atualizar descrição do canal
      await this.teamspeak.channelEdit(claimedChannelId, {
        channelDescription: novaDescricao
      });
      
      console.log(`✅ ${nomeUsuario} adicionado ao código ${codigo} no canal Claimeds!`);
      
    } catch (error: any) {
      console.error("❌ Erro ao adicionar claimed:", error.msg || error.message);
      throw error;
    }
  }

  async adicionarClaimedComTimer(nomeUsuario: string, codigo: string, userId: string, tempoMinutos: number): Promise<void> {
    if (!this.teamspeak) {
      throw new Error("Bot não está conectado!");
    }

    try {
      // Parar timer existente se houver
      const timerKey = `${userId}-${codigo}`;
      if (this.timers.has(timerKey)) {
        clearInterval(this.timers.get(timerKey)!.intervalId);
        this.timers.delete(timerKey);
      }

      // Obter informações do respawn
      const respawnInfo = this.obterInfoRespawn(codigo);
      const iniciadoEm = Date.now();

      console.log(`⏰ Iniciando timer de ${tempoMinutos} minutos para ${nomeUsuario} no código ${codigo} (${respawnInfo.nome})`);

      // Adicionar entrada inicial no canal (já atualiza a visualização)
      await this.atualizarClaimedComTempo(nomeUsuario, codigo, userId, tempoMinutos, respawnInfo);

      // Criar timer (atualiza a cada minuto)
      const intervalId = setInterval(async () => {
        const timer = this.timers.get(timerKey);
        if (!timer) {
          console.log(`⚠️ Timer recuperado ${timerKey} não encontrado, parando intervalo`);
          clearInterval(intervalId);
          return;
        }

        timer.tempoRestante--;
        console.log(`⏰ Timer atualizado: ${timer.userName} (${timer.codigo}) - ${timer.tempoRestante} min restantes`);

        if (timer.tempoRestante <= 0) {
          // Tempo esgotado - limpar interval primeiro antes de chamar removerClaimedAutomatico
          clearInterval(intervalId);
          this.timers.delete(timerKey);
          this.salvarTimers(); // Salvar após remoção
          console.log(`⏰ Timer expirado para ${nomeUsuario} no código ${codigo}`);
          
          // Agora chamar removerClaimedAutomatico sem conflito de timer
          await this.removerClaimedAutomatico(nomeUsuario, codigo, userId);
        } else {
          // Atualizar tempo restante a cada minuto
          const respawnInfo = this.obterInfoRespawn(timer.codigo);
          await this.atualizarClaimedComTempo(timer.userName, timer.codigo, timer.userId, timer.tempoRestante, respawnInfo);
          this.salvarTimers(); // Salvar após cada atualização
          console.log(`📊 Canal atualizado para ${timer.userName} (${timer.codigo}) - ${timer.tempoRestante} min restantes`);
        }
      }, 60000); // Atualizar a cada minuto (60000ms)

      // Armazenar o timer
      this.timers.set(timerKey, {
        userId,
        userName: nomeUsuario,
        codigo,
        nomeRespawn: respawnInfo.nome,
        tier: respawnInfo.tier,
        tempoRestante: tempoMinutos,
        intervalId,
        iniciadoEm
      });

      // Salvar timers após criação
      this.salvarTimers();

    } catch (error: any) {
      console.error("❌ Erro ao adicionar claimed com timer:", error.msg || error.message);
      throw error;
    }
  }

  private async atualizarClaimedComTempo(nomeUsuario: string, codigo: string, userId: string, tempoRestante: number, respawnInfo: RespawnInfo): Promise<void> {
    if (!this.teamspeak) return;

    try {
      const claimedChannelId = "2";
      
      // Obter descrição atual do canal Claimeds
      const channelInfo = await this.teamspeak.channelInfo(claimedChannelId);
      let descricaoAtual = channelInfo.channelDescription || "";
      
      // Separar a imagem permanente dos timers ativos
      const descricaoBase = this.obterDescricaoBaseClaimeds();
      
      // Extrair apenas as linhas de timers (ignorar a imagem permanente)
      let linhasTimers: string[] = [];
      if (descricaoAtual.includes('⏰ Timers ativos abaixo:')) {
        const partesDescricao = descricaoAtual.split('⏰ Timers ativos abaixo:\n');
        if (partesDescricao.length > 1) {
          linhasTimers = partesDescricao[1].split('\n').filter(linha => linha.trim() !== '');
        }
      }
      
      // Remover entrada existente do usuário para este código (se houver)
      const linhasFiltradas = linhasTimers.filter(linha => {
        const contemUsuario = linha.includes(`client://${userId}/${nomeUsuario}`);
        const contemCodigo = linha.startsWith(`${codigo.toLowerCase()} -`);
        return !(contemUsuario && contemCodigo);
      });
      
      // Criar nova linha com formatação BBCode
      const tempoFormatado = this.formatarTempoRestante(tempoRestante);
      const tempoComCor = `[color=#FF6600][b]${tempoFormatado}[/b][/color]`; // Laranja escuro e negrito
      const respawnFormatado = `[b]${respawnInfo.nome} (${respawnInfo.tier})[/b]`; // Negrito com cor padrão
      const usuarioFormatado = `[color=#0066CC][url=client://${userId}/${nomeUsuario}]${nomeUsuario}[/url][/color]`; // Azul com link clicável
      
      let novaLinha = `${codigo.toLowerCase()} - ${tempoComCor} ${respawnFormatado}: ${usuarioFormatado}`;
      
      // Verificar se há próximo usuário na fila para adicionar "| Next: Nome" também com link
      const filaAtual = this.nextQueues.get(codigo.toLowerCase());
      if (filaAtual && filaAtual.length > 0) {
        const proximoUsuario = filaAtual[0];
        const proximoUsuarioFormatado = `[color=#0066CC][url=client://${proximoUsuario.userId}/${proximoUsuario.userName}]${proximoUsuario.userName}[/url][/color]`;
        novaLinha += ` | Next: ${proximoUsuarioFormatado}`;
      }
      
      // Adicionar nova linha
      linhasFiltradas.push(novaLinha);
      
      // Construir descrição final: imagem + timers
      let novaDescricao = descricaoBase;
      if (linhasFiltradas.length > 0) {
        novaDescricao += linhasFiltradas.join('\n');
      }
      // Não adicionar mensagem "nenhum claimed ativo" quando há timers ativos
      
      // Atualizar descrição do canal
      await this.teamspeak.channelEdit(claimedChannelId, {
        channelDescription: novaDescricao
      });
      
    } catch (error: any) {
      console.error("❌ Erro ao atualizar claimed com tempo:", error.msg || error.message);
    }
  }

  private async removerClaimedAutomatico(nomeUsuario: string, codigo: string, userId: string): Promise<void> {
    try {
      // Apenas remover do canal Claimeds (o timer já foi removido antes de chamar este método)
      await this.atualizarTodosTimersNoCanal();
      console.log(`⏰ ${nomeUsuario} removido automaticamente do código ${codigo} (tempo esgotado)`);
      
      // Enviar poke informando que o claimed expirou
      try {
        // Buscar ID numérico real do cliente
        let clienteId = userId;
        try {
          const clients = await this.teamspeak!.clientList();
          const cliente = clients.find((c: any) => c.nickname === nomeUsuario);
          if (cliente && cliente.clid) {
            clienteId = cliente.clid.toString();
            console.log(`🔍 ID real do cliente ${nomeUsuario}: ${clienteId}`);
          }
        } catch (error) {
          console.log(`⚠️ Não foi possível buscar ID real do cliente ${nomeUsuario}`);
        }

        const respawnInfo = this.obterInfoRespawn(codigo);
        await this.enviarPoke(clienteId, `⏰ [color=#FF0000]CLAIMED EXPIRADO! Seu tempo no respawn ${respawnInfo.nome} (${codigo.toUpperCase()}) acabou!`);
        console.log(`✅ Poke de expiração enviado para ${nomeUsuario}`);
        
        // Também enviar mensagem privada com detalhes
        const mensagemExpiracao = `⏰ **CLAIMED EXPIRADO!**

Seu tempo no respawn **${respawnInfo.nome}** (${codigo.toUpperCase()}) acabou!

🎯 Status: **Finalizado**
⭐ Obrigado por usar o sistema de claimeds!

💡 Use **!resp ${codigo.toLowerCase()} [tempo]** para clamar novamente se estiver livre.[/color]`;

        await this.enviarMensagemPrivada(clienteId, mensagemExpiracao);
        
      } catch (error) {
        console.log(`⚠️ Não foi possível enviar notificação de expiração para ${nomeUsuario}`);
      }
      
      // Verificar se há próximo usuário na fila para assumir automaticamente
      const filaAtual = this.nextQueues.get(codigo.toLowerCase());
      if (filaAtual && filaAtual.length > 0) {
        const proximoUsuario = filaAtual[0];
        console.log(`� Transferindo automaticamente código ${codigo} para ${proximoUsuario.userName} por ${proximoUsuario.tempoDesejado} minutos`);
        
        // Buscar ID numérico real do cliente para enviar notificação
        let clienteId = proximoUsuario.userId;
        try {
          const clients = await this.teamspeak!.clientList();
          const cliente = clients.find((c: any) => c.nickname === proximoUsuario.userName);
          if (cliente && cliente.clid) {
            clienteId = cliente.clid.toString();
            console.log(`🔍 ID real do cliente ${proximoUsuario.userName}: ${clienteId}`);
          }
        } catch (error) {
          console.log(`⚠️ Não foi possível buscar ID real do cliente ${proximoUsuario.userName}`);
        }
        
        try {
          // Remover da fila primeiro
          await this.removerDaFilaNext(proximoUsuario.userName, proximoUsuario.codigo, proximoUsuario.userId);
          
          // Criar o claimed automaticamente com o tempo escolhido pelo usuário
          await this.adicionarClaimedComTimer(proximoUsuario.userName, proximoUsuario.codigo, proximoUsuario.userId, proximoUsuario.tempoDesejado);
          
          // Enviar notificação de que assumiu automaticamente
          try {
            const respawnInfo = this.obterInfoRespawn(codigo);
            const tempoFormatado = this.formatarTempoRestante(proximoUsuario.tempoDesejado);
            await this.enviarPoke(clienteId, `🎯 CLAIMED ASSUMIDO! Você assumiu automaticamente o respawn ${respawnInfo.nome} (${codigo.toUpperCase()}) por ${tempoFormatado}!`);
            console.log(`✅ Notificação enviada para ${proximoUsuario.userName}`);
            
            // Também enviar mensagem privada com detalhes melhorada
            const mensagem = `🎯 **CLAIMED ASSUMIDO AUTOMATICAMENTE!**

🎮 **Respawn Transferido:**
┣━ **${respawnInfo.nome}** (${codigo.toUpperCase()})
┗━ **Tier:** ${respawnInfo.tier}

⏰ **Timer Configurado:**
┣━ **Tempo:** ${tempoFormatado}
┗━ **Status:** Ativo e contando automaticamente

✨ **Sistema Automático Ativo!**
Seu claimed já está funcionando perfeitamente!

💡 Use **!leave ${codigo.toLowerCase()}** para sair quando quiser.`;

            await this.enviarMensagemPrivada(clienteId, mensagem);
            
          } catch (error) {
            console.log(`⚠️ Não foi possível enviar notificação para ${proximoUsuario.userName}`);
          }
          
          console.log(`✅ ${proximoUsuario.userName} assumiu automaticamente o código ${codigo} por ${proximoUsuario.tempoDesejado} minutos`);
          
        } catch (error) {
          console.error(`❌ Erro ao transferir claimed automaticamente para ${proximoUsuario.userName}:`, error);
          // Se falhou a transferência automática, voltar ao sistema de poke
          try {
            await this.enviarPoke(clienteId, `🎯 RESPAWN LIVRE! O respawn ${this.obterInfoRespawn(codigo).nome} (${codigo.toUpperCase()}) está disponível para caçar!`);
            await this.processarProximoDaFila(codigo);
          } catch (fallbackError) {
            console.log(`⚠️ Erro no fallback para ${proximoUsuario.userName}`);
          }
        }
      } else {
        console.log(`📭 Nenhum usuário na fila do código ${codigo} - respawn fica livre`);
      }
      
    } catch (error) {
      console.error("❌ Erro ao remover automaticamente:", error);
    }
  }

  async removerClaimed(nomeUsuario: string, codigo: string, userId: string): Promise<void> {
    if (!this.teamspeak) {
      throw new Error("Bot não está conectado!");
    }

    try {
      console.log(`🔄 Removendo ${nomeUsuario} (ID: ${userId}) do código ${codigo} no canal Claimeds...`);
      
      // Parar timer se existir
      const timerKey = `${userId}-${codigo}`;
      if (this.timers.has(timerKey)) {
        clearInterval(this.timers.get(timerKey)!.intervalId);
        this.timers.delete(timerKey);
        this.salvarTimers(); // Salvar após remoção
        console.log(`⏰ Timer cancelado para ${nomeUsuario} no código ${codigo}`);
      }
      
      // Atualizar canal com todos os timers restantes (usa a lógica padrão)
      await this.atualizarTodosTimersNoCanal();
      
      console.log(`✅ ${nomeUsuario} removido do código ${codigo} no canal Claimeds!`);
      
    } catch (error: any) {
      console.error("❌ Erro ao remover claimed:", error.msg || error.message);
      throw error;
    }
  }

  // Método para salvar cache da API Tibia em arquivo
  private async salvarCacheTibia(): Promise<void> {
    try {
      const cacheData = {
        version: '1.0',
        timestamp: this.ultimaAtualizacaoTibia,
        membrosOnline: this.membrosOnlineTibia,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.tibiaCacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cache Tibia salvo: ${this.membrosOnlineTibia.length} membros online`);
    } catch (error) {
      console.error("❌ Erro ao salvar cache Tibia:", error);
    }
  }

  // Método para carregar cache da API Tibia do arquivo
  private async carregarCacheTibia(): Promise<void> {
    try {
      if (!fs.existsSync(this.tibiaCacheFilePath)) {
        console.log("📂 Nenhum cache Tibia encontrado");
        return;
      }

      const dados = fs.readFileSync(this.tibiaCacheFilePath, 'utf8');
      const cacheData = JSON.parse(dados);
      
      if (cacheData.version && cacheData.timestamp && cacheData.membrosOnline) {
        this.ultimaAtualizacaoTibia = cacheData.timestamp;
        this.membrosOnlineTibia = cacheData.membrosOnline;
        
        const idadeCache = Math.floor((Date.now() - this.ultimaAtualizacaoTibia) / (1000 * 60));
        console.log(`📂 Cache Tibia carregado: ${this.membrosOnlineTibia.length} membros (${idadeCache} min atrás)`);
      } else {
        console.log("⚠️ Cache Tibia inválido, ignorando");
      }
    } catch (error) {
      console.error("❌ Erro ao carregar cache Tibia:", error);
    }
  }

  // ...existing code...
}

// Função para carregar configuração
function loadClientConfig(): BotClientConfig {
  try {
    const configData = require('../config.json');
    return {
      host: configData.teamspeak.host,
      serverport: configData.teamspeak.serverport,
      queryport: configData.teamspeak.queryport,
      username: configData.teamspeak.username,
      password: configData.teamspeak.password,
      nickname: configData.teamspeak.nickname,
      protocol: configData.teamspeak.protocol as "raw" | "ssh",
      channelId: configData.teamspeak.channelId || undefined
    };
  } catch (error) {
    console.error("❌ Erro ao carregar config.json:", error);
    process.exit(1);
  }
}

// Função principal para o bot cliente
async function mainClient() {
  const config = loadClientConfig();
  const bot = new TS3ClientBot(config);

  // Lidar com sinais de interrupção
  process.on('SIGINT', async () => {
    console.log("\n🛑 Interrompendo bot cliente...");
    await bot.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log("\n🛑 Terminando bot cliente...");
    await bot.disconnect();
    process.exit(0);
  });

  try {
    await bot.connect();
    
    // Mostrar status periodicamente
    setInterval(async () => {
      await bot.getStatus();
      await bot.listarClientes();
      console.log("---");
    }, 60000); // A cada 60 segundos

      console.log(`🤖 Bot cliente ${config.nickname} está ativo!`);
    console.log("💬 Usuários podem enviar mensagens privadas para interagir!");
    console.log("📝 Digite Ctrl+C para parar o bot.");
    
    // Verificar localização final do bot
    setTimeout(async () => {
      await bot.verificarLocalizacao();
    }, 2000);  } catch (error) {
    console.error("💥 Falha ao iniciar o bot cliente:", error);
    process.exit(1);
  }
}

// Executar se este arquivo for chamado diretamente
if (require.main === module) {
  mainClient();
}

export { TS3ClientBot, BotClientConfig, loadClientConfig };
