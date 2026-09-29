<?php
require_once 'config.php';

$user = requireAuth();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ============ GET OWN PROFILE ============
if ($action === 'get' && $method === 'GET') {
    // Refresh from DB
    $users = getData('users');
    foreach ($users as $u) {
        if ($u['id'] === $user['id']) {
            unset($u['password']);
            $_SESSION['user'] = $u;
            respond(['success' => true, 'user' => $u]);
        }
    }
    respond(['error' => 'Umukoresha ntabonetse'], 404);
}

// ============ UPDATE PROFILE ============
if ($action === 'update' && $method === 'POST') {
    $input = getInput();
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $district = $input['district'] ?? '';

    if ($name === '' || $phone === '' || $district === '') {
        respond(['error' => 'Uzuza amakuru yose'], 400);
    }
    if (!preg_match('/^07[2-9]\d{7}$/', $phone)) {
        respond(['error' => 'Numero ya telefoni ntariyo'], 400);
    }
    if (!in_array($district, ['Kigali','Northern','Southern','Eastern','Western'], true)) {
        respond(['error' => 'Akarere ntikiri mu rutonde'], 400);
    }

    $users = getData('users');
    $found = false;
    foreach ($users as &$u) {
        if ($u['id'] === $user['id']) {
            $u['name'] = $name;
            $u['phone'] = $phone;
            $u['district'] = $district;

            // Update farmerName in products if farmer
            $found = true;

            $updated = $u;
            unset($updated['password']);
            $_SESSION['user'] = $updated;
            break;
        }
    }
    unset($u);

    if (!$found) respond(['error' => 'Umukoresha ntabonetse'], 404);
    saveData('users', $users);

    // Update denormalized farmerName in products
    if ($user['role'] === 'farmer') {
        $products = getData('products');
        foreach ($products as &$p) {
            if ($p['farmerId'] === $user['id']) {
                $p['farmerName'] = $name;
                $p['district'] = $district;
            }
        }
        unset($p);
        saveData('products', $products);
    }

    respond(['success' => true, 'message' => 'Amakuru yahinduwe', 'user' => $_SESSION['user']]);
}

// ============ CHANGE PASSWORD ============
if ($action === 'password' && $method === 'POST') {
    $input = getInput();
    $current = $input['current'] ?? '';
    $new = $input['new'] ?? '';

    if (!$current || !$new) {
        respond(['error' => 'Uzuza amakuru yose'], 400);
    }
    if (strlen($new) < 6) {
        respond(['error' => 'Ijambo ry\'ibanga rishya rigomba kuba nibura inyuguti 6'], 400);
    }

    $users = getData('users');
    $found = false;
    foreach ($users as &$u) {
        if ($u['id'] === $user['id']) {
            if (!password_verify($current, $u['password'])) {
                respond(['error' => 'Ijambo ry\'ibanga rya kera ntiryo'], 401);
            }
            $u['password'] = password_hash($new, PASSWORD_DEFAULT);
            $found = true;
            break;
        }
    }
    unset($u);

    if (!$found) respond(['error' => 'Umukoresha ntabonetse'], 404);
    saveData('users', $users);
    respond(['success' => true, 'message' => 'Ijambo ry\'ibanga ryahinduwe']);
}

// ============ MY ORDERS (as buyer) ============
if ($action === 'my-orders' && $method === 'GET') {
    $orders = getData('orders');
    $orders = array_filter($orders, fn($o) => $o['userId'] === $user['id']);
    $orders = array_values($orders);
    usort($orders, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
    respond(['success' => true, 'orders' => $orders]);
}

// ============ CANCEL MY ORDER ============
if ($action === 'cancel-order' && $method === 'POST') {
    $input = getInput();
    $id = $input['id'] ?? '';
    if (!$id) respond(['error' => 'Missing id'], 400);

    $orders = getData('orders');
    $found = false;
    foreach ($orders as &$o) {
        if ($o['id'] === $id && $o['userId'] === $user['id']) {
            if (($o['status'] ?? 'pending') !== 'pending') {
                respond(['error' => 'Iyi order ntishobora guhagarikwa ubu'], 400);
            }
            $o['status'] = 'cancelled';
            $o['updatedAt'] = date('Y-m-d H:i:s');

            // Restore stock
            $products = getData('products');
            foreach ($o['items'] as $item) {
                foreach ($products as &$p) {
                    if ($p['id'] === ($item['productId'] ?? '')) {
                        $p['quantity'] += $item['qty'] ?? 0;
                        if (($p['status'] ?? '') === 'sold_out' && $p['quantity'] > 0) {
                            $p['status'] = 'active';
                        }
                        break;
                    }
                }
            }
            unset($p);
            saveData('products', $products);

            $found = true;
            break;
        }
    }
    unset($o);

    if (!$found) respond(['error' => 'Order ntabonetse'], 404);
    saveData('orders', $orders);
    respond(['success' => true, 'message' => 'Order yahagaritswe']);
}

respond(['error' => 'Invalid action'], 400);