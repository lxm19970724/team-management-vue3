/*
 * @Author: lixuming
 * @Date: 2026-09-23 11:48:33
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-10-30 17:06:15
 * @Description: 
 * @FilePath: \team-management-vue\env.d.ts
 */
// env.d.ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.geojson' {
  const value: Record<string, any>
  export default value
}

declare global {
  interface Window {
    Cesium: typeof import('cesium')
  }
}

declare module 'olcs' {
  export class OLCesium {
    constructor(options: { map: import('ol/Map').default })
    setEnabled(enable: boolean): void
    isEnabled(): boolean
    getOlMap(): import('ol/Map').default
    getViewer(): Cesium.Viewer
    getCesiumScene(): Cesium.Scene
    synchronize(): void
    cesiumViewer: Cesium.Viewer
  }
}

export {}