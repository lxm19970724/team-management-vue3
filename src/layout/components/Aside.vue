<template>
  <div class="aside" :style="{ width: collapsed ? '64px' : '200px' }">
    <div class="logo" :style="{ width: collapsed ? '64px' : '100%' }">
      <img src="@/assets/logo/logo_1.png" alt="" :height="collapsed ? 50 : 150">
    </div>
    <el-menu :default-active="defaultActive" class="el-menu-vertical-demo" :collapse="collapsed">
      <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path" @click="changePath(item)">
        <component :is="item.icon" style="width: 24px;" :style="{marginRight: collapsed ? 0 : '10px'}"/>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
// 自动导入
import { ref } from 'vue';
import { useLayoutStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
const router = useRouter()

interface MenuItem {
  title: string
  icon: string
  path: string
}

const { collapsed } = storeToRefs(useLayoutStore())
const menuList = ref<MenuItem[]>([
  {
    title: '首页',
    icon: 'HomeFilled',
    path: 'home'
  },
  {
    title: '深渊记录',
    icon: 'List',
    path: 'abyss'
  }
])


const defaultActive = ref<string>(sessionStorage.getItem("activeRouter") || "home")
const changePath = (item: MenuItem) => {
  router.push(item.path)
  sessionStorage.setItem("activeRouter", item.path)
}


</script>

<style lang="scss" scoped>
.aside {
  height: 100%;
  .logo {
    display: flex;
    justify-content: center;
  }

  .el-menu {
    border: 0;
  }
}
</style>