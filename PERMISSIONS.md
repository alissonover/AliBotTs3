# 🔐 Configuração de Permissões para AliBotTS3

## Métodos para configurar permissões do ServerQuery

### 📋 **Opção 1: Usar serveradmin (Mais Simples)**

O usuário `serveradmin` já tem privilégios máximos. Se ainda está dando erro de permissões:

1. **Reiniciar o servidor TS3** para garantir que as permissões estejam atualizadas
2. **Verificar se o IP está na whitelist** do ServerQuery
3. **Usar a senha correta** do serveradmin

### 📋 **Opção 2: Criar usuário ServerQuery personalizado**

#### **Pelo cliente TeamSpeak 3:**

1. **Conecte como Server Admin:**
   - Abra o TeamSpeak 3 Client
   - Conecte ao seu servidor
   - Vá em `Permissions` → `Server Groups`

2. **Criar grupo para bots:**
   ```
   Nome: TS3Bots
   Tipo: Server Group
   ```

3. **Configurar permissões do grupo:**
   ```
   b_serverquery_login = true
   b_serverinstance_info_view = true
   b_virtualserver_info_view = true  
   b_virtualserver_client_list = true
   b_virtualserver_channel_list = true
   b_virtualserver_notify_register = true
   b_channel_info_view = true
   b_client_info_view = true
   i_channel_subscribe_power = 75
   i_channel_needed_subscribe_power = 0
   ```

4. **Criar usuário ServerQuery:**
   - Vá em `Tools` → `ServerQuery Login`
   - Crie um novo login com o grupo `TS3Bots`

#### **Por linha de comando (ServerQuery):**

```bash
# Conectar ao ServerQuery
telnet localhost 10011

# Fazer login como serveradmin
login serveradmin SUA_SENHA

# Usar servidor virtual 1
use 1

# Criar novo usuário ServerQuery
serverqueryadd client_login_name=alibotts3 client_login_password=SUA_SENHA_PARA_BOT

# Criar grupo de permissões para bots
servergroupadd name=TS3Bots

# Obter o SGID do grupo criado
servergrouplist

# Adicionar permissões ao grupo (substitua SGID pelo ID do grupo)
servergroupaddperm sgid=SGID permsid=b_serverquery_login permvalue=1 permnegated=0 permskip=0
servergroupaddperm sgid=SGID permsid=b_virtualserver_info_view permvalue=1 permnegated=0 permskip=0
servergroupaddperm sgid=SGID permsid=b_virtualserver_client_list permvalue=1 permnegated=0 permskip=0
servergroupaddperm sgid=SGID permsid=b_virtualserver_channel_list permvalue=1 permnegated=0 permskip=0
servergroupaddperm sgid=SGID permsid=b_virtualserver_notify_register permvalue=1 permnegated=0 permskip=0

# Adicionar usuário ao grupo
servergroupaddclient sgid=SGID cldbid=CLIENT_DATABASE_ID
```

### 📋 **Opção 3: Configurar whitelist do ServerQuery**

Edite o arquivo de configuração do servidor TS3:

```ini
# No arquivo ts3server.ini
query_ip_whitelist=127.0.0.1,::1
serverquerydocs_path=serverquerydocs/
```

### 📋 **Opção 4: Executar com permissões elevadas**

Para desenvolvimento local, você pode:

1. **Parar o servidor TS3**
2. **Executar como administrador** 
3. **Reiniciar e testar o bot**

### 🔧 **Verificar configuração atual:**

O bot agora inclui um método `configurarPermissoes()` que:
- ✅ Tenta registrar eventos automaticamente
- ✅ Mostra quais permissões estão disponíveis  
- ✅ Reporta erros de forma amigável
- ✅ Continua funcionando mesmo com permissões limitadas

### 🚨 **Solução rápida para testes:**

Se você só quer testar o bot rapidamente:

1. **Use o serveradmin** (já configurado no seu config.json)
2. **Reinicie o servidor TS3**
3. **Execute o bot** - ele deve funcionar com permissões básicas

### 📊 **Permissões mínimas necessárias:**

Para funcionalidade básica:
```
b_serverquery_login = true
b_virtualserver_info_view = true
```

Para monitorar eventos:
```
b_virtualserver_notify_register = true
b_virtualserver_client_list = true
```

Para gerenciar canais:
```
b_channel_info_view = true
b_channel_create_modify_with_codec_speex8 = true
```

### 🔄 **Testando as permissões:**

Execute o bot e verifique os logs:
- ✅ Verde: Permissão concedida
- ⚠️ Amarelo: Permissão negada (mas não crítica)  
- ❌ Vermelho: Erro crítico

O bot foi configurado para funcionar mesmo com permissões limitadas!
