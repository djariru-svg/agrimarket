// AgriMarket RW - Sample Data & LocalStorage Helpers

const CATEGORIES = [
  "Imboga",
  "Ibinyampeke",
  "Imyumbati",
  "Imyaka",
  "Amata",
  "Ibindi"
];

const DISTRICTS = [
  "Kigali",
  "Northern",
  "Southern",
  "Eastern",
  "Western"
];

// Sample products (icons as emoji for simplicity)
const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    name: "Ibihaza (Cabbages)",
    category: "Imboga",
    price: 500,
    unit: "kg",
    quantity: 200,
    farmerId: "f1",
    farmerName: "Uwimana Jean",
    district: "Northern",
    location: "Musanze",
    description: "Ibihaza byiza byavuye mu mirima ya Musanze. Byiza cyane ku giciro cyiza.",
    icon: "🥬",
    badge: "Bishya",
    createdAt: "2026-09-15"
  },
  {
    id: "p2",
    name: "Amashaza (Beans)",
    category: "Ibinyampeke",
    price: 1200,
    unit: "kg",
    quantity: 500,
    farmerId: "f2",
    farmerName: "Mukamana Claire",
    district: "Southern",
    location: "Huye",
    description: "Amashaza meza y'ubwoko bwa red beans. Yatunganyije neza.",
    icon: "🫘",
    badge: null,
    createdAt: "2026-09-14"
  },
  {
    id: "p3",
    name: "Ibijumba (Sweet Potatoes)",
    category: "Imyumbati",
    price: 400,
    unit: "kg",
    quantity: 300,
    farmerId: "f1",
    farmerName: "Uwimana Jean",
    district: "Northern",
    location: "Musanze",
    description: "Ibijumba byiza by'ubwoko bwa orange flesh. Byiza ku bana.",
    icon: "🍠",
    badge: "Popular",
    createdAt: "2026-09-13"
  },
  {
    id: "p4",
    name: "Imineke (Bananas)",
    category: "Imyaka",
    price: 800,
    unit: "bunch",
    quantity: 50,
    farmerId: "f3",
    farmerName: "Habimana Eric",
    district: "Eastern",
    location: "Kayonza",
    description: "Imineke myiza y'ubwoko bwa apple bananas. Ziba neza.",
    icon: "🍌",
    badge: null,
    createdAt: "2026-09-12"
  },
  {
    id: "p5",
    name: "Amata y'inka (Fresh Milk)",
    category: "Amata",
    price: 600,
    unit: "liter",
    quantity: 100,
    farmerId: "f4",
    farmerName: "Niyonsenga Marie",
    district: "Western",
    location: "Rubavu",
    description: "Amata meza y'inka zitungwa neza. Fresh every morning.",
    icon: "🥛",
    badge: "Fresh",
    createdAt: "2026-09-16"
  },
  {
    id: "p6",
    name: "Tomatisi (Tomatoes)",
    category: "Imboga",
    price: 700,
    unit: "kg",
    quantity: 150,
    farmerId: "f2",
    farmerName: "Mukamana Claire",
    district: "Southern",
    location: "Huye",
    description: "Tomatisi nziza zikomoka ku mirima ya Huye. Ziba neza ku sauce.",
    icon: "🍅",
    badge: "Bishya",
    createdAt: "2026-09-17"
  },
  {
    id: "p7",
    name: "Ibigori (Maize)",
    category: "Ibinyampeke",
    price: 450,
    unit: "kg",
    quantity: 1000,
    farmerId: "f5",
    farmerName: "Bizimana Paul",
    district: "Eastern",
    location: "Nyagatare",
    description: "Ibigori byiza by'ubwoko bwa hybrid. Byiza ku kurya no gukora ubugali.",
    icon: "🌽",
    badge: null,
    createdAt: "2026-09-10"
  },
  {
    id: "p8",
    name: "Amacunga (Oranges)",
    category: "Imyaka",
    price: 1500,
    unit: "kg",
    quantity: 80,
    farmerId: "f3",
    farmerName: "Habimana Eric",
    district: "Eastern",
    location: "Kayonza",
    description: "Amacunga meza y'ubwoko bwa Valencia. Yuzuye vitamin C.",
    icon: "🍊",
    badge: "Popular",
    createdAt: "2026-09-11"
  }
];

// LocalStorage helpers
const Storage = {
  getUsers() {
    return JSON.parse(localStorage.getItem("agrimarket_users") || "[]");
  },
  saveUsers(users) {
    localStorage.setItem("agrimarket_users", JSON.stringify(users));
  },
  getProducts() {
    const stored = localStorage.getItem("agrimarket_products");
    if (!stored) {
      localStorage.setItem("agrimarket_products", JSON.stringify(SAMPLE_PRODUCTS));
      return SAMPLE_PRODUCTS;
    }
    return JSON.parse(stored);
  },
  saveProducts(products) {
    localStorage.setItem("agrimarket_products", JSON.stringify(products));
  },
  getCurrentUser() {
    return JSON.parse(localStorage.getItem("agrimarket_currentUser") || "null");
  },
  setCurrentUser(user) {
    localStorage.setItem("agrimarket_currentUser", JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem("agrimarket_currentUser");
  },
  getCart() {
    return JSON.parse(localStorage.getItem("agrimarket_cart") || "[]");
  },
  saveCart(cart) {
    localStorage.setItem("agrimarket_cart", JSON.stringify(cart));
  },
  getOrders() {
    return JSON.parse(localStorage.getItem("agrimarket_orders") || "[]");
  },
  saveOrders(orders) {
    localStorage.setItem("agrimarket_orders", JSON.stringify(orders));
  }
};

// Initialize sample admin if needed
(function init() {
  const users = Storage.getUsers();
  if (users.length === 0) {
    users.push({
      id: "admin1",
      name: "Admin",
      email: "admin@agrimarket.rw",
      phone: "0788000000",
      district: "Kigali",
      role: "admin",
      password: "admin123"
    });
    // Sample farmers
    users.push({
      id: "f1",
      name: "Uwimana Jean",
      email: "jean@farm.rw",
      phone: "0788111111",
      district: "Northern",
      role: "farmer",
      password: "farmer123"
    });
    users.push({
      id: "f2",
      name: "Mukamana Claire",
      email: "claire@farm.rw",
      phone: "0788222222",
      district: "Southern",
      role: "farmer",
      password: "farmer123"
    });
    Storage.saveUsers(users);
  }
  Storage.getProducts(); // ensure products exist
})();
