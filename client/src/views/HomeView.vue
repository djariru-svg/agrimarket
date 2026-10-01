<template>
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">Fresh from Rwanda</span>
        <h1>Welcome to AgriMarket RW</h1>
        <p>Buy quality agricultural products, support local farmers, and discover the best of Rwanda’s market.</p>
        <div class="hero-actions">
          <router-link to="/products" class="btn btn-primary">Browse Products</router-link>
          <router-link to="/register" class="btn btn-secondary">Join as Farmer</router-link>
        </div>
      </div>

      <div class="hero-visual">
        <div class="product-badge badge-1">🥬 Fresh</div>
        <div class="product-badge badge-2">🍅 Organic</div>
        <div class="product-badge badge-3">🥛 Dairy</div>
        <div class="hero-card">
          <div class="mini-stat">
            <strong>2,400+</strong>
            <span>Farmers</span>
          </div>
          <div class="mini-stat">
            <strong>8.5k</strong>
            <span>Orders</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 4rem 0;
  background: linear-gradient(135deg, rgba(47, 143, 70, 0.1), rgba(167, 212, 109, 0.15));
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  align-items: center;
  gap: 2rem;
}

.eyebrow {
  display: inline-block;
  background: rgba(47, 143, 70, 0.1);
  color: var(--primary);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.hero-copy h1 {
  margin-bottom: 1rem;
  font-size: clamp(2.5rem, 5vw, 4rem);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 2rem;
}

.hero-visual {
  position: relative;
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-card {
  width: min(320px, 100%);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.mini-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.mini-stat:last-child {
  border-bottom: none;
}

.product-badge {
  position: absolute;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.badge-1 { top: 30px; left: 20px; }
.badge-2 { top: 70px; right: 40px; }
.badge-3 { bottom: 40px; left: 80px; }

@media (max-width: 768px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }
}
</style>
