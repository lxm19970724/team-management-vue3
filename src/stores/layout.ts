/*
 * @Author: lixuming
 * @Date: 2026-09-15 14:59:41
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-09-22 11:41:39
 * @Description: layout store
 * @FilePath: \team-management-vue\src\stores\layout.ts
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutStore = defineStore("layout", () => {
  const collapsed = ref<Boolean>(false);

  const setCollapsed = (value: Boolean) => {
    collapsed.value = value;
  };

  

  return {
    collapsed,
    setCollapsed
  };
});