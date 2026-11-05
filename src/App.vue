<!--
 * @Author: lixuming
 * @Date: 2026-09-22 09:51:23
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-09-22 11:00:12
 * @Description: 
 * @FilePath: \team-management-vue\src\App.vue
-->
<script setup lang="ts">
import { ref } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const locale = ref(zhCn)
</script>

<template>
  <el-config-provider :locale="locale">
    <router-view/>
  </el-config-provider>
</template>
