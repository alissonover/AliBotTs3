<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Instruções do Copilot para AliBotTS3

## Contexto do Projeto
Este é um projeto de bot para TeamSpeak 3 desenvolvido em TypeScript/Node.js. O bot conecta-se a um servidor TeamSpeak 3 local usando a biblioteca `ts3-nodejs-library`.

## Diretrizes de Desenvolvimento

### Arquitetura
- Use TypeScript para type safety
- Implemente padrões orientados a objetos
- Mantenha configurações em arquivos JSON separados
- Use async/await para operações assíncronas

### Estilo de Código
- Use nomes descritivos em português para variáveis e métodos
- Adicione emojis nos console.log para melhor visualização
- Implemente error handling robusto
- Use interfaces TypeScript para definir contratos

### TeamSpeak 3 Específico
- Use ServerQuery API através da biblioteca ts3-nodejs-library
- Implemente reconexão automática em caso de falha
- Monitore eventos de conexão/desconexão de clientes
- Mantenha logs detalhados das operações

### Segurança
- Nunca commite senhas ou credenciais no código
- Use variáveis de ambiente para dados sensíveis
- Valide todas as entradas de usuário
