<?php
require_once 'config.php';

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

// ============ LIST PRODUCTS ============
if ($action === 'list' && $method === 'GET') {
    $products = getData('products');

    $search   = trim($_GET['search'] ?? '');
    $category = $_GET['category'] ?? '';
    $district = $_GET['district'] ?? '';
    $sort     = $_GET['sort'] ?? 'newest';
    $farmerId = $_GET['farmerId'] ?? '';

    // Only show active products to non-owners
    $viewer = $_SESSION['user'] ?? null;
    $isAdmin = $viewer && $viewer['role'] === 'admin';

    if (!$isAdmin) {
        $products = array_filter($products, function($p) use ($viewer, $farmerId) {
            // Farmer viewing own products: show all statuses
            if ($viewer && $viewer['role'] === 'farmer' && $p['farmerId'] === $viewer['id']) {
                return true;
            }
            // Otherwise only show active
            return ($p['status'] ?? 'active') === 'active';
        });
    }

    if ($search !== '') {
        $q = mb_strtolower($search);
        $products = array_filter($products, function($p) use ($q) {
            return mb_strpos(mb_strtolower($p['name']), $q) !== false
                || mb_strpos(mb_strtolower($p['farmerName']), $q) !== false
                || mb_strpos(mb_strtolower($p['location']), $q) !== false
                || mb_strpos(mb_strtolower($p['category']), $q) !== false;
        });
    }

    if ($category && $category !== 'all') {
        $products = array_filter($products, fn($p) => $p['category'] === $category);
    }

    if ($district && $district !== 'all') {
        $products = array_filter($products, fn($p) => $p['district'] === $district);
    }

    if ($farmerId) {
        // Only admins or the farmer themselves can filter by farmerId
        if (!$viewer || ($viewer['role'] !== 'admin' && $viewer['id'] !== $farmerId)) {
            respond(['error' => 'Forbidden'], 403);
        }
        $products = array_filter($products, fn($p) => $p['farmerId'] === $farmerId);
    }

    $products = array_values($products);

    // Sort
    if ($sort === 'price-low') {
        usort($products, fn($a, $b) => $a['price'] <=> $b['price']);
    } elseif ($sort === 'price-high') {
        usort($products, fn($a, $b) => $b['price'] <=> $a['price']);
    } else {
        usort($products, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));
    }

    respond(['success' => true, 'products' => $products]);
}

// ============ GET SINGLE PRODUCT ============
if ($action === 'get' && $method === 'GET') {
    $id = $_GET['id'] ?? '';
    if (!$id) respond(['error' => 'Missing id'], 400);

    $products = getData('products');
    foreach ($products as $p) {
        if ($p['id'] === $id) {
            respond(['success' => true, 'product' => $p]);
        }
    }
    respond(['error' => 'Product not found'], 404);
}

// ============ ADD PRODUCT ============
if ($action === 'add' && $method === 'POST') {
    $user = requireRole(['farmer', 'admin']);

    $input = getInput();
    $name        = trim($input['name'] ?? '');
    $category    = trim($input['category'] ?? '');
    $price       = intval($input['price'] ?? 0);
    $unit        = trim($input['unit'] ?? 'kg');
    $quantity    = intval($input['quantity'] ?? 0);
    $location    = trim($input['location'] ?? '');
    $description = trim($input['description'] ?? '');
    $icon        = trim($input['icon'] ?? '🌾');

    // Validation
    if ($name === '' || $category === '' || $price < 1 || $location === '') {
        respond(['error' => 'Uzuza amakuru yose akenewe (izina, icyiciro, igiciro, ahantu)'], 400);
    }
    if (mb_strlen($name) > 100) {
        respond(['error' => 'Izina ry\'igicuruzwa ni ndende cyane (max 100)'], 400);
    }
    if ($price > 10000000) {
        respond(['error' => 'Igiciro ni kinini cyane'], 400);
    }
    if ($quantity < 1) {
        respond(['error' => 'Ingano igomba kuba nibura 1'], 400);
    }
    if ($unit === '') $unit = 'kg';
    if ($icon === '') $icon = '🌾';

    $allowedCategories = ['Imboga', 'Ibinyampeke', 'Imyumbati', 'Imyaka', 'Amata', 'Ibindi'];
    if (!in_array($category, $allowedCategories, true)) {
        respond(['error' => 'Icyiciro ntikiri mu rutonde'], 400);
    }

    $products = getData('products');
    $newProduct = [
        'id'          => generateId('p'),
        'name'        => $name,
        'category'    => $category,
        'price'       => $price,
        'unit'        => $unit,
        'quantity'    => $quantity,
        'farmerId'    => $user['id'],
        'farmerName'  => $user['name'],
        'district'    => $user['district'],
        'location'    => $location,
        'description' => $description,
        'icon'        => $icon,
        'badge'       => 'Bishya',
        'status'      => 'active',
        'createdAt'   => date('Y-m-d')
    ];

    array_unshift($products, $newProduct);
    saveData('products', $products);

    respond(['success' => true, 'message' => 'Igicuruzwa cyongewe neza!', 'product' => $newProduct]);
}

// ============ UPDATE PRODUCT ============
if ($action === 'update' && $method === 'POST') {
    $user = requireRole(['farmer', 'admin']);
    $input = getInput();
    $id = $input['id'] ?? '';
    if (!$id) respond(['error' => 'Missing id'], 400);

    $products = getData('products');
    $found = false;

    foreach ($products as &$p) {
        if ($p['id'] === $id) {
            // Owner or admin only
            if ($p['farmerId'] !== $user['id'] && $user['role'] !== 'admin') {
                respond(['error' => 'Ntabwo wemerewe guhindura iki gicuruzwa'], 403);
            }

            if (isset($input['price']))    $p['price']    = max(1, intval($input['price']));
            if (isset($input['quantity'])) $p['quantity'] = max(0, intval($input['quantity']));
            if (isset($input['name']))     $p['name']     = trim($input['name']);
            if (isset($input['location'])) $p['location'] = trim($input['location']);
            if (isset($input['description'])) $p['description'] = trim($input['description']);
            if (isset($input['status']) && $user['role'] === 'admin') $p['status'] = $input['status'];
            if (isset($input['unit']) && $input['unit'] !== '') $p['unit'] = trim($input['unit']);

            $found = true;
            break;
        }
    }
    unset($p);

    if (!$found) respond(['error' => 'Product not found'], 404);

    saveData('products', $products);
    respond(['success' => true, 'message' => 'Igicuruzwa cyahinduwe']);
}

// ============ DELETE PRODUCT ============
if ($action === 'delete' && $method === 'POST') {
    $user = requireAuth();
    $input = getInput();
    $id = $input['id'] ?? '';
    if (!$id) respond(['error' => 'Missing id'], 400);

    $products = getData('products');
    $found = false;
    $newProducts = [];

    foreach ($products as $p) {
        if ($p['id'] === $id) {
            if ($p['farmerId'] !== $user['id'] && $user['role'] !== 'admin') {
                respond(['error' => 'Ntabwo wemerewe gusiba iki gicuruzwa'], 403);
            }
            $found = true;
            continue;
        }
        $newProducts[] = $p;
    }

    if (!$found) respond(['error' => 'Product not found'], 404);

    saveData('products', $newProducts);
    respond(['success' => true, 'message' => 'Igicuruzwa cyasibwe']);
}

respond(['error' => 'Invalid action'], 400);