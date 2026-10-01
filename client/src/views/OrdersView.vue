<template>
  <div class="container">
    <div class="page-header">
      <h1>Admin Dashboard</h1>
    </div>

    <div class="grid grid-3 mt-4">
      <div class="card">
        <h3>Total Users</h3>
        <p>15</p>
      </div>
      <div class="card">
        <h3>Products</h3>
        <p>48</p>
      </div>
      <div class="card">
        <h3>Revenue</h3>
        <p>890,000 RWF</p>
      </div>
    </div>

    <div class="card mt-4">
      <h2>Recent Activity</h2>
      <ul class="activity-list">
        <li>Jean added a new product</li>
        <li>New buyer order placed</li>
        <li>System health normal</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.activity-list {
  list-style: disc;
  margin-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
