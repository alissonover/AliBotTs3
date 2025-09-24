# AliBotTS3 - Bot para TeamSpeak 3

Um bot desenvolvido em TypeScript para conectar-se a servidores TeamSpeak 3 usando a ServerQuery API.

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- TeamSpeak 3 Server rodando localmente
- Credenciais do ServerQuery configuradas

## 🚀 Instalação

1. Clone o repositório ou baixe o projeto
2. Instale as dependências:
```bash
npm install
```

3. Configure as credenciais no arquivo `config.json`:
```json
{
  "teamspeak": {
    "host": "127.0.0.1",
    "serverport": 9987,
    "queryport": 10011,
    "username": "serveradmin",
    "password": "SUA_SENHA_AQUI",
    "nickname": "AliBotTS3",
    "protocol": "raw",
    "virtualServerID": 1
  }
}
```

## ⚙️ Configuração do TeamSpeak 3 Server

### Obtendo as credenciais do ServerQuery

1. **Encontrar o arquivo de log do servidor:**
   - Navegue até a pasta de instalação do TeamSpeak 3 Server
   - Vá para `logs/`
   - Abra o arquivo `ts3server_*.log` mais recente

2. **Localizar a senha do serveradmin:**
   - Procure por linhas como:
   ```
   ServerAdmin password= "SUA_SENHA_AQUI"
   ```

3. **Alternativa - Resetar senha do serveradmin:**
   - Pare o servidor TeamSpeak 3
   - Execute: `./ts3server_startscript.sh start createinifile=1`
   - Uma nova senha será gerada e exibida no console

### Configurar acesso ao ServerQuery

- **Porta padrão:** 10011
- **Usuário padrão:** serveradmin  
- **Protocolo:** Raw (telnet-like)

## 🎮 Como usar

### Desenvolvimento (com hot reload):
```bash
npm run watch
```

### Executar em modo desenvolvimento:
```bash
npm run dev
```

### Compilar o projeto:
```bash
npm run build
```

### Executar versão compilada:
```bash
npm start
```

## 🔧 Scripts disponíveis

- `npm run cliente` - **[NOVO]** Executa bot cliente visível (recomendado)
- `npm run diagnostico` - Testa conexão e verifica permissões
- `npm run dev` - Executa o bot ServerQuery básico
- `npm run watch` - Executa com hot reload (nodemon)
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Executa a versão compilada
- `npm run clean` - Limpa a pasta de build

## 📊 Funcionalidades

### Funcionalidades Atuais:
- ✅ Conexão com servidor TeamSpeak 3 local
- ✅ Seleção automática do servidor virtual
- ✅ Definição de nickname personalizado
- ✅ Monitoramento de eventos (conexão/desconexão de clientes)
- ✅ Exibição de informações do servidor
- ✅ Tratamento de erros e reconexão
- ✅ Logs detalhados com emojis

### Próximas funcionalidades:
- 🔄 Reconexão automática
- 💬 Sistema de comandos via chat
- 🎵 Reprodução de áudio
- 📁 Gerenciamento de canais
- 👥 Gerenciamento de usuários

## 🐛 Solução de problemas

### Erro de conexão:
1. Verifique se o TeamSpeak 3 Server está rodando
2. Confirme se as credenciais estão corretas
3. Verifique se a porta 10011 não está bloqueada

### Erro de autenticação:
1. Verifique a senha do serveradmin
2. Tente resetar a senha do ServerQuery

### Bot não aparece no servidor:
- O bot conecta via ServerQuery, não como cliente normal
- Ele aparece na lista de consultas administrativas
- Para conectar como cliente visível, seria necessário usar TeamSpeak 3 Client SDK

## 📝 Estrutura do Projeto

```
AliBotTS3/
├── src/
│   └── index.ts          # Código principal do bot
├── dist/                 # Arquivos compilados (gerado)
├── .github/
│   └── copilot-instructions.md  # Instruções do Copilot
├── config.json           # Configurações do bot
├── package.json          # Dependências e scripts
├── tsconfig.json         # Configuração TypeScript
└── README.md             # Este arquivo
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 🆘 Suporte

Se encontrar problemas:
1. Verifique a seção de solução de problemas
2. Consulte a documentação da biblioteca ts3-nodejs-library
3. Abra uma issue no repositório
