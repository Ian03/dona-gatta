# Publicação na Hostinger

Este site agora usa PHP no painel e não precisa de funções da Vercel ou Vercel Blob. Configure a hospedagem para usar PHP 8.1 ou superior.

Envie os arquivos do site para a pasta raiz do domínio, incluindo os arquivos ocultos `.htaccess` e as pastas `api`, `private`, `uploads`, `assets` e `backups`. O arquivo `backups/supabase-public-data.json` é usado apenas na primeira leitura para criar `private/catalog.json` com as coleções atuais. Depois de confirmar que o catálogo aparece no site e no painel, esse backup pode ser removido da hospedagem.

O PHP precisa ter permissão de escrita em `private` e `uploads`. A pasta `private` contém o catálogo e a configuração da senha; as regras de acesso dessa pasta e dos backups estão nos respectivos `.htaccess`.

O painel fica em `admin.html` e usa o email `admin@donagatta.com`. A senha inicial foi entregue junto com a migração. Para trocar a senha, calcule o SHA-256 da nova senha em UTF-8 e substitua `ADMIN_PASSWORD_SHA256` em `private/admin-config.php`.

As imagens já existentes foram apontadas para os arquivos locais em `assets/otimizadas/Verao`. Novos envios pelo painel serão gravados em `uploads`.
