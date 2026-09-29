<?php
// AgriMarket RW - Config & Database Helpers

// ---------- Session security ----------
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

header('Content-Type: application/json; charset=utf-8');

// ---------- CORS (same-origin assumed — no wildcard) ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'http://localhost',
    'http://localhost:80',
    'http://127.0.0.1',
    'http://localhost/agrimarket-rw'
];
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Data dir ----------
define('DATA_DIR', __DIR__ . '/../data/');

if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// ---------- JSON DB helpers ----------
function getData($file) {
    $path = DATA_DIR . $file . '.json';
    if (!file_exists($path)) return [];
    $content = file_get_contents($path);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveData($file, $data) {
    $path = DATA_DIR . $file . '.json';
    $fp = fopen($path, 'c');
    if (!$fp) return false;
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return true;
}

function generateId($prefix = 'id') {
    return $prefix . '_' . time() . '_' . bin2hex(random_bytes(4));
}

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getInput() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        respond(['error' => 'Invalid JSON body'], 400);
    }
    return is_array($data) ? $data : [];
}

function requireAuth() {
    if (empty($_SESSION['user'])) {
        respond(['error' => 'Unauthorized. Please login.'], 401);
    }
    return $_SESSION['user'];
}

function requireRole($roles) {
    $user = requireAuth();
    if (!in_array($user['role'], (array)$roles, true)) {
        respond(['error' => 'Forbidden'], 403);
    }
    return $user;
}

// ---------- Init sample data (run once) ----------
function initDatabase() {
    $flag = DATA_DIR . '.installed';
    if (file_exists($flag)) return;

    $users = getData('users');
    if (empty($users)) {
        $hash = password_hash('farmer123', PASSWORD_DEFAULT);
        $users = [
            [
                'id' => 'admin1', 'name' => 'Admin',
                'email' => 'admin@agrimarket.rw', 'phone' => '0788000000',
                'district' => 'Kigali', 'role' => 'admin',
                'password' => password_hash('admin123', PASSWORD_DEFAULT),
                'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'f1', 'name' => 'Uwimana Jean',
                'email' => 'jean@farm.rw', 'phone' => '0788111111',
                'district' => 'Northern', 'role' => 'farmer',
                'password' => $hash, 'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'f2', 'name' => 'Mukamana Claire',
                'email' => 'claire@farm.rw', 'phone' => '0788222222',
                'district' => 'Southern', 'role' => 'farmer',
                'password' => $hash, 'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'f3', 'name' => 'Habimana Eric',
                'email' => 'eric@farm.rw', 'phone' => '0788333333',
                'district' => 'Eastern', 'role' => 'farmer',
                'password' => $hash, 'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'f4', 'name' => 'Niyonsenga Marie',
                'email' => 'marie@farm.rw', 'phone' => '0788444444',
                'district' => 'Western', 'role' => 'farmer',
                'password' => $hash, 'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'f5', 'name' => 'Bizimana Paul',
                'email' => 'paul@farm.rw', 'phone' => '0788555555',
                'district' => 'Eastern', 'role' => 'farmer',
                'password' => $hash, 'status' => 'active', 'createdAt' => date('Y-m-d')
            ],
            [
                'id' => 'b1', 'name' => 'Mutesi Alice',
                'email' => 'alice@buyer.rw', 'phone' => '0788666666',
                'district' => 'Kigali', 'role' => 'buyer',
                'password' => password_hash('buyer123', PASSWORD_DEFAULT),
                'status' => 'active', 'createdAt' => date('Y-m-d')
            ]
        ];
        saveData('users', $users);
    }

    $products = getData('products');
    if (empty($products)) {
        $products = [
            ['id'=>'p1','name'=>'Ibihaza (Cabbages)','category'=>'Imboga','price'=>500,'unit'=>'kg','quantity'=>200,'farmerId'=>'f1','farmerName'=>'Uwimana Jean','district'=>'Northern','location'=>'Musanze','description'=>'Ibihaza byiza byavuye mu mirima ya Musanze.','icon'=>'🥬','badge'=>'Bishya','status'=>'active','createdAt'=>'2026-09-15'],
            ['id'=>'p2','name'=>'Amashaza (Beans)','category'=>'Ibinyampeke','price'=>1200,'unit'=>'kg','quantity'=>500,'farmerId'=>'f2','farmerName'=>'Mukamana Claire','district'=>'Southern','location'=>'Huye','description'=>'Amashaza meza y\'ubwoko bwa red beans.','icon'=>'🫘','badge'=>null,'status'=>'active','createdAt'=>'2026-09-14'],
            ['id'=>'p3','name'=>'Ibijumba (Sweet Potatoes)','category'=>'Imyumbati','price'=>400,'unit'=>'kg','quantity'=>300,'farmerId'=>'f1','farmerName'=>'Uwimana Jean','district'=>'Northern','location'=>'Musanze','description'=>'Ibijumba byiza by\'ubwoko bwa orange flesh.','icon'=>'🍠','badge'=>'Popular','status'=>'active','createdAt'=>'2026-09-13'],
            ['id'=>'p4','name'=>'Imineke (Bananas)','category'=>'Imyaka','price'=>800,'unit'=>'bunch','quantity'=>50,'farmerId'=>'f3','farmerName'=>'Habimana Eric','district'=>'Eastern','location'=>'Kayonza','description'=>'Imineke myiza y\'ubwoko bwa apple bananas.','icon'=>'🍌','badge'=>null,'status'=>'active','createdAt'=>'2026-09-12'],
            ['id'=>'p5','name'=>'Amata y\'inka (Fresh Milk)','category'=>'Amata','price'=>600,'unit'=>'liter','quantity'=>100,'farmerId'=>'f4','farmerName'=>'Niyonsenga Marie','district'=>'Western','location'=>'Rubavu','description'=>'Amata meza y\'inka zitungwa neza.','icon'=>'🥛','badge'=>'Fresh','status'=>'active','createdAt'=>'2026-09-16'],
            ['id'=>'p6','name'=>'Tomatisi (Tomatoes)','category'=>'Imboga','price'=>700,'unit'=>'kg','quantity'=>150,'farmerId'=>'f2','farmerName'=>'Mukamana Claire','district'=>'Southern','location'=>'Huye','description'=>'Tomatisi nziza zikomoka ku mirima ya Huye.','icon'=>'🍅','badge'=>'Bishya','status'=>'active','createdAt'=>'2026-09-17'],
            ['id'=>'p7','name'=>'Ibigori (Maize)','category'=>'Ibinyampeke','price'=>450,'unit'=>'kg','quantity'=>1000,'farmerId'=>'f5','farmerName'=>'Bizimana Paul','district'=>'Eastern','location'=>'Nyagatare','description'=>'Ibigori byiza by\'ubwoko bwa hybrid.','icon'=>'🌽','badge'=>null,'status'=>'active','createdAt'=>'2026-09-10'],
            ['id'=>'p8','name'=>'Amacunga (Oranges)','category'=>'Imyaka','price'=>1500,'unit'=>'kg','quantity'=>80,'farmerId'=>'f3','farmerName'=>'Habimana Eric','district'=>'Eastern','location'=>'Kayonza','description'=>'Amacunga meza y\'ubwoko bwa Valencia.','icon'=>'🍊','badge'=>'Popular','status'=>'active','createdAt'=>'2026-09-11']
        ];
        saveData('products', $products);
    }

    if (empty(getData('orders'))) saveData('orders', []);

    file_put_contents($flag, '1');
}

initDatabase();