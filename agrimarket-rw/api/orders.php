<?php
require_once 'config.php';

/**
 * Mask buyer name for privacy
 * "Mutesi Alice" → "Mutesi A."
 * "Jean" → "Jean"
 */
function maskName($name) {
    $parts = preg_split('/\s+/', trim($name));
    if (count($parts) <= 1) return $name;
    $lastInitial = mb_substr(end($parts), 0, 1);
    array_pop($parts);
    return implode(' ', $parts) . ' ' . $lastInitial . '.';
}

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

// ============ CREATE ORDER ============
if ($action === 'create' && $method === 'POST') {
    $user = requireRole(['buyer']);

    $input = getInput();
    $items = $input['items'] ?? [];

    if (!is_array($items) || empty($items)) {
        respond(['error' => 'Agasanduku nta kintu kirimo'], 400);
    }

    $products = getData('products');
    $productMap = [];
    foreach ($products as $p) $productMap[$p['id']] = $p;

    $safeItems = [];
    $total = 0;

    foreach ($items as $item) {
        $pid = $item['productId'] ?? '';
        $qty = max(1, intval($item['qty'] ?? 1));

        if (!isset($productMap[$pid])) {
            respond(['error' => "Igicuruzwa nticyabonetse: $pid"], 400);
        }

        $p = $productMap[$pid];

        if (($p['status'] ?? 'active') !== 'active') {
            respond(['error' => "{$p['name']} nticyakoreshwa"], 400);
        }
        if ($qty > $p['quantity']) {
            respond(['error' => "{$p['name']}: ingano ihari ni {$p['quantity']} gusa"], 400);
        }
        if ($p['farmerId'] === $user['id']) {
            respond(['error' => 'Ntushobora kugura igicuruzwa cyawe'], 400);
        }

        $subtotal = $p['price'] * $qty; // ✅ Server-side price
        $safeItems[] = [
            'productId'  => $p['id'],
            'name'       => $p['name'],
            'price'      => $p['price'],
            'qty'        => $qty,
            'unit'       => $p['unit'],
            'icon'       => $p['icon'] ?? '🌾',
            'farmerId'   => $p['farmerId'],
            'farmerName' => $p['farmerName'],
            'subtotal'   => $subtotal,
        ];
        $total += $subtotal;
    }

    // Decrement stock (atomic-ish — done after validation)
    foreach ($safeItems as $si) {
        foreach ($products as &$p) {
            if ($p['id'] === $si['productId']) {
                $p['quantity'] = max(0, $p['quantity'] - $si['qty']);
                if ($p['quantity'] === 0) $p['status'] = 'sold_out';
                break;
            }
        }
    }
    unset($p);
    saveData('products', $products);

    // Save order
    $orders = getData('orders');
    $newOrder = [
        'id'        => generateId('o'),
        'userId'    => $user['id'],
        'userName'  => $user['name'],
        'userPhone' => $user['phone'],
        'items'     => $safeItems,
        'total'     => $total,
        'status'    => 'pending',
        'note'      => trim($input['note'] ?? ''),
        'createdAt' => date('Y-m-d H:i:s')
    ];
    array_unshift($orders, $newOrder);
    saveData('orders', $orders);

    respond([
        'success' => true,
        'message' => 'Order yawe yoherejwe! Umuhinzi azahamagara.',
        'order'   => $newOrder
    ]);
}

// ============ LIST ORDERS ============
if ($action === 'list' && $method === 'GET') {
    $user = requireAuth();
    $orders = getData('orders');

    if ($user['role'] === 'admin') {
        // See all
    } elseif ($user['role'] === 'buyer') {
        $orders = array_filter($orders, fn($o) => $o['userId'] === $user['id']);
   } elseif ($user['role'] === 'farmer') {
    $products = getData('products');
    $myProductIds = array_column(
        array_filter($products, fn($p) => $p['farmerId'] === $user['id']),
        'id'
    );
    $orders = array_filter($orders, function($o) use ($myProductIds) {
        if (empty($o['items']) || !is_array($o['items'])) return false;
        foreach ($o['items'] as $item) {
            if (in_array($item['productId'] ?? '', $myProductIds, true)) return true;
        }
        return false;
    });

    // ✅ MASK buyer info based on order status
    $orders = array_map(function($o) use ($user) {
        // Get buyer district (needed for delivery context)
        $buyerDistrict = null;
        $users = getData('users');
        foreach ($users as $u) {
            if ($u['id'] === ($o['userId'] ?? '')) {
                $buyerDistrict = $u['district'] ?? null;
                break;
            }
        }

        $status = $o['status'] ?? 'pending';
        $isConfirmed = in_array($status, ['confirmed', 'delivered'], true);

        // Only include items belonging to THIS farmer
        $o['items'] = array_values(array_filter($o['items'], function($item) use ($user) {
            return ($item['farmerId'] ?? '') === $user['id'];
        }));

        // Recalculate total for this farmer
        $farmerTotal = 0;
        foreach ($o['items'] as $item) {
            $farmerTotal += ($item['price'] ?? 0) * ($item['qty'] ?? 0);
        }
        $o['farmerTotal'] = $farmerTotal;

        // Mask buyer personal info
        $o['userName']  = maskName($o['userName'] ?? '');
        $o['userPhone'] = $isConfirmed ? ($o['userPhone'] ?? null) : null;
        $o['userDistrict'] = $buyerDistrict;
        $o['phoneHidden']  = !$isConfirmed;

        return $o;
    }, $orders);
}

    $orders = array_values($orders);
    usort($orders, fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''));

    respond(['success' => true, 'orders' => $orders]);
}

// ============ UPDATE ORDER STATUS (farmer/admin) ============
if ($action === 'status' && $method === 'POST') {
    $user = requireRole(['farmer', 'admin']);
    $input = getInput();
    $id = $input['id'] ?? '';
    $newStatus = $input['status'] ?? '';

    $allowed = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!in_array($newStatus, $allowed, true)) {
        respond(['error' => 'Status ntariyo mu rutonde'], 400);
    }

    $orders = getData('orders');
    $found = false;

    foreach ($orders as &$o) {
        if ($o['id'] === $id) {
            if ($user['role'] !== 'admin') {
                // Farmer must own at least one item in the order
                $owns = false;
                foreach ($o['items'] as $item) {
                    if (($item['farmerId'] ?? '') === $user['id']) { $owns = true; break; }
                }
                if (!$owns) respond(['error' => 'Forbidden'], 403);
            }
            $o['status'] = $newStatus;
            $o['updatedAt'] = date('Y-m-d H:i:s');
            $found = true;
            break;
        }
    }
    unset($o);

    if (!$found) respond(['error' => 'Order not found'], 404);
    saveData('orders', $orders);
    respond(['success' => true, 'message' => 'Status yahinduwe']);
}

// ============ DASHBOARD STATS ============
if ($action === 'stats' && $method === 'GET') {
    $user = requireRole(['farmer', 'admin']);

    $products = getData('products');
    $orders = getData('orders');

    $myProducts = $user['role'] === 'admin'
        ? $products
        : array_filter($products, fn($p) => $p['farmerId'] === $user['id']);
    $myProductIds = array_column($myProducts, 'id');

    $farmerOrders = 0;
    $totalRevenue = 0;
    $pending = 0;

    foreach ($orders as $order) {
        foreach ($order['items'] as $item) {
            if (in_array($item['productId'] ?? '', $myProductIds, true)) {
                $farmerOrders++;
                $totalRevenue += ($item['price'] ?? 0) * ($item['qty'] ?? 0);
                if (($order['status'] ?? 'pending') === 'pending') $pending++;
            }
        }
    }

    respond([
        'success' => true,
        'stats' => [
            'products' => count($myProducts),
            'orders'   => $farmerOrders,
            'revenue'  => $totalRevenue,
            'pending'  => $pending
        ]
    ]);
}

respond(['error' => 'Invalid action'], 400);