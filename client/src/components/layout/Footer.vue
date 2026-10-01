<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div>
        <h4>AgriMarket RW</h4>
        <p>Connecting farmers and buyers across Rwanda.</p>
      </div>

      <div>
        <h5>Quick Links</h5>
        <ul>
          <li><router-link to="/">Home</router-link></li>
          <li><router-link to="/products">Products</router-link></li>
          <li><router-link to="/about">About</router-link></li>
        </ul>
      </div>

      <div>
        <h5>Contact</h5>
        <ul>
          <li>Email: hello@agrimarket.rw</li>
          <li>Phone: +250 788 000 000</li>
          <li>Kigali, Rwanda</li>
        </ul>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: #132918;
  color: #edf5ee;
  padding: 2rem 0;
  margin-top: 3rem;
}

.footer-inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
}

.footer h4, .footer h5 {
  color: white;
}

.footer ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
}

.footer a {
  color: #dcefe0;
}

.footer p, .footer li {
  color: #dcefe0;
}
</style>
