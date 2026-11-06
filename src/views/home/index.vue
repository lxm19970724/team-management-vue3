<!--
 * @Author: lixuming
 * @Date: 2026-09-22 10:30:03
 * @LastEditors: lixuming 1493311067@qq.com
 * @LastEditTime: 2026-11-06 16:29:54
 * @Description: 
 * @FilePath: \team-management-vue\src\views\home\index.vue
-->
<template>
    <div class="home">

        <main class="map-layout">
            <div class="left-aside">
                <el-button type="primary" @click="addTianDi">天地图</el-button>
                <el-button type="primary" @click="resetView">重置</el-button>
                <el-button type="primary" @click="changeMapType('3d')">三维</el-button>
                <el-button type="primary" @click="changeMapType('2d')">二维</el-button>
            </div>
            <div class="map-main">
                <!-- OpenLayers 2D容器 -->
                <div ref="olMapRef" v-show="mapStore.mapType === '2d'" class="map-container"></div>
                <!-- Cesium 3D容器 -->
                <div ref="cesiumRef" v-show="mapStore.mapType === '3d'" id="cesiumContainer" class="map-container">
                </div>
            </div>
            <!-- 侧栏占用独立空间，地图只在中间可视区域内进行取景。 -->
            <aside class="right-aside">右侧</aside>
        </main>
    </div>
</template>

<script setup lang="ts">
// 自动导入
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { gismap } from '@/hooks/useMapUtils';
import geoJsonData from '@/json/province.json'
import { useMapStore } from "@/stores/map";
import type { FeatureCollection } from "geojson";

const TIANDITU_URL = import.meta.env.VITE_TIANDITU_URL
const TIANDITU_TK = import.meta.env.VITE_TIANDITU_TK
const TIANDITU_LABEL_URL = import.meta.env.VITE_TIANDITU_LABEL_URL


const mapStore = useMapStore();

const olMapRef = ref<HTMLDivElement | null>(null)
const cesiumRef = ref<HTMLDivElement | null>(null)

const initMap = async () => {
    if (!olMapRef.value || !cesiumRef.value) return

    await gismap.utils.init(
        { ol: olMapRef.value, cesium: cesiumRef.value },
        {
            geoJson: geoJsonData as FeatureCollection,
            geoJsonHighlight: {
                labelFontSize: 12,
                labelColor: '#ffffff',
            },
        },
    )

    const center: [number, number] = geoJsonData.features.filter(item => item.properties.name === '上海市')[0].properties.center as [number, number] || [121.472644, 31.231706]

    const flyPoints: [number, number][] = geoJsonData.features.filter(item => item.properties.name !== '上海市' && item.properties.center)
        .map((feature) => feature.properties.center as [number, number])
    console.log("🚀 ~ initMap ~ flyPoints:", flyPoints)

    await gismap.utils.addFlyLines({
        name: "routes",
        center,
        points: flyPoints,
        direction: "converge", // converge 汇聚  diverge 发散
        color: "#ffbd2e",
        style: "glow", // gradient 渐变  solid 实线
        arcHeight: 1300_000,
        duration: 5000,
    });
}

const tiandituFlag = ref(false)

const addTianDi = () => {
    if (tiandituFlag.value) {
        tiandituFlag.value = false
        gismap.utils.removeAllLayers()
    } else {
        tiandituFlag.value = true
        // 添加天地图图层
        gismap.utils.addLayer({
            title: '天地图-影像图',
            type: 'tianditu-wmts',
            layerId: 1,
            url: TIANDITU_URL,
            tk: TIANDITU_TK,
            layer: 'img',
            matrixSet: 'c',
            zIndex: 1,
            visible: true
        })

        // 2. 添加天地图标注图层
        gismap.utils.addLayer({
            title: '天地图-影像图-标注',
            type: 'tianditu-wmts',
            layerId: 2,
            url: TIANDITU_LABEL_URL,
            tk: TIANDITU_TK,
            layer: 'cia',
            matrixSet: 'c',
            zIndex: 2
        })
    }

}

const resetView = () => {
    gismap.utils.resetView()
    gismap.utils.clearHighLightFeature("下钻高亮")
}

const changeMapType = (type: '2d' | '3d') => {
    gismap.utils.changeMapType(type)
}

onMounted(async () => {
    await nextTick()
    if (!gismap.utils.isInit()) {
        await initMap()
    }
})

onBeforeUnmount(() => {
    gismap.utils.destroy()
})

</script>

<style lang="scss" scoped>
.home {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    .left-aside {
        height: 100%;
        width: 320px;
        min-width: 320px;
        flex: 0 0 320px;
        display: flex;
        box-sizing: border-box;
        background-color: rgb(101, 141, 252, .5);
    }

    .map-layout {
        display: flex;
        flex: 1;
        min-width: 0;
        min-height: 0;
    }

    .map-main {
        position: relative;
        flex: 1;
        min-width: 0;
        min-height: 0;
    }

    .map-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        background-color: #050a2e;
    }

    :deep(.ol-viewport) {
        background-color: #050a2e;
    }

    :deep(.ol-control) {
        display: none;
    }

    :deep(.cesium-viewer-toolbar) {
        display: none !important;
    }

    :deep(.cesium-viewer-bottom) {
        display: none !important;
    }

    :deep(.cesium-viewer-fullscreenContainer) {
        display: none !important;
    }

    .tool {
        position: absolute;
        bottom: 10px;
        left: 0;
    }

    .right-aside {
        height: 100%;
        width: 320px;
        min-width: 320px;
        flex: 0 0 320px;
        display: flex;
        box-sizing: border-box;
        background-color: rgb(101, 141, 252, .5);
    }
}
</style>