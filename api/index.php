<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/private/admin-config.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

function respond(array $body, int $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function start_admin_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('dona_gatta_admin');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
}

function require_admin(): void {
    start_admin_session();
    if (empty($_SESSION['admin'])) respond(['error' => 'Não autorizado. Faça login novamente.'], 401);
}

function fix_text($value) {
    if (!is_string($value) || !preg_match('/[ÃÂ]/u', $value)) return $value;
    $fixed = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $value);
    return $fixed === false ? $value : $fixed;
}

function normalize_name(string $name): string {
    $name = preg_replace('/^Modelo\s+/iu', '', (string) fix_text($name));
    $name = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name;
    return strtoupper(preg_replace('/[^A-Z0-9]/i', '', $name));
}

function local_image_path(string $folder, int $number, string $type): string {
    $parts = array_map('rawurlencode', ['assets', 'otimizadas', 'Verao', $folder, sprintf('%02d-%s.webp', $number, $type)]);
    return '/' . implode('/', $parts);
}

function initial_catalog(): array {
    $backupPath = dirname(__DIR__) . '/backups/supabase-public-data.json';
    if (!is_file($backupPath)) return ['collections' => []];
    $source = json_decode((string) file_get_contents($backupPath), true);
    $backup = $source['backup'] ?? null;
    if (!is_array($backup)) return ['collections' => []];
    $models = [
        ['all-inclusive', 'ALL INCLUSIVE'], ['beach-club', 'BEACH CLUB'], ['capri', 'CAPRI'],
        ['check-in', 'CHECK IN'], ['day-use', 'DAY USE'], ['escape', 'ESCAPE'], ['lounge', 'LOUNGE'],
        ['MAR', 'MARÉ'], ['RESORT', 'RESORT'], ['SUNSET', 'SUNSET']
    ];
    $collections = $backup['colecoes'] ?? [];
    $variations = $backup['variacoes'] ?? [];
    $output = [];
    foreach ($models as [$matchName, $folder]) {
        $collection = null;
        foreach ($collections as $candidate) {
            if (strpos(normalize_name((string) ($candidate['nome'] ?? '')), normalize_name($matchName)) !== false) { $collection = $candidate; break; }
        }
        if (!$collection) continue;
        $rows = array_values(array_filter($variations, fn($row) => (string) ($row['colecao_id'] ?? '') === (string) $collection['id']));
        usort($rows, fn($a, $b) => strcmp((string) ($a['created_at'] ?? ''), (string) ($b['created_at'] ?? '')));
        $mapped = [];
        foreach ($rows as $index => $row) {
            $number = $index + 1;
            $mapped[] = [
                'id' => (string) ($row['id'] ?? bin2hex(random_bytes(16))),
                'colecao_id' => (string) $collection['id'], 'created_at' => $row['created_at'] ?? gmdate('c'),
                'descricao' => fix_text($row['descricao'] ?? sprintf('Variação %02d', $number)),
                'valor_vista' => fix_text($row['valor_vista'] ?? ''), 'valor_parcelado' => fix_text($row['valor_parcelado'] ?? ''),
                'imagem_url' => local_image_path($folder, $number, 'detail')
            ];
        }
        $output[] = [
            'id' => (string) $collection['id'], 'nome' => fix_text($collection['nome'] ?? $folder),
            'created_at' => $collection['created_at'] ?? gmdate('c'),
            'catalogo_eyebrow' => fix_text($collection['catalogo_eyebrow'] ?? 'Coleção DESTINOS'),
            'catalogo_intro' => fix_text($collection['catalogo_intro'] ?? ''),
            'parcelamento_maximo' => (int) ($collection['parcelamento_maximo'] ?? 5),
            'capa_url' => local_image_path($folder, 1, 'card'), 'variacoes' => $mapped
        ];
    }
    return ['version' => 1, 'updated_at' => gmdate('c'), 'collections' => $output];
}

function read_catalog(): array {
    $path = dirname(__DIR__) . '/private/catalog.json';
    if (!is_file($path)) {
        $catalog = initial_catalog();
        file_put_contents($path, json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    }
    $decoded = json_decode((string) @file_get_contents($path), true);
    return is_array($decoded) && is_array($decoded['collections'] ?? null) ? $decoded : ['version' => 1, 'collections' => []];
}

function save_catalog(array $collections): array {
    $catalog = ['version' => 1, 'updated_at' => gmdate('c'), 'collections' => array_values($collections)];
    $path = dirname(__DIR__) . '/private/catalog.json';
    $json = json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false || file_put_contents($path, $json, LOCK_EX) === false) respond(['error' => 'Não foi possível gravar o catálogo. Verifique as permissões da pasta private.'], 500);
    return $catalog;
}

function handle_upload() {
    require_admin();
    $file = $_FILES['file'] ?? null;
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || $file['size'] > 8 * 1024 * 1024) respond(['error' => 'Envie uma imagem de até 8 MB.'], 400);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime]) || @getimagesize($file['tmp_name']) === false) respond(['error' => 'Envie apenas JPG, PNG ou WEBP.'], 400);
    $bucket = basename((string) ($_POST['bucket'] ?? 'imagens'));
    if (!in_array($bucket, ['capas', 'variacoes'], true)) $bucket = 'imagens';
    $directory = dirname(__DIR__) . '/uploads/' . $bucket;
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) respond(['error' => 'Não foi possível criar a pasta de imagens.'], 500);
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $filename)) respond(['error' => 'Não foi possível salvar a imagem.'], 500);
    respond(['path' => $bucket . '/' . $filename, 'url' => '/uploads/' . rawurlencode($bucket) . '/' . rawurlencode($filename)], 201);
}

start_admin_session();
$action = (string) ($_GET['action'] ?? '');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($action === 'login' && $method === 'POST') {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $hash = hash('sha256', (string) ($body['password'] ?? ''));
    if ($email !== 'admin@donagatta.com' || !hash_equals(ADMIN_PASSWORD_SHA256, $hash)) respond(['error' => 'Email ou senha incorretos.'], 401);
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    respond(['ok' => true]);
}
if ($action === 'logout' && $method === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    }
    session_destroy();
    respond(['ok' => true]);
}
if ($action === 'session' && $method === 'GET') respond(['authenticated' => !empty($_SESSION['admin'])]);
if ($action === 'catalog' && $method === 'GET') respond(read_catalog());
if ($action === 'catalog' && $method === 'PUT') {
    require_admin();
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    if (!is_array($body['collections'] ?? null)) respond(['error' => 'Formato de catálogo inválido.'], 400);
    respond(save_catalog($body['collections']));
}
if ($action === 'upload' && $method === 'POST') handle_upload();
respond(['error' => 'Rota não encontrada.'], 404);
