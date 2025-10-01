<script setup lang="ts">
type Props = {
  title?: string
  elevateOnScroll?: boolean
}
withDefaults(defineProps<Props>(), {
  title: 'Patchboard',
  elevateOnScroll: true,
})
</script>

<template>
  <v-app-bar
    data-cy="appbar"
    flat
    :elevation="1"
    color="surface"           
    :scroll-behavior="elevateOnScroll ? 'elevate' : undefined"
    class="navbar"
  >
    <template #prepend>
      <slot name="left" />
    </template>

    <template #title>
      <slot name="center">
        <span class="brand-text">{{ title }}</span>
      </slot>
    </template>

    <template #append>
      <slot name="right" />
    </template>
  </v-app-bar>
</template>

<style scoped>
.navbar {
  position: fixed;      /* garante que fica no topo */
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

/* usa o token do tema para a cor do texto */
.brand-text {
  font-weight: 700;
  letter-spacing: .04em;
  font-size: 1.1rem;
  color: rgb(var(--v-theme-on-surface));
}
</style>
