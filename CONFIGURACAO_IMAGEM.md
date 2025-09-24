# 🖼️ Configuração de Imagem Permanente - Canal Claimeds

## 📋 Funcionalidade Implementada

### ✅ **Imagem Permanente no Topo**
O canal "Claimeds" agora possui uma imagem permanente que sempre aparece no topo, independente dos timers ativos.

## 🔧 Como Personalizar a Imagem

### 📁 **Localização no Código**
Arquivo: `src/botCliente.ts`
Propriedade: `imagemClaimeds`

### 🎨 **Formato Atual**
```typescript
private readonly imagemClaimeds = `[img]https://i.imgur.com/YourImageHere.png[/img]

🎯 **SISTEMA DE CLAIMEDS - ALIBOT** 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ **Respawns Ativos** ⚔️
📋 Use: [b]!resp [código] [tempo][/b]
🚪 Use: [b]!leave [código][/b]
⏰ Timers ativos abaixo:

`;
```

## 📝 **Passos para Personalizar**

### 1️⃣ **Fazer Upload da Imagem**
- Faça upload da sua imagem para um serviço como:
  - **Imgur** (imgur.com) - Recomendado
  - **Discord** (cdn.discordapp.com)
  - **Google Drive** (drive.google.com)
  - Qualquer hospedagem de imagens

### 2️⃣ **Obter URL da Imagem**
- Copie a URL direta da imagem
- Exemplo: `https://i.imgur.com/abc123.png`
- **Importante**: A URL deve terminar com a extensão da imagem (.png, .jpg, .gif)

### 3️⃣ **Editar o Código**
1. Abra o arquivo `src/botCliente.ts`
2. Encontre a propriedade `imagemClaimeds`
3. Substitua `https://i.imgur.com/YourImageHere.png` pela sua URL
4. Salve o arquivo

### 4️⃣ **Aplicar as Mudanças**
```bash
# Parar o bot
Ctrl+C

# Compilar
npx tsc

# Reiniciar o bot
npm run cliente
```

## 🎨 **Personalizações Avançadas**

### 🖼️ **Diferentes Formatos de Imagem**
```typescript
// Imagem simples
[img]https://sua-url.com/imagem.png[/img]

// Imagem com link
[url=https://seu-site.com][img]https://sua-url.com/imagem.png[/img][/url]
```

### 🎭 **Personalizar Texto e Formatação**
```typescript
private readonly imagemClaimeds = `[img]https://sua-imagem.png[/img]

[center]🏰 **SEU GUILD - SISTEMA DE CLAIMS** 🏰[/center]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[color=red]⚔️[/color] **Respawns em Andamento** [color=red]⚔️[/color]

[size=10]📌 [b]Comandos Disponíveis:[/b]
• [b]!resp [código] [tempo][/b] - Claimar respawn
• [b]!leave [código][/b] - Sair do respawn
• [b]!timers[/b] - Ver todos os timers[/size]

⏰ **Timers Ativos:**

`;
```

### 🌈 **Códigos de Formatação BBCode**
```
[b]Negrito[/b]
[i]Itálico[/i]
[u]Sublinhado[/u]
[color=red]Texto Vermelho[/color]
[size=14]Texto Grande[/size]
[center]Texto Centralizado[/center]
[url=link]Texto com Link[/url]
```

## 📊 **Exemplos de URLs de Imagem**

### ✅ **URLs Válidas**
```
https://i.imgur.com/abc123.png
https://cdn.discordapp.com/attachments/.../image.jpg
https://drive.google.com/.../image.gif
```

### ❌ **URLs Inválidas**
```
https://imgur.com/abc123 (sem extensão)
https://example.com/page.html (não é imagem)
file:///local/image.png (arquivo local)
```

## 🔄 **Funcionalidade Automática**

### ✅ **O que Acontece Automaticamente**
- ✅ Imagem sempre aparece no topo
- ✅ Timers aparecem abaixo da imagem
- ✅ Imagem persiste mesmo sem timers ativos
- ✅ Formatação é preservada ao adicionar/remover timers
- ✅ Canal é inicializado com imagem na primeira execução

### 🎯 **Estrutura Final no Canal**
```
[IMAGEM PERMANENTE]

🎯 **SISTEMA DE CLAIMEDS - ALIBOT** 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ **Respawns Ativos** ⚔️
📋 Use: !resp [código] [tempo]
🚪 Use: !leave [código]
⏰ Timers ativos abaixo:

f4 - [01:30] Cobra Castelo (Tier 1): Jogador1
a1 - [00:45] Dragão Vermelho (Tier 2): Jogador2
```

## 🛡️ **Problemas Comuns e Soluções**

### ❓ **Imagem não aparece**
- Verifique se a URL está correta
- Confirme que a URL termina com extensão de imagem
- Teste a URL no navegador

### ❓ **Formatação quebrada**
- Verifique se todos os códigos BBCode estão fechados
- Confirme que não há caracteres especiais não escapados

### ❓ **Mudanças não aplicadas**
- Pare o bot com Ctrl+C
- Compile com `npx tsc`
- Reinicie com `npm run cliente`

---

**🎯 Agora você pode personalizar completamente a aparência do canal Claimeds!**
