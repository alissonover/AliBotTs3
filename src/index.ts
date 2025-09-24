import { TS3ClientBot, loadClientConfig } from './botCliente';

// Função principal
async function main() {
  // Carregar configuração do bot cliente
  const config = loadClientConfig();
  const bot = new TS3ClientBot(config);

  // Lidar com sinais de interrupção
  process.on('SIGINT', async () => {
    console.log("\n🛑 Interrompendo bot...");
    await bot.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log("\n🛑 Terminando bot...");
    await bot.disconnect();
    process.exit(0);
  });

  try {
    await bot.connect();
    
    console.log("🤖 Bot AliBotTS3 Cliente está rodando! Pressione Ctrl+C para parar.");
    
  } catch (error) {
    console.error("💥 Falha ao iniciar o bot:", error);
    process.exit(1);
  }
}

// Executar o bot se este arquivo for executado diretamente
if (require.main === module) {
  main();
}
