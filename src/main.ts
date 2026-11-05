/*
 * @Author: lixuming
 * @Date: 2026-09-22 09:51:23
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-10-30 11:34:27
 * @Description: 
 * @FilePath: \team-management-vue\src\main.ts
 */
import { createApp } from "vue";
import "./style.css";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import "element-plus/dist/index.css";
import { createPinia } from "pinia";
import router from "./router/index.ts";
import App from "./App.vue";

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus);
app.use(router)
app.use(createPinia())
app.mount("#app");
