/*
 * @Author: lixuming
 * @Date: 2026-09-22 09:51:23
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-11-02 10:11:56
 * @Description:
 * @FilePath: \team-management-vue\vite.config.ts
 */
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vite";
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    cesium()
  ],
  // 路径别名
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  }
});
