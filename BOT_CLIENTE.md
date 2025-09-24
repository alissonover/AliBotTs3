# 🤖 Bot Cliente AliBotTS3 - Guia de Uso

## 🎯 **O que é o Bot Cliente?**

O Bot Cliente é uma versão avançada do AliBotTS3 que aparece como um **cliente visível** no servidor TeamSpeak 3, permitindo que outros usuários interajam com ele através de **mensagens privadas**.

## ⭐ **Funcionalidades Principais**

### 💬 **Sistema de Mensagens Privadas**
- ✅ Recebe mensagens privadas de qualquer usuário
- ✅ Responde automaticamente com comandos úteis
- ✅ Sistema de comandos inteligente com prefixo `!`

### 🤖 **Comandos Disponíveis**

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!help` ou `!ajuda` | Mostra lista de comandos | `!help` |
| `!info` | Informações do servidor | `!info` |
| `!time` ou `!hora` | Horário atual | `!time` |
| `!ping` | Teste de resposta | `!ping` |
| `!status` | Status do bot | `!status` |
| `!canais` | Lista todos os canais | `!canais` |
| `!comandos` | Lista completa de comandos | `!comandos` |

### 👋 **Sistema de Boas-vindas**
- ✅ Detecta novos usuários automaticamente
- ✅ Envia mensagem de boas-vindas personalizada
- ✅ Explica como interagir com o bot

## 🚀 **Como Usar**

### **1. Iniciar o Bot Cliente:**
```bash
npm run cliente
```

### **2. No TeamSpeak 3:**
- O bot aparecerá como um usuário normal no servidor
- Envie uma **mensagem privada** para o bot
- Digite `!help` para ver todos os comandos

### **3. Exemplo de Interação:**
```
Você: !info
Bot: 📊 Informações do servidor:
     Nome: TeamSpeak ]I[ Server
     Clientes online: 3/32
     Uptime: 2 horas

Você: !ping
Bot: 🏓 Pong! Bot está funcionando perfeitamente!
```

## 🔧 **Configuração**

### **Arquivo config.json:**
```json
{
  "teamspeak": {
    "host": "localhost",
    "serverport": 9987,
    "queryport": 10011,
    "username": "serveradmin", 
    "password": "sua_senha_aqui",
    "nickname": "AliBotTTestes",
    "protocol": "raw",
    "channelId": "1"  // Canal onde o bot deve ficar (opcional)
  }
}
```

### **Configurações Opcionais:**
- `channelId`: Define o canal onde o bot ficará inicialmente
- `nickname`: Nome que aparecerá no TeamSpeak 3

## 📊 **Monitoramento**

### **Logs do Bot:**
- ✅ `👤 Novo cliente conectado` - Detecta novos usuários
- ✅ `💬 Mensagem recebida` - Mostra mensagens recebidas  
- ✅ `📤 Mensagem enviada` - Confirma envio de respostas
- ✅ `✅ Bot ativo` - Status periódico do bot

### **Status Automático:**
O bot reporta status a cada 60 segundos:
```
✅ Bot ativo - ID: 7 | Servidor: 1
👥 Clientes conectados (3):
   • ID: 1
   • ID: 6  
   • ID: 7
---
```

## 🆚 **Diferenças: Bot Cliente vs Bot ServerQuery**

| Aspecto | Bot Cliente | Bot ServerQuery |
|---------|-------------|-----------------|
| **Visibilidade** | ✅ Aparece na lista de usuários | ❌ Invisível para usuários |
| **Mensagens Privadas** | ✅ Recebe e responde | ❌ Não suportado |
| **Interação com Usuários** | ✅ Completa | ❌ Limitada |
| **Comandos** | ✅ Sistema completo | ❌ Apenas administrativo |
| **Presença Visual** | ✅ Como usuário normal | ❌ Apenas nos logs |

## 🚨 **Solução de Problemas**

### **Bot não aparece no servidor:**
1. Verifique se a senha está correta
2. Execute: `npm run diagnostico`
3. Confirme se o ServerQuery tem permissões

### **Não recebe mensagens:**
1. Verifique se os eventos estão registrados
2. Confirme se o usuário está enviando mensagem **privada**
3. Verifique os logs do bot

### **Comandos não funcionam:**
1. Certifique-se de usar o prefixo `!`
2. Digite `!help` para testar
3. Verifique se o bot tem permissões no servidor

## 🎮 **Scripts Disponíveis**

```bash
npm run cliente      # Executar bot cliente visível
npm run dev          # Executar bot ServerQuery básico  
npm run diagnostico  # Testar conexão e permissões
npm run watch        # Bot cliente com hot reload
npm run build        # Compilar projeto
```

## 🔄 **Reinicialização Automática**

Para manter o bot sempre online, use um gerenciador de processo:

### **Método 1 - Nodemon (desenvolvimento):**
```bash
nodemon --exec "npm run cliente"
```

### **Método 2 - PM2 (produção):**
```bash
npm install -g pm2
pm2 start "npm run cliente" --name "alibotts3"
pm2 startup
pm2 save
```

## 🎯 **Próximas Funcionalidades**

### **Em Desenvolvimento:**
- 🔄 Sistema de permissões por usuário
- 📝 Comandos administrativos avançados
- 🎵 Reprodução de áudio/música
- 📊 Estatísticas detalhadas do servidor
- 💾 Banco de dados para configurações personalizadas

### **Planejado:**
- 🎮 Jogos interativos via chat
- 📅 Sistema de agendamento 
- 🔔 Notificações automáticas
- 👥 Gerenciamento de grupos

---

**🤖 AliBotTS3 Cliente - Trazendo interatividade ao seu TeamSpeak 3!** 

Para suporte, verifique os logs ou execute `npm run diagnostico`.
