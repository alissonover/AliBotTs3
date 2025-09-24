import { TeamSpeak } from "ts3-nodejs-library";

interface BotConfig {
  host: string;
  queryport: number;
  username: string;
  password: string;
  protocol: "raw" | "ssh";
}

async function listarCanais() {
  let teamspeak: TeamSpeak | null = null;

  try {
    console.log("🔍 Conectando para listar canais...");
    
    // Carregar configuração
    const configData = require('../config.json');
    const config: BotConfig = {
      host: configData.teamspeak.host,
      queryport: configData.teamspeak.queryport,
      username: configData.teamspeak.username,
      password: configData.teamspeak.password,
      protocol: configData.teamspeak.protocol as "raw" | "ssh"
    };

    // Conectar
    teamspeak = new TeamSpeak({
      host: config.host,
      queryport: config.queryport,
      username: config.username,
      password: config.password,
      protocol: config.protocol as any
    });

    await teamspeak.connect();
    console.log("✅ Conectado ao ServerQuery!");

    // Selecionar servidor virtual
    await teamspeak.useBySid("1");
    console.log("📡 Servidor virtual selecionado!");

    // Listar canais
    const channels = await teamspeak.channelList();
    console.log(`\n📁 Canais disponíveis (${channels.length}):`);
    console.log("=" .repeat(50));
    
    channels.forEach((channel: any) => {
      console.log(`🏷️  Nome: "${channel.name || 'Sem nome'}"`);
      console.log(`🆔  ID: ${channel.cid}`);
      console.log(`🔧  Ordem: ${channel.order || 0}`);
      console.log(`👥  Max Clientes: ${channel.maxclients || 'Ilimitado'}`);
      console.log(`📂  Tipo: ${channel.flagDefault ? 'Canal Padrão' : 'Canal Normal'}`);
      if (channel.flagDefault) {
        console.log(`🎯  ⭐ ESTE É O CANAL PADRÃO! ⭐`);
      }
      console.log("-".repeat(40));
    });

    // Procurar especificamente por "Default Channel"
    const defaultChannel = channels.find((ch: any) => 
      ch.name && (
        ch.name.toLowerCase().includes('default') ||
        ch.flagDefault === "1" ||
        ch.flagDefault === 1
      )
    );

    if (defaultChannel) {
      console.log(`\n🎯 Canal padrão encontrado:`);
      console.log(`   Nome: "${defaultChannel.name}"`);
      console.log(`   ID: ${defaultChannel.cid}`);
    } else {
      console.log(`\n⚠️ Nenhum canal padrão específico encontrado.`);
      console.log(`   Usando primeiro canal disponível (ID: ${channels[0]?.cid})`);
    }

    console.log(`\n✅ Informações coletadas com sucesso!`);

  } catch (error) {
    console.error("❌ Erro ao listar canais:", error);
  } finally {
    if (teamspeak) {
      await teamspeak.quit();
      console.log("🔌 Conexão finalizada");
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  listarCanais();
}

export { listarCanais };
