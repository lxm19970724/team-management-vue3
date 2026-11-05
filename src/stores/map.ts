/*
 * @Author: lixuming
 * @Date: 2026-11-02 14:47:19
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-11-02 14:48:47
 * @Description: 
 * @FilePath: \team-management-vue\src\stores\map.ts
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const useMapStore = defineStore("map", () => {
  const mapType = ref<string>("3d");

  const setMapType = (value: string) => {
    mapType.value = value;
  };

  return {
    mapType,
    setMapType,
  };
});
