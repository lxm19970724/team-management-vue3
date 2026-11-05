/*
 * @Author: lixuming
 * @Date: 2026-10-30 16:38:50
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-11-05 11:43:30
 * @Description:
 * @FilePath: \team-management-vue\src\utils\index.ts
 */
import { bbox as turfBbox } from "@turf/turf";
import * as Cesium from "cesium";

/** 用turf计算geojson包围盒 */
export function getGeoJsonBbox(geo: any): [number, number, number, number] {
  return turfBbox(geo) as [number, number, number, number];
}

/** Cesium相机边界限制：拖出bbox自动回弹 */
export function bindCesiumCameraLimit(
  viewer: Cesium.Viewer,
  bbox: [number, number, number, number],
) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const rect = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat);
  let isMoving = false;

  viewer.camera.changed.addEventListener(() => {
    if (isMoving) return;
    const camRect = viewer.camera.computeViewRectangle();
    if (!camRect) return;

    // 判断当前视口是否超出设定范围
    if (!Cesium.Rectangle.intersection(rect, camRect)) {
      isMoving = true;
      viewer.camera.flyTo({
        destination: rect,
        duration: 0.3,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-89.5),
          roll: 0,
        },
        complete: () => {
          isMoving = false;
        },
        cancel: () => {
          isMoving = false;
        },
      });
    }
  });
}
