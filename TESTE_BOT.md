# 🧪 Testando o Bot Cliente AliBotTS3

## 🚀 **Passo a Passo para Testar**

### **1. Iniciar o Bot:**
```bash
cd C:\Users\aliss\OneDrive\Documentos\AliBotTibia\AliBotTs3
npm run cliente
```

**Saída esperada:**
```
🤖 Iniciando conexão como cliente visível...
✅ Conectado ao ServerQuery!
📡 Servidor virtual selecionado!
👤 Criando presença visível do bot...
🆔 ID do bot: 7
💬 Configurando sistema de mensagens...
✅ Eventos de mensagem privada registrados!
🤖 Bot cliente AliBotTTestes está ativo!
💬 Usuários podem enviar mensagens privadas para interagir!
```

### **2. No TeamSpeak 3 Client:**

1. **Abra seu TeamSpeak 3**
2. **Conecte ao servidor localhost:9987**
3. **Procure pelo bot** na lista de usuários (nome: "AliBotTTestes")
4. **Clique com botão direito** no bot → **Enviar Mensagem**

### **3. Comandos para Testar:**

#### **Teste Básico:**
```
Você digita: !ping
Bot responde: 🏓 Pong! Bot está funcionando perfeitamente!
```

#### **Teste de Informações:**
```
Você digita: !info  
Bot responde: 📊 Informações do servidor:
              Nome: TeamSpeak ]I[ Server
              Clientes online: 2/32
              Uptime: 1 horas
```

#### **Teste de Ajuda:**
```
Você digita: !help
Bot responde: 🤖 **AliBotTS3 - Comandos Disponíveis**
              
              📋 **Informações:**
              • !info - Informações do servidor
              • !status - Status do bot
              ...
```

#### **Teste de Lista:**
```
Você digita: !usuarios
Bot responde: 👥 Usuários online (2):
              • Cliente ID: 1
              • Cliente ID: 7
```

### **4. Boas-vindas Automáticas:**

**Quando um novo usuário conecta:**
- O bot automaticamente detecta
- Envia mensagem de boas-vindas após 3 segundos
- Explica como usar os comandos

### **5. Logs do Bot:**

**No terminal, você verá:**
```
💬 Mensagem recebida de SeuNick: "!ping"
📤 Mensagem enviada para cliente 1: "🏓 Pong! Bot está funcionando perfeitamente!"
✅ Bot ativo - ID: 7 | Servidor: 1
👥 Clientes conectados (2):
   • ID: 1
   • ID: 7
```

## ✅ **Checklist de Teste:**

- [ ] Bot aparece na lista de usuários do TS3
- [ ] Consegue enviar mensagem privada para o bot  
- [ ] `!ping` retorna "Pong!"
- [ ] `!help` mostra lista de comandos
- [ ] `!info` mostra informações do servidor
- [ ] `!time` mostra horário atual
- [ ] Bot envia boas-vindas para novos usuários
- [ ] Logs aparecem no terminal

## 🚨 **Problemas Comuns:**

### **Bot não aparece no TS3:**
- Verifique se está rodando: `npm run cliente`
- Confirme conexão: deve mostrar "✅ Conectado ao ServerQuery!"

### **Não consegue enviar mensagem:**
- Certifique-se de usar **mensagem privada** (não canal)
- Verifique se você está no mesmo servidor

### **Comandos não funcionam:**
- Use o prefixo `!` (exemplo: `!ping`, não `ping`)
- Comandos são sensíveis a maiúsculas/minúsculas

### **Bot não responde:**
- Verifique os logs no terminal
- Teste com `!ping` primeiro
- Confirme se eventos estão registrados

## 🎯 **Teste Avançado:**

### **Simular Múltiplos Usuários:**
1. Abra várias instâncias do TS3 Client
2. Conecte com nomes diferentes  
3. Teste comandos de cada cliente
4. Verifique se o bot responde individualmente

### **Teste de Performance:**
```bash
# Deixar rodando e monitorar
npm run cliente

# Em outro terminal, verificar uso de recursos
tasklist | findstr node
```

---

**🎉 Se todos os testes passarem, seu bot está 100% funcional!**

Para parar o bot: `Ctrl+C` no terminal
