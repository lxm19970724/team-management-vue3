<!--
 * @Author: lixuming
 * @Date: 2026-09-22 10:26:17
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-09-23 17:27:53
 * @Description: 
 * @FilePath: \team-management-vue\src\layout\index.vue
-->
<template>
    <el-container>
        <el-aside width="auto">
            <Aside />
        </el-aside>
        <el-container>
            <el-header>
                <Header />
            </el-header>
            <el-main>
                <router-view />
            </el-main>
        </el-container>
    </el-container>
</template>

<script lang="ts" setup>
import Aside from './components/Aside.vue'
import Header from './components/Header.vue'
</script>
<style lang="scss" scoped>
.el-container {
    height: 100%;
    .el-main {
        width: 100%;
        height: 100%;
        padding: 0;
    }
}
</style>