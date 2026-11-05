import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStore = defineStore("app", () => {
  const leftSiderCollapsed = ref<Boolean>(false);
  const rightSiderCollapsed = ref<Boolean>(false);
  const topSiderCollapsed = ref<Boolean>(false);
  const bottomSiderCollapsed = ref<Boolean>(false);

  const setLeftSiderCollapsed = (value: Boolean) => {
    leftSiderCollapsed.value = value;
  };

  const setRightSiderCollapsed = (value: Boolean) => {
    rightSiderCollapsed.value = value;
  };

  const setTopSiderCollapsed = (value: Boolean) => {
    topSiderCollapsed.value = value;
  };

  const setBottomSiderCollapsed = (value: Boolean) => {
    bottomSiderCollapsed.value = value;
  };

  return {
    leftSiderCollapsed,
    setLeftSiderCollapsed,
    rightSiderCollapsed,
    setRightSiderCollapsed,
    topSiderCollapsed,
    setTopSiderCollapsed,
    bottomSiderCollapsed,
    setBottomSiderCollapsed
  };
});
