<template>
  <router-view></router-view>
</template>

<style>
  body {
    margin: 0;
  }

  #application {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :root {
    --max-content-width: 1264px;
  }

  .flex-1 {
    flex: 1;
  }

  .v-messages__message {
    line-height: 16px;
  }
</style>
