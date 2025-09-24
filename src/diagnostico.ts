import { TeamSpeak } from "ts3-nodejs-library";

// Script de diagnóstico para verificar conexão e permissões do TeamSpeak 3

async function diagnosticarConexao() {
  console.log("🔍 Iniciando diagnóstico de conexão TeamSpeak 3...\n");

  // Carregar configuração
  let config;
  try {
    config = require('../config.json').teamspeak;
    console.log("✅ Configuração carregada:");
    console.log(`   Host: ${config.host}`);
    console.log(`   Porta do servidor: ${config.serverport}`);
    console.log(`   Porta do query: ${config.queryport}`);
    console.log(`   Usuário: ${config.username}`);
    console.log(`   Protocolo: ${config.protocol}\n`);
  } catch (error) {
    console.error("❌ Erro ao carregar configuração:", error);
    return;
  }

  // Testar conexão básica
  let teamspeak: TeamSpeak | null = null;
  
  try {
    console.log("🔌 Testando conexão básica...");
    teamspeak = new TeamSpeak({
      host: config.host,
      queryport: config.queryport,
      protocol: config.protocol as any,
      username: config.username,
      password: config.password,
      nickname: "DiagnosticBot"
    });

    await teamspeak.connect();
    console.log("✅ Conexão estabelecida com sucesso!\n");

    // Verificar informações do usuário
    try {
      console.log("👤 Verificando informações do usuário...");
      const whoami = await teamspeak.whoami();
      console.log(`✅ Logado como: ${whoami.clientLoginName || 'N/A'}`);
      console.log(`   ID do cliente: ${whoami.clientId}`);
      console.log(`   ID do servidor virtual: ${whoami.virtualserverId}`);
      console.log(`   Porta única ID: ${whoami.clientUniqueIdentifier || 'N/A'}\n`);
    } catch (error: any) {
      console.error("❌ Erro ao obter informações do usuário:", error.msg || error.message);
    }

    // Tentar selecionar servidor virtual
    try {
      console.log("🏗️ Selecionando servidor virtual...");
      await teamspeak.useBySid("1");
      console.log("✅ Servidor virtual 1 selecionado com sucesso!\n");
    } catch (error: any) {
      console.error("❌ Erro ao selecionar servidor virtual:", error.msg || error.message);
    }

    // Testar permissões básicas
    console.log("🔐 Testando permissões básicas...\n");
    
    // Informações do servidor
    try {
      console.log("📊 Obtendo informações do servidor...");
      const serverInfo = await teamspeak.serverInfo();
      console.log(`✅ Nome do servidor: ${serverInfo.virtualserverName}`);
      console.log(`   Clientes online: ${serverInfo.virtualserverClientsOnline}/${serverInfo.virtualserverMaxclients}`);
      console.log(`   Uptime: ${Math.floor(Number(serverInfo.virtualserverUptime) / 3600)} horas\n`);
    } catch (error: any) {
      console.error("❌ Sem permissão para ver informações do servidor:", error.msg || error.message);
    }

    // Lista de clientes
    try {
      console.log("👥 Obtendo lista de clientes...");
      const clients = await teamspeak.clientList();
      console.log(`✅ Encontrados ${clients.length} clientes conectados:`);
      clients.forEach(client => {
        console.log(`   - Cliente ID: ${client.clid}`);
      });
      console.log();
    } catch (error: any) {
      console.error("❌ Sem permissão para listar clientes:", error.msg || error.message);
    }

    // Lista de canais
    try {
      console.log("📁 Obtendo lista de canais...");
      const channels = await teamspeak.channelList();
      console.log(`✅ Encontrados ${channels.length} canais:`);
      channels.forEach(channel => {
        console.log(`   - Canal ID: ${channel.cid}`);
      });
      console.log();
    } catch (error: any) {
      console.error("❌ Sem permissão para listar canais:", error.msg || error.message);
    }

    // Testar registro de eventos
    console.log("📡 Testando registro de eventos...\n");
    
    try {
      await teamspeak.registerEvent("server");
      console.log("✅ Eventos de servidor registrados com sucesso!");
    } catch (error: any) {
      console.error("❌ Não foi possível registrar eventos de servidor:", error.msg || error.message);
    }

    try {
      await teamspeak.registerEvent("channel", "0");
      console.log("✅ Eventos de canal registrados com sucesso!");
    } catch (error: any) {
      console.error("❌ Não foi possível registrar eventos de canal:", error.msg || error.message);
    }

    console.log("\n🎉 Diagnóstico concluído! Verifique os resultados acima.");

  } catch (error: any) {
    console.error("❌ Erro de conexão:", error.msg || error.message);
    
    if (error.id === "520") {
      console.log("\n💡 Dicas para resolver erro de login:");
      console.log("   1. Verifique se a senha do serveradmin está correta");
      console.log("   2. Tente obter nova senha reiniciando o servidor TS3");
      console.log("   3. Verifique os logs do servidor TS3 para a senha atual");
      console.log("   4. Considere criar um usuário ServerQuery dedicado");
    }
  } finally {
    if (teamspeak) {
      await teamspeak.quit();
      console.log("🔌 Conexão fechada.");
    }
  }
}

// Executar diagnóstico se este arquivo for chamado diretamente
if (require.main === module) {
  diagnosticarConexao().catch(console.error);
}

export { diagnosticarConexao };
