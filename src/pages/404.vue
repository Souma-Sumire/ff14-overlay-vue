<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="not-found">
    <div class="cat-container">
      🐱
    </div>
    <h1>{{ $t('404.title') }}</h1>
    <p>{{ $t('404.message') }}</p>
    <RouterLink to="/startPages" class="go-home">
      {{ $t('404.back') }}
    </RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: 'Comic Sans MS', system-ui, sans-serif;
  text-align: center;
  background: #ffffff;
  color: #333333;
}

.cat-container {
  font-size: 5rem;
  animation: bounce 1s infinite;
  margin-bottom: 1rem;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

h1 {
  font-size: 5rem;
  margin: 0;
  color: #666666;
}

p {
  font-size: 1.5rem;
  margin: 0.5rem 0 2rem;
  color: #666666;
}

.go-home {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  transition: background 0.3s;
}
.go-home:hover {
  background: #0056b3;
}
</style>
