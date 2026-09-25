# Publicação na Hostinger

Este repositório é uma aplicação Node.js para o recurso “Node.js Web App” da Hostinger. Se o framework estiver como “Other”, configure o arquivo de entrada como `server.js`, a pasta de saída como `.`, o build como `npm run build` e a inicialização como `npm start`. Use Node.js 22.

Cadastre `ADMIN_PASSWORD` nas variáveis de ambiente da aplicação Hostinger com a senha definida para o painel. A senha fica fora do repositório. O email de acesso é `admin@donagatta.com`.

O primeiro início cria o catálogo persistente a partir de `backups/supabase-public-data.json`. O servidor detecta a pasta persistente da Hostinger fora da pasta de cada build; localmente usa `runtime-data`. Novos uploads ficam nessa mesma área persistente. Não apague essa pasta entre implantações.

O servidor mantém os dados privados fora da pasta pública, bloqueia acesso a arquivos internos e entrega as páginas e imagens pelo próprio Node. O site não depende de PHP, da Vercel ou do Supabase em execução.
