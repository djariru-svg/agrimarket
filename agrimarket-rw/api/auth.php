<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';

// ============ LOGIN ============
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInput();
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        respond(['error' => 'Email na password birakenewe'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Email ntariyo'], 400);
    }

    // Rate limiting (per session)
    $now = time();
    $attempts = $_SESSION['login_attempts'] ?? ['count' => 0, 'first' => $now];
    if ($now - $attempts['first'] > 300) $attempts = ['count' => 0, 'first' => $now];
    if ($attempts['count'] >= 8) {
        respond(['error' => 'Kagereranya nyinshi. Gerageza nyuma y\'amashyamba 5.'], 429);
    }

    $users = getData('users');
    $user = null;
    foreach ($users as $u) {
        if (strcasecmp($u['email'], $email) === 0 && password_verify($password, $u['password'])) {
            $user = $u;
            break;
        }
    }

    if (!$user) {
        $attempts['count']++;
        $_SESSION['login_attempts'] = $attempts;
        respond(['error' => 'Email cyangwa ijambo ry\'ibanga ntabwo ari byo'], 401);
    }

    if (($user['status'] ?? 'active') === 'suspended') {
        respond(['error' => 'Konti yawe yahagaritswe. Vugana n\'ubuyobozi.'], 403);
    }

    unset($_SESSION['login_attempts']);

    unset($user['password']);
    $_SESSION['user'] = $user;

    respond(['success' => true, 'message' => 'Murakaza neza!', 'user' => $user]);
}

// ============ REGISTER ============
if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getInput();
    $name     = trim($input['name'] ?? '');
    $email    = trim($input['email'] ?? '');
    $phone    = trim($input['phone'] ?? '');
    $district = $input['district'] ?? '';
    $role     = $input['role'] ?? 'buyer';
    $password = $input['password'] ?? '';

    if (!$name || !$email || !$phone || !$district || !$password) {
        respond(['error' => 'Uzuza amakuru yose'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Email ntariyo'], 400);
    }
    if (!preg_match('/^07[2-9]\d{7}$/', $phone)) {
        respond(['error' => 'Numero ya telefoni ntariyo (urugero: 0788123456)'], 400);
    }
    if (strlen($password) < 6) {
        respond(['error' => 'Ijambo ry\'ibanga rigomba kuba nibura inyuguti 6'], 400);
    }
    if (!in_array($role, ['buyer', 'farmer'], true)) $role = 'buyer';
    if (!in_array($district, ['Kigali','Northern','Southern','Eastern','Western'], true)) {
        respond(['error' => 'Akarere ntikari mu rutonde'], 400);
    }

    $users = getData('users');
    foreach ($users as $u) {
        if (strcasecmp($u['email'], $email) === 0) {
            respond(['error' => 'Iyi email isanzwe ikoreshwa'], 400);
        }
    }

    $newUser = [
        'id'        => generateId('u'),
        'name'      => $name,
        'email'     => strtolower($email),
        'phone'     => $phone,
        'district'  => $district,
        'role'      => $role,
        'password'  => password_hash($password, PASSWORD_DEFAULT),
        'status'    => 'active',
        'createdAt' => date('Y-m-d')
    ];

    $users[] = $newUser;
    saveData('users', $users);

    unset($newUser['password']);
    $_SESSION['user'] = $newUser;

    respond(['success' => true, 'message' => 'Konti yawe yaremwe neza!', 'user' => $newUser]);
}

// ============ LOGOUT ============
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    respond(['success' => true, 'message' => 'Wasohotse neza']);
}

// ============ ME ============
if ($action === 'me') {
    if (empty($_SESSION['user'])) respond(['user' => null]);
    respond(['user' => $_SESSION['user']]);
}

respond(['error' => 'Invalid action'], 400);