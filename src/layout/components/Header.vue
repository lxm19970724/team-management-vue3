<!--
 * @Author: lixuming
 * @Date: 2026-09-22 10:44:17
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-09-22 14:07:16
 * @Description: 
 * @FilePath: \team-management-vue\src\layout\components\Header.vue
-->
<template>
  <div class="header">
    <el-icon style="cursor: pointer;" @click="changeCollapsed">
      <Expand v-if="collapsed" />
      <Fold v-else />
    </el-icon>
  </div>
</template>

<script setup lang="ts">
// 自动导入
import { useLayoutStore } from '@/stores';
import { storeToRefs } from 'pinia';

const { collapsed } = storeToRefs(useLayoutStore())

const changeCollapsed = () => {
  useLayoutStore().setCollapsed(!collapsed.value)
}

</script>

<style lang="scss" scoped>
.header {
  height: 60px;
  display: flex;
  align-items: center;
}
</style>