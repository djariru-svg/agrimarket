# AgriMarket RW – Full Stack Project

**Level 4 Software Development – Full Project with Backend + Database**

## Ibisobanuro
AgriMarket RW ni website ihuje **abahinzi** n'**abaguzi** mu Rwanda.
Abahinzi bashyira umusaruro wabo, abaguzi bakabona aho bagura hafi yabo.

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** PHP 8 (REST API)
- **Database:** JSON files (no MySQL required – easy for Level 4)
- **Auth:** PHP Sessions + password_hash

## Features
- User Registration & Login (Farmer / Buyer / Admin)
- Product Listing, Search, Filter (category, district, price)
- Shopping Cart & Order System
- Farmer Dashboard (stats + manage products)
- Add / Delete Products
- Responsive design

## Structure
```
agrimarket-rw/
├── index.html, products.html, dashboard.html, add-product.html, about.html
├── css/style.css
├── js/api.js          ← API client
├── js/app.js          ← Frontend logic
├── api/
│   ├── config.php     ← Database helpers + init
│   ├── auth.php       ← Login / Register / Logout
│   ├── products.php   ← CRUD products
│   └── orders.php     ← Orders + stats
└── data/
    ├── users.json
    ├── products.json
    └── orders.json
```

## Uko uyifungura (IMPORTANT)

### 1. Saba PHP
```bash
php -v
```

### 2. Tangira server
```bash
cd agrimarket-rw
php -S localhost:8000
```

### 3. Fungura browser
**http://localhost:8000**

> **Ntukoreshe** double-click kuri index.html – backend irakeneye PHP server!

## Demo Accounts

| Role     | Email               | Password   |
|----------|---------------------|------------|
| Farmer   | jean@farm.rw        | farmer123  |
| Farmer   | claire@farm.rw      | farmer123  |
| Admin    | admin@agrimarket.rw | admin123   |

## API Endpoints
- `POST api/auth.php?action=login`
- `POST api/auth.php?action=register`
- `GET  api/auth.php?action=me`
- `GET  api/products.php?action=list`
- `POST api/products.php?action=add`
- `POST api/products.php?action=delete`
- `POST api/orders.php?action=create`
- `GET  api/orders.php?action=stats`

## Next Steps (optional)
- Migrate JSON → MySQL
- Image upload
- Mobile Money payment
- SMS notifications

© 2026 AgriMarket RW – Level 4 Software Development
