<?php
require_once 'config.php';

$user = requireRole(['admin']); // Only admins
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ============ OVERVIEW STATS ============
if ($action === 'overview' && $method === 'GET') {
    $users = getData('users');
    $products = getData('products');
    $orders = getData('orders');

    $totalRevenue = 0;
    $pendingOrders = 0;
    foreach ($orders as $o) {
        if (($o['status'] ?? 'pending') === 'pending') $pendingOrders++;
        if (($o['status'] ?? '') !== 'cancelled') {
            $totalRevenue += $o['total'] ?? 0;
        }
    }

    $roleCounts = ['admin' => 0, 'farmer' => 0, 'buyer' => 0];
    foreach ($users as $u) {
        $roleCounts[$u['role']] = ($roleCounts[$u['role']] ?? 0) + 1;
    }

    respond([
        'success' => true,
        'stats' => [
            'users'         => count($users),
            'farmers'       => $roleCounts['farmer'],
            'buyers'        => $roleCounts['buyer'],
            'admins'        => $roleCounts['admin'],
            'products'      => count($products),
            'orders'        => count($orders),
            'pendingOrders' => $pendingOrders,
            'revenue'       => $totalRevenue,
        ]
    ]);
}

// ============ LIST ALL USERS ============
if ($action === 'users' && $method === 'GET') {
    $users = getData('users');
    $role = $_GET['role'] ?? '';
    $search = trim($_GET['search'] ?? '');

    if ($role && $role !== 'all') {
        $users = array_filter($users, fn($u) => $u['role'] === $role);
    }
    if ($search !== '') {
        $q = mb_strtolower($search);
        $users = array_filter($users, function($u) use ($q) {
            return mb_strpos(mb_strtolower($u['name']), $q) !== false
                || mb_strpos(mb_strtolower($u['email']), $q) !== false
                || mb_strpos(mb_strtolower($u['phone'] ?? ''), $q) !== false;
        });
    }

    // Strip passwords
    $users = array_values(array_map(function($u) {
        unset($u['password']);
        return $u;
    }, $users));

    usort($users, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));

    respond(['success' => true, 'users' => $users]);
}

// ============ SUSPEND / ACTIVATE USER ============
if ($action === 'user-status' && $method === 'POST') {
    $input = getInput();
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? '';

    if (!in_array($status, ['active', 'suspended'], true)) {
        respond(['error' => 'Status ntariyo mu rutonde'], 400);
    }
    if ($id === $user['id']) {
        respond(['error' => 'Ntushobora guhindura konti yawe bwite'], 400);
    }

    $users = getData('users');
    $found = false;
    foreach ($users as &$u) {
        if ($u['id'] === $id) {
            if ($u['role'] === 'admin') {
                respond(['error' => 'Ntushobora guhagarika admin mwenzako'], 403);
            }
            $u['status'] = $status;
            $found = true;
            break;
        }
    }
    unset($u);

    if (!$found) respond(['error' => 'Umukoresha ntabonetse'], 404);
    saveData('users', $users);
    respond(['success' => true, 'message' => 'Status yahinduwe']);
}

// ============ DELETE USER ============
if ($action === 'user-delete' && $method === 'POST') {
    $input = getInput();
    $id = $input['id'] ?? '';

    if ($id === $user['id']) {
        respond(['error' => 'Ntushobora gusiba konti yawe'], 400);
    }

    $users = getData('users');
    $target = null;
    foreach ($users as $u) {
        if ($u['id'] === $id) { $target = $u; break; }
    }
    if (!$target) respond(['error' => 'Umukoresha ntabonetse'], 404);
    if ($target['role'] === 'admin') {
        respond(['error' => 'Ntushobora gusiba admin mwenzako'], 403);
    }

    $users = array_values(array_filter($users, fn($u) => $u['id'] !== $id));
    saveData('users', $users);

    // Also delete their products
    if ($target['role'] === 'farmer') {
        $products = getData('products');
        $products = array_values(array_filter($products, fn($p) => $p['farmerId'] !== $id));
        saveData('products', $products);
    }

    respond(['success' => true, 'message' => 'Umukoresha yasibwe']);
}

// ============ LIST ALL PRODUCTS (admin view) ============
if ($action === 'products' && $method === 'GET') {
    $products = getData('products');
    $status = $_GET['status'] ?? '';
    $category = $_GET['category'] ?? '';

    if ($status && $status !== 'all') {
        $products = array_filter($products, fn($p) => ($p['status'] ?? 'active') === $status);
    }
    if ($category && $category !== 'all') {
        $products = array_filter($products, fn($p) => $p['category'] === $category);
    }

    $products = array_values($products);
    usort($products, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
    respond(['success' => true, 'products' => $products]);
}

// ============ TOGGLE PRODUCT STATUS ============
if ($action === 'product-status' && $method === 'POST') {
    $input = getInput();
    $id = $input['id'] ?? '';
    $status = $input['status'] ?? '';

    if (!in_array($status, ['active', 'suspended', 'sold_out'], true)) {
        respond(['error' => 'Status ntariyo mu rutonde'], 400);
    }

    $products = getData('products');
    $found = false;
    foreach ($products as &$p) {
        if ($p['id'] === $id) {
            $p['status'] = $status;
            $found = true;
            break;
        }
    }
    unset($p);

    if (!$found) respond(['error' => 'Igicuruzwa nticyabonetse'], 404);
    saveData('products', $products);
    respond(['success' => true, 'message' => 'Status yahinduwe']);
}

// ============ LIST ALL ORDERS ============
if ($action === 'orders' && $method === 'GET') {
    $orders = getData('orders');
    $status = $_GET['status'] ?? '';

    if ($status && $status !== 'all') {
        $orders = array_filter($orders, fn($o) => ($o['status'] ?? 'pending') === $status);
    }

    $orders = array_values($orders);
    usort($orders, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
    respond(['success' => true, 'orders' => $orders]);
}

// ============ ANALYTICS ============
if ($action === 'analytics' && $method === 'GET') {
    $orders = getData('orders');
    $products = getData('products');

    // Top selling products
    $sales = [];
    foreach ($orders as $o) {
        if (($o['status'] ?? '') === 'cancelled') continue;
        foreach ($o['items'] as $item) {
            $pid = $item['productId'] ?? '';
            if (!isset($sales[$pid])) {
                $sales[$pid] = [
                    'productId' => $pid,
                    'name'      => $item['name'] ?? '',
                    'icon'      => $item['icon'] ?? '🌾',
                    'qty'       => 0,
                    'revenue'   => 0
                ];
            }
            $sales[$pid]['qty'] += $item['qty'] ?? 0;
            $sales[$pid]['revenue'] += ($item['price'] ?? 0) * ($item['qty'] ?? 0);
        }
    }
    usort($sales, fn($a, $b) => $b['revenue'] <=> $a['revenue']);

    // Revenue per district
    $byDistrict = [];
    foreach ($products as $p) {
        $d = $p['district'] ?? 'Unknown';
        if (!isset($byDistrict[$d])) $byDistrict[$d] = ['district' => $d, 'products' => 0, 'revenue' => 0];
        $byDistrict[$d]['products']++;
    }
    foreach ($orders as $o) {
        if (($o['status'] ?? '') === 'cancelled') continue;
        foreach ($o['items'] as $item) {
            foreach ($products as $p) {
                if ($p['id'] === ($item['productId'] ?? '')) {
                    $d = $p['district'] ?? 'Unknown';
                    $byDistrict[$d]['revenue'] += ($item['price'] ?? 0) * ($item['qty'] ?? 0);
                    break;
                }
            }
        }
    }

    respond([
        'success' => true,
        'topProducts' => array_slice($sales, 0, 10),
        'byDistrict'  => array_values($byDistrict)
    ]);
}

respond(['error' => 'Invalid action'], 400);