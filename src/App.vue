<script setup lang="ts">
import TransparentNavbar from './components/TransparentNavbar.vue'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <v-app>
    <!-- Navbar com slots: left / center / right -->
    <TransparentNavbar title="Patchboard">
      <template #left>
        <!-- usa os antigos logos como "brand" no lado esquerdo -->
        <a href="https://vite.dev" target="_blank" aria-label="Vite">
          <img src="/vite.svg" class="logo" alt="Vite logo" />
        </a>
        <a href="https://vuejs.org/" target="_blank" aria-label="Vue">
          <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
        </a>
      </template>

      <!-- você pode sobrescrever o título no centro se quiser -->
      <!--
      <template #center>
        Meu Título Custom
      </template>
      -->

      <template #right>
        <!-- ações (placeholder): você pode trocar depois -->
        <v-btn variant="text" to="/" data-cy="nav-home">Home</v-btn>
        <v-btn variant="text" to="/about" data-cy="nav-about">About</v-btn>
      </template>
    </TransparentNavbar>

    <v-main>
      <v-container class="py-8">
        <HelloWorld msg="Vite + Vue" />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.logo {
  height: 2.25rem;
  margin-right: .25rem;
  will-change: filter;
  transition: filter 300ms;
  vertical-align: middle;
}
.logo:hover { filter: drop-shadow(0 0 2em #646cffaa); }
.logo.vue:hover { filter: drop-shadow(0 0 2em #42b883aa); }
</style>
