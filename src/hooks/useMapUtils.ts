/*
 * @Author: lixuming
 * @Date: 2026-09-16 14:47:34
 * @LastEditors: lixuming 1493311067@qq.com
 * @LastEditTime: 2026-11-06 11:21:13
 * @Description:
 * @FilePath: \team-management-vue\src\hooks\useMapUtils.ts
 */
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
(window as any).Cesium = Cesium;

import { Feature, Map as OlMap, View } from "ol";
import { nextTick, ref } from "vue";
import type { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import type { MapBrowserEvent } from "ol";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import TileWMS from "ol/source/TileWMS";
import { Circle as CircleStyle, Style, Text } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import type { Geometry } from "ol/geom";
import GeometryCollection from "ol/geom/GeometryCollection";
import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import MultiPoint from "ol/geom/MultiPoint";
import MultiPolygon from "ol/geom/MultiPolygon";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { get as getProjection } from "ol/proj";
import { getWidth } from "ol/extent";
import type {
  ExtrudedFeatureOptions,
  FlyLineOptions,
  HighlightFeatureOptions,
  LayerPair,
} from "@/types/mapUtils";
import { ElMessage } from "element-plus";
import type Layer from "ol/layer/Layer";
import { getGeoJsonBbox, bindCesiumCameraLimit } from "@/utils/index";
import GeoJSON from "ol/format/GeoJSON";
import type { FeatureCollection as GeoJSONFeatureCollection } from "geojson";
import { useMapStore } from "@/stores/map";
const mapStore = useMapStore();

interface MapInitContainers {
  /** OpenLayers 二维地图将挂载到的 DOM 元素。 */
  ol: HTMLDivElement;
  /** Cesium 三维地图将挂载到的 DOM 元素。 */
  cesium: HTMLDivElement;
}

interface MapInitOptions {
  /** 二维地图初始中心经纬度，默认定位中国中部附近 */
  center?: [number, number];
  /** 二维地图初始缩放级别 */
  zoom?: number;
  /** 初始化时同时渲染到二维和三维场景的 GeoJSON */
  geoJson?: GeoJSONFeatureCollection;
  /** 二维 fit GeoJSON 时允许的最大缩放级别 */
  geoJsonMaxZoom?: number;
  /** Cesium 哥伦布视图初始取景范围及相机缩放限制 */
  geoJsonView?: {
    /** 三维镜头中心点经纬度 */
    center?: [number, number];
    /** 三维镜头显示范围的最小纬度，用于排除远离主体的离岛 */
    minLatitude?: number;
    /** 相机允许的最近距离，单位米 */
    minZoomDistance?: number;
    /** 相机允许的最远距离，单位米 */
    maxZoomDistance?: number;
    /** 初始视角俯仰角，单位度；默认近垂直俯视，保证地图居中完整 */
    pitch?: number;
  };
  /** 初始化 GeoJSON 的二维/通用高亮样式和标签配置 */
  geoJsonHighlight?: Partial<HighlightFeatureOptions>;
  /** 初始化 GeoJSON 的三维挤出效果配置 */
  geoJsonExtrusion?: Partial<ExtrudedFeatureOptions>;
}

type OlMapEventType = string;
type EventKeyList = EventsKey | EventsKey[];
type MapEventName = OlMapEventType;
type MapEventByType<T extends MapEventName> = T extends
  | "click"
  | "dblclick"
  | "pointermove"
  | "pointerdrag"
  ? MapBrowserEvent<PointerEvent>
  : MapBrowserEvent<PointerEvent>;
// 保存所有事件监听key，销毁自动解绑：同一事件类型只保留一个 listener
const eventKeys = new globalThis.Map<OlMapEventType, EventKeyList>();

type OlCustomLayer = Layer & { layerId?: number | string };

type StyleLike = Style | Style[] | null | undefined;

// ========== 图层类型定义 ==========
export type LayerType = "tianditu-wmts" | "tile-wms" | "vector";

// 分组结构：二维存 ol.Feature[]，三维存 entity id 字符串[]
interface HighlightGroup {
  name: string;
  features: Array<Feature | string>;
}

export interface AddLayerCommonOptions {
  layerId: number;
  zIndex?: number;
  visible?: boolean;
}

// 天地图WMTS参数
export interface TiandituWmtsOptions extends AddLayerCommonOptions {
  title: string;
  type: "tianditu-wmts";
  url: string;
  tk: string;
  layer: string; // img/cia/vec等
  matrixSet: "w" | "c"; // w=EPSG:3857, c=EPSG:4326
  style?: string;
  format?: string;
  wrapX?: boolean;
}

// TileWMS 参数
export interface TileWmsOptions extends AddLayerCommonOptions {
  title: string;
  type: "tile-wms";
  url: string;
  params: Record<string, string | number>;
  serverType?: "geoserver" | "mapserver" | "qgis";
}

// Vector矢量图层
export interface VectorLayerOptions extends AddLayerCommonOptions {
  title: string;
  type: "vector";
  source: VectorSource;
  style?: Style | ((feature: Feature) => Style);
}

export type AddLayerOptions =
  | TiandituWmtsOptions
  | TileWmsOptions
  | VectorLayerOptions;

interface GisMapUtilsType {
  init: (
    containers: MapInitContainers,
    options?: MapInitOptions,
  ) => Promise<void>;
  isInit: () => boolean;
  destroy: () => void;
  getLayerById: (layerId: number | string) => OlCustomLayer | null;
  removeAllLayers: () => void;
  removeLayerById: (layerId: number | string) => void;
  addLayer: (opts: AddLayerOptions) => void;
  toggleLayerVisible: (layerId: number, visible?: boolean) => void;
  addEventListener: <T extends MapEventName>(
    type: T,
    listener: (evt: MapEventByType<T>) => void,
  ) => EventKeyList | undefined;
  removeEventListener: (eventKey: OlMapEventType | EventKeyList) => void;
  getHighlightLayer: () => VectorLayer<VectorSource>;
  highlightGeometry: (
    geometry: Geometry,
    options?: HighlightFeatureOptions,
  ) => void;
  flyTo: (
    target:
      | [number, number]
      | {
          center?: [number, number];
          extent?: [number, number, number, number];
          zoom?: number;
          duration?: number;
          padding?: [number, number, number, number];
        },
  ) => void;
  resetView: (options?: {
    center?: [number, number];
    zoom?: number;
    duration?: number;
  }) => void;
  highlightFeatures: (
    feature: Feature,
    options: HighlightFeatureOptions,
  ) => void;
  highlightExtrudedFeatures: (
    features: Feature | Feature[],
    options: ExtrudedFeatureOptions,
  ) => void;
  addFlyLines: (options: FlyLineOptions) => void;
  clearFlyLines: (name: string) => void;
  clearHighLightFeature: (name?: string) => void;
  changeMapType: (type: "2d" | "3d") => Promise<void>;
}

let mapInstance: OlMap | null = null;
let cesiumInstance: Cesium.Viewer | null = null;
let highlightLayer: VectorLayer<VectorSource> | null = null;
const baseLayersGroup = ref<LayerPair[]>([]);
let pendingOlExtent: [number, number, number, number] | null = null;
let pendingOlMaxZoom = 4;
let initialGeoJsonExtent: [number, number, number, number] | null = null;
let initialGeoJsonMaxZoom = 4;
let initialCesiumView: {
  center: [number, number];
  height: number;
} | null = null;

const isInit = ref(false);
let isInitializing = false;
let initGeneration = 0;

const highlightGroups: HighlightGroup[] = [];
const OL_INITIAL_ZOOM_FACTOR = 0.6;

const fitInitialOlView = (
  view: View,
  extent: [number, number, number, number],
  maxZoom: number,
  size?: [number, number],
) => {
  view.fit(extent, {
    duration: 0,
    padding: [48, 48, 48, 48],
    maxZoom,
    size,
  });
};

const getCesiumViewScale = (
  viewer: Cesium.Viewer,
  center: [number, number],
  width: number,
  height: number,
) => {
  const projection = viewer.scene.mapProjection;
  const centerPosition = projection.project(
    Cesium.Cartographic.fromDegrees(center[0], center[1]),
  );
  const longitudeOffset = center[0] > 179 ? -1 : 1;
  const latitudeOffset = center[1] > 89 ? -1 : 1;
  const longitudePosition = projection.project(
    Cesium.Cartographic.fromDegrees(
      center[0] + longitudeOffset,
      center[1],
    ),
  );
  const latitudePosition = projection.project(
    Cesium.Cartographic.fromDegrees(
      center[0],
      center[1] + latitudeOffset,
    ),
  );
  const unitsPerDegreeX = Math.abs(longitudePosition.x - centerPosition.x);
  const unitsPerDegreeY = Math.abs(latitudePosition.y - centerPosition.y);
  const verticalFov = Cesium.Math.toRadians(60);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * (width / height));

  return Math.max(
    (unitsPerDegreeX * width) / (2 * Math.tan(horizontalFov / 2)),
    (unitsPerDegreeY * height) / (2 * Math.tan(verticalFov / 2)),
  );
};

const getCesiumHeightForOlView = (
  viewer: Cesium.Viewer,
  center: [number, number],
  resolution: number,
  width: number,
  height: number,
) =>
  resolution * getCesiumViewScale(viewer, center, width, height);

const syncOlViewToCesiumHeight = (
  view: View,
  viewer: Cesium.Viewer,
  center: [number, number],
  cameraHeight: number,
  width: number,
  height: number,
) => {
  const resolution =
    (cameraHeight / getCesiumViewScale(viewer, center, width, height)) *
    OL_INITIAL_ZOOM_FACTOR;
  view.setResolution(resolution);
  const initialZoom = view.getZoom();
  if (initialZoom !== undefined) {
    view.setMinZoom(initialZoom);
  }
};

const lockOlViewAtCurrentZoom = (view: View) => {
  const initialZoom = view.getZoom();
  if (initialZoom !== undefined) {
    view.setMinZoom(initialZoom);
  }
};

/** 地图操作接口的具体实现。 */
const utils: GisMapUtilsType = {
  /**
   * 创建 OpenLayers 二维地图和 Cesium 三维地图，并按需加载 GeoJSON。
   *
   * @param containers 二维和三维地图对应的 DOM 容器。
   * @param options 初始视图、GeoJSON、高亮样式和三维挤出参数。
   * @returns 两个地图实例及初始化数据准备完成时 resolve；初始化异常会 reject。
   */
  async init(containers: MapInitContainers, options?: MapInitOptions) {
    if (isInit.value || isInitializing) {
      ElMessage.error("地图正在初始化或已经初始化，请勿重复创建！");
      return;
    }

    isInitializing = true;
    const generation = ++initGeneration;
    let olMap: OlMap | null = null;
    let viewer: Cesium.Viewer | null = null;
    let geoJsonFeatures: Feature[] = [];
    let geoJsonExtrusionOptions: ExtrudedFeatureOptions | null = null;

    try {
      const bbox = options?.geoJson ? getGeoJsonBbox(options.geoJson) : null;
      initialGeoJsonExtent = null;
      initialGeoJsonMaxZoom = 4;
      initialCesiumView = null;
      olMap = new OlMap({
        target: containers.ol,
        view: new View({
          center: options?.center ?? [106.019297427259, 35.14806723230799],
          projection: "EPSG:4326",
          zoom: options?.zoom ?? 19,
          rotation: 0,
          minZoom: 0,
        }),
      });

      viewer = new Cesium.Viewer(containers.cesium, {
        baseLayer: false,
        baseLayerPicker: false,
        animation: false,
        timeline: false,
        sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
        skyBox: false,
        skyAtmosphere: false,
      });
      const backgroundColor =
        Cesium.Color.fromCssColorString("#050a2e") ?? Cesium.Color.BLACK;
      viewer.scene.backgroundColor = backgroundColor;
      viewer.scene.globe.baseColor = backgroundColor;
      mapInstance = olMap;
      cesiumInstance = viewer;

      if (options?.geoJson) {
        geoJsonFeatures = new GeoJSON().readFeatures(options.geoJson, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:4326",
        });
        const initialMapType = mapStore.mapType;
        const highlightOptions: HighlightFeatureOptions = {
          name: "province-geojson",
          fill: true,
          fillColor: "#102b50",
          line: true,
          lineColor: "#3c92c7",
          lineWidth: 2,
          label: true,
          labelField: "name",
          labelColor: "#ffffff",
          labelFontSize: 12,
          ...options.geoJsonHighlight,
        };
        geoJsonExtrusionOptions = {
          name: "province-geojson",
          height: 300_000,
          sideColor: "#102b50",
          fillColor: "#174f91",
          line: true,
          lineColor: "#3c92c7",
          lineWidth: 2,
          glowPower: 0,
          label: highlightOptions.label,
          labelField: highlightOptions.labelField,
          labelColor: highlightOptions.labelColor,
          labelFontSize: highlightOptions.labelFontSize,
          locate: false,
          ...options.geoJsonExtrusion,
        };
        isInit.value = true;
        try {
          mapStore.mapType = "2d";
          geoJsonFeatures.forEach((feature) => {
            utils.highlightFeatures(feature, highlightOptions);
          });

          utils.highlightExtrudedFeatures(geoJsonFeatures, {
            ...geoJsonExtrusionOptions!,
            locate: false,
          });
        } finally {
          mapStore.mapType = initialMapType;
        }
      }

      if (generation !== initGeneration) {
        if (viewer && !viewer.isDestroyed()) viewer.destroy();
        olMap.setTarget(undefined);
        return;
      }

      if (bbox) {
        const [minLon, bboxMinLat, maxLon, maxLat] = bbox;
        const minLatitude = options?.geoJsonView?.minLatitude ?? 17;
        const viewMinLat = Math.min(
          Math.max(bboxMinLat, minLatitude),
          maxLat - 0.1,
        );
        const requestedCenter = options?.geoJsonView?.center ?? [
          (minLon + maxLon) / 2,
          (viewMinLat + maxLat) / 2,
        ];
        const halfWidth = (maxLon - minLon) / 2;
        const halfHeight = (maxLat - viewMinLat) / 2;
        const cesiumBbox: [number, number, number, number] = [
          Math.max(-180, requestedCenter[0] - halfWidth),
          Math.max(-89.5, requestedCenter[1] - halfHeight),
          Math.min(180, requestedCenter[0] + halfWidth),
          Math.min(89.5, requestedCenter[1] + halfHeight),
        ];
        const viewExtent = cesiumBbox;
        initialGeoJsonExtent = viewExtent;
        const maxZoom = options?.geoJsonMaxZoom ?? 4;
        initialGeoJsonMaxZoom = maxZoom;
        const viewportWidth = Math.max(
          containers.ol.clientWidth,
          containers.cesium.clientWidth,
        );
        const viewportHeight = Math.max(
          containers.ol.clientHeight,
          containers.cesium.clientHeight,
        );
        if (viewportWidth && viewportHeight) {
          fitInitialOlView(olMap.getView(), viewExtent, maxZoom, [
            viewportWidth,
            viewportHeight,
          ]);
        } else {
          pendingOlExtent = viewExtent;
          pendingOlMaxZoom = maxZoom;
        }

        const fittedCenter = olMap.getView().getCenter();
        const viewCenter: [number, number] = fittedCenter
          ? [fittedCenter[0], fittedCenter[1]]
          : [
              (viewExtent[0] + viewExtent[2]) / 2,
              (viewExtent[1] + viewExtent[3]) / 2,
            ];
        const activeViewer = viewer;
        const cameraController = activeViewer.scene.screenSpaceCameraController;
        cameraController.enableCollisionDetection = true;
        const cameraWidth = Math.max(
          containers.cesium.clientWidth,
          containers.ol.clientWidth,
          1,
        );
        const cameraHeightPixels = Math.max(
          containers.cesium.clientHeight,
          containers.ol.clientHeight,
          1,
        );
        const olResolution = olMap.getView().getResolution() ?? 1;
        const cameraHeight =
          getCesiumHeightForOlView(
            activeViewer,
            viewCenter,
            olResolution,
            cameraWidth,
            cameraHeightPixels,
          ) * 1.08;
        syncOlViewToCesiumHeight(
          olMap.getView(),
          activeViewer,
          viewCenter,
          cameraHeight,
          cameraWidth,
          cameraHeightPixels,
        );
        cameraController.minimumZoomDistance = Math.min(
          options?.geoJsonView?.minZoomDistance ?? 900_000,
          cameraHeight / 2,
        );
        cameraController.maximumZoomDistance = Math.max(
          cameraController.minimumZoomDistance,
          Math.min(
            options?.geoJsonView?.maxZoomDistance ?? cameraHeight,
            cameraHeight,
          ),
        );
        initialCesiumView = { center: viewCenter, height: cameraHeight };
        activeViewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            viewCenter[0],
            viewCenter[1],
            cameraHeight,
          ),
          duration: 3,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(
              options?.geoJsonView?.pitch ?? -89.5,
            ),
            roll: 0,
          },
        });
        bindCesiumCameraLimit(activeViewer, cesiumBbox);
      } else {
        const olView = olMap.getView();
        const fittedCenter = olView.getCenter() ?? [
          106.019297427259,
          35.14806723230799,
        ];
        const viewCenter: [number, number] = [
          fittedCenter[0],
          fittedCenter[1],
        ];
        const cameraWidth = Math.max(
          containers.cesium.clientWidth,
          containers.ol.clientWidth,
          1,
        );
        const cameraHeightPixels = Math.max(
          containers.cesium.clientHeight,
          containers.ol.clientHeight,
          1,
        );
        const cameraController = viewer.scene.screenSpaceCameraController;
        cameraController.enableCollisionDetection = true;
        const olResolution = olView.getResolution() ?? 1;
        const cameraHeight = getCesiumHeightForOlView(
          viewer,
          viewCenter,
          olResolution,
          cameraWidth,
          cameraHeightPixels,
        );
        syncOlViewToCesiumHeight(
          olView,
          viewer,
          viewCenter,
          cameraHeight,
          cameraWidth,
          cameraHeightPixels,
        );
        cameraController.minimumZoomDistance = Math.min(
          options?.geoJsonView?.minZoomDistance ?? 900_000,
          cameraHeight / 2,
        );
        cameraController.maximumZoomDistance = Math.max(
          cameraController.minimumZoomDistance,
          Math.min(
            options?.geoJsonView?.maxZoomDistance ?? cameraHeight,
            cameraHeight,
          ),
        );
        initialCesiumView = { center: viewCenter, height: cameraHeight };
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            viewCenter[0],
            viewCenter[1],
            cameraHeight,
          ),
          duration: 3,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-89.5),
            roll: 0,
          },
        });
      }

      isInit.value = true;
    } catch (error) {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      olMap?.setTarget(undefined);
      if (generation !== initGeneration) return;

      mapInstance = null;
      cesiumInstance = null;
      highlightLayer = null;
      highlightGroups.length = 0;
      pendingOlExtent = null;
      pendingOlMaxZoom = 4;
      isInit.value = false;
      throw error;
    } finally {
      if (generation === initGeneration) {
        isInitializing = false;
      }
    }
  },

  /**
   * 查询地图实例是否已完成初始化。
   *
   * @returns 地图已初始化时返回 true，否则返回 false。
   */
  isInit() {
    return isInit.value;
  },

  /**
   * 按 layerId 查找二维 OpenLayers 图层。
   *
   * @param layerId 添加图层时指定的唯一标识。
   * @returns 找到的图层；地图未初始化或不存在时返回 null。
   */
  getLayerById(layerId: number | string) {
    if (!mapInstance) return null;
    const allLayers = mapInstance.getLayers().getArray() as OlCustomLayer[];
    return allLayers.find((l) => l.layerId === layerId) ?? null;
  },

  /**
   * 向二维地图添加 WMTS、WMS 或矢量图层。
   *
   * @param opts 图层类型、唯一 ID、数据源及显示配置。
   * @returns 无返回值；地图未初始化或图层 ID 重复时通过消息提示并终止。
   */
  addLayer(opts: AddLayerOptions) {
    const olMap = mapInstance;
    if (!olMap) {
      ElMessage.error("二维地图未初始化，无法添加 OpenLayers 图层！");
      return;
    }
    const { layerId, zIndex = 1, visible = true, title } = opts;

    const existLayer = olMap
      .getLayers()
      .getArray()
      .find((layer) => {
        return layer.get("layerId") === layerId;
      });
    if (existLayer) {
      ElMessage.error(`${title} 图层已存在，跳过新增`);
      return;
    }

    let layer: TileLayer | VectorLayer;

    switch (opts.type) {
      case "tianditu-wmts": {
        const projection = getProjection(
          opts.matrixSet === "w" ? "EPSG:3857" : "EPSG:4326",
        )!;
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / 256;
        const resolutions = new Array(18);
        const matrixIds = new Array(18);
        for (let z = 0; z < 18; z++) {
          resolutions[z] = size / Math.pow(2, z);
          matrixIds[z] = z;
        }
        const origin =
          opts.matrixSet === "w"
            ? [-20037508.342789244, 20037508.342789244]
            : [-180, 90];

        layer = new TileLayer({
          source: new WMTS({
            url: `${opts.url}?tk=${opts.tk}`,
            layer: opts.layer,
            matrixSet: opts.matrixSet,
            format: opts.format ?? "tiles",
            projection,
            tileGrid: new WMTSTileGrid({
              origin,
              resolutions,
              matrixIds,
            }),
            style: opts.style ?? "default",
            wrapX: opts.wrapX ?? true,
          }),
          zIndex,
          visible,
        });
        break;
      }
      case "tile-wms":
        layer = new TileLayer({
          source: new TileWMS({
            url: opts.url,
            params: opts.params,
            serverType: opts.serverType,
          }),
          zIndex,
          visible,
        });
        break;
      case "vector":
        layer = new VectorLayer({
          source: opts.source,
          style: opts.style as StyleLike,
          zIndex,
          visible,
        });
        break;
      default:
        throw new Error(`不支持的图层类型: ${(opts as AddLayerOptions).type}`);
    }

    layer.set("layerId", layerId);
    olMap.addLayer(layer);
    baseLayersGroup.value.push({ baseLayer: layer, labelLayer: null! });
  },

  /**
   * 设置二维图层可见状态。
   *
   * @param layerId 目标图层的唯一 ID。
   * @param visible 显示状态；省略时切换为当前状态的反值。
   * @returns 无返回值；图层不存在时通过消息提示。
   */
  toggleLayerVisible(layerId: number | string, visible?: boolean) {
    if (!mapInstance) {
      ElMessage.error("二维地图未初始化，无法切换图层显隐！");
      return;
    }
    const layer = utils.getLayerById(layerId);
    if (!layer) {
      ElMessage.warning(`未找到layerId=${layerId}的图层`);
      return;
    }
    // 有传visible：直接设置；不传：取反
    const targetVisible = visible ?? !layer.getVisible();
    layer.setVisible(targetVisible);
  },

  /**
   * 移除二维地图中的业务图层，保留专用高亮图层。
   *
   * @returns 无返回值；二维地图未初始化时通过消息提示。
   */
  removeAllLayers() {
    const olMap = mapInstance;
    if (!olMap) {
      ElMessage.error("二维地图未初始化，无法移除图层！");
      return;
    }

    const allLayers = [...olMap.getLayers().getArray()];
    allLayers.forEach((layer) => {
      if (layer !== highlightLayer) {
        olMap.removeLayer(layer);
      }
    });

    baseLayersGroup.value = [];
  },

  /**
   * 按 layerId 移除单个二维图层，并同步清除图层登记信息。
   *
   * @param layerId 要移除图层的唯一 ID。
   * @returns 无返回值；图层不存在时通过消息提示。
   */
  removeLayerById(layerId: number | string) {
    if (!mapInstance) {
      ElMessage.error("地图未初始化，请先初始化地图！");
      return;
    }
    const layer = utils.getLayerById(layerId);
    if (!layer) {
      ElMessage.warning(`未找到layerId=${layerId}的图层`);
      return;
    }
    mapInstance.removeLayer(layer);
    // 清理baseLayersGroup
    const idx = baseLayersGroup.value.findIndex(
      (g) => (g.baseLayer as any).layerId === layerId,
    );
    if (idx > -1) {
      baseLayersGroup.value.splice(idx, 1);
    }
  },

  /**
   * 监听 OpenLayers 地图事件；同一事件类型只保留最新注册的监听器。
   *
   * @param type OpenLayers 事件名称，例如 click、pointermove。
   * @param handler 收到地图事件时执行的回调。
   * @returns OpenLayers 事件 key；地图未初始化时返回 undefined。
   */
  addEventListener<T extends MapEventName>(
    type: T,
    handler: (evt: MapEventByType<T>) => void,
  ) {
    if (!mapInstance) {
      console.warn(`地图实例未初始化，无法绑定事件: ${type}`);
      return;
    }
    const existingKey = eventKeys.get(type);
    if (existingKey) {
      const keys = Array.isArray(existingKey) ? existingKey : [existingKey];
      keys.forEach((key: any) => unByKey(key as any));
      eventKeys.delete(type);
    }
    const key = mapInstance.on(type as any, handler as any) as EventKeyList;
    if (key) {
      eventKeys.set(type, key as any);
    }
    return key;
  },

  /**
   * 按事件名称或事件 key 解绑地图事件监听器。
   *
   * @param eventKey 事件名称，或 addEventListener 返回的一个/多个事件 key。
   * @returns 无返回值。
   */
  removeEventListener(eventKey: OlMapEventType | EventKeyList) {
    if (typeof eventKey === "string") {
      const key = eventKeys.get(eventKey);
      const keys = Array.isArray(key) ? key : key ? [key] : [];
      keys.forEach((item) => unByKey(item));
      eventKeys.delete(eventKey);
      return;
    }
    const targetKeys = Array.isArray(eventKey) ? eventKey : [eventKey];
    targetKeys.forEach((key: any) => {
      const currentEntry = [...eventKeys.entries()].find(([, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values.includes(key as any);
      });
      if (currentEntry) {
        eventKeys.delete(currentEntry[0]);
      }
      unByKey(key as any);
    });
  },

  /**
   * 获取二维高亮矢量图层；首次调用时创建并挂载图层。
   *
   * @returns 用于存放二维高亮要素的矢量图层。
   * @throws 二维地图尚未初始化时抛出错误。
   */
  getHighlightLayer(): VectorLayer<VectorSource> {
    if (!mapInstance) throw new Error("mapInstance 未初始化，请先调用 setMap");
    if (!highlightLayer) {
      highlightLayer = new VectorLayer({
        source: new VectorSource(),
        zIndex: 999,
      });
      mapInstance.addLayer(highlightLayer);
    }
    return highlightLayer;
  },

  /**
   * 将单个几何对象包装为要素，并按当前地图类型绘制高亮。
   *
   * @param geometry OpenLayers 几何对象。
   * @param options 高亮颜色、边界、标签、定位和分组配置。
   * @returns 无返回值。
   */
  highlightGeometry(
    geometry: Geometry,
    options: HighlightFeatureOptions = { name: "" },
  ): void {
    const feature = new Feature({ geometry });
    utils.highlightFeatures(feature, options);
  },

  /**
   * 将当前地图平移/缩放到指定中心点或范围。
   *
   * @param target 经纬度中心点，或包含 center/extent/zoom/duration 的定位配置。
   * @returns 无返回值；二维和三维分别使用 OpenLayers 与 Cesium 相机定位。
   */
  flyTo(
    target:
      | [number, number]
      | {
          center?: [number, number];
          extent?: [number, number, number, number];
          zoom?: number;
          duration?: number;
          padding?: [number, number, number, number];
        },
  ): void {
    if (!isInit.value) {
      ElMessage.error("地图未初始化，请先初始化地图！");
      return;
    }
    const view = mapInstance?.getView();
    const viewer =
      cesiumInstance && !cesiumInstance.isDestroyed()
        ? cesiumInstance
        : null;

    if (Array.isArray(target)) {
      if (mapStore.mapType === "3d" && viewer) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            target[0],
            target[1],
            viewer.camera.positionCartographic.height,
          ),
          duration: 500 / 1000,
        });
      } else if (view) {
        view.animate({
          center: target,
          duration: 500,
          zoom: view.getZoom() ?? 12,
        });
      }
      return;
    }

    const {
      center,
      extent,
      zoom,
      duration = 500,
      padding = [30, 30, 30, 30],
    } = target;

    if (mapStore.mapType === "3d" && viewer) {
      const destination = extent
        ? Cesium.Rectangle.fromDegrees(...extent)
        : center
          ? Cesium.Cartesian3.fromDegrees(
              center[0],
              center[1],
              viewer.camera.positionCartographic.height,
            )
          : null;
      if (destination) {
        viewer.camera.flyTo({
          destination,
          duration: duration / 1000,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
        });
      }
      return;
    }

    if (!view) {
      ElMessage.warning("二维地图未初始化，无法定位视图！");
      return;
    }
    if (extent) {
      view.fit(extent, {
        duration,
        padding,
        maxZoom: zoom ?? 18,
      });
      return;
    }

    if (center) {
      view.animate({
        center,
        duration,
        zoom: zoom ?? view.getZoom() ?? 12,
      });
    }
  },

  /**
   * 将当前地图恢复到默认视图或指定视图。
   *
   * @param options center 为目标经纬度；二维使用 zoom，三维使用 height（米）；
   *                 duration 为动画时长，单位毫秒。
   * @returns 无返回值。
   */
  resetView(options?: {
    center?: [number, number];
    zoom?: number;
    duration?: number;
    height?: number;
  }) {
    if (!isInit.value) {
      ElMessage.error("地图未初始化，请先初始化地图！");
      return;
    }

    const center = options?.center ?? [106.019297427259, 35.14806723230799];
    const duration = options?.duration ?? 500;

    if (mapStore.mapType === "3d" && cesiumInstance) {
      const cesiumCenter =
        options?.center ?? initialCesiumView?.center ?? center;
      cesiumInstance.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          cesiumCenter[0],
          cesiumCenter[1],
          options?.height ??
            (options?.center ? 8_000_000 : initialCesiumView?.height) ??
            8_000_000,
        ),
        duration: duration / 1000,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-89.5),
          roll: 0,
        },
      });
      return;
    }

    if (!mapInstance) {
      ElMessage.warning("二维地图未初始化，无法重置视图！");
      return;
    }
    if (
      initialGeoJsonExtent &&
      options?.center === undefined &&
      options?.zoom === undefined
    ) {
      mapInstance.getView().fit(initialGeoJsonExtent, {
        duration,
        padding: [48, 48, 48, 48],
        maxZoom: initialGeoJsonMaxZoom,
      });
      return;
    }
    mapInstance.getView().animate({
      center,
      zoom: options?.zoom ?? 5,
      duration,
    });
  },

  /**
   * 在当前二维/三维地图中绘制单个要素的填充、边界及标签。
   *
   * @param feature 待高亮的 OpenLayers 要素，必须包含有效几何。
   * @param options 高亮分组、填充/边界样式、标签内容和定位配置。
   * @returns 无返回值；可通过 clearHighLightFeature 按 name 清除。
   */
  highlightFeatures(
    feature: Feature,
    options: HighlightFeatureOptions = {
      name: "",
    },
  ): void {
    if (!mapInstance && !cesiumInstance) {
      ElMessage.error("地图未初始化，请先初始化地图！");
      return;
    }
    const geometry = feature.getGeometry();
    if (!geometry) {
      ElMessage.warning("要素没有可高亮的几何信息！");
      return;
    }

    const {
      name,
      locate = false,
      fill = true,
      fillColor = "rgba(245, 57, 229, 0.4)",
      line = true,
      lineColor = "#000",
      lineWidth = 3,
      clear = false,
      label = false,
      labelField,
      labelText,
      labelColor = "#f73c3c",
      labelFontSize = 12,
      labelOffset = [0, 0],
    } = options;

    if (clear) {
      utils.clearHighLightFeature();
    }

    const resolvedLabelText =
      labelText ?? (labelField ? String(feature.get(labelField) ?? "") : "");

    if (mapStore.mapType === "2d" && mapInstance) {
      const layer = utils.getHighlightLayer();
      const source = layer.getSource()!;

      const isPolygonGeometry =
        geometry instanceof Polygon || geometry instanceof MultiPolygon;
      const createSeparateBoundary = line && isPolygonGeometry;
      const createSeparateLabel =
        label && !!resolvedLabelText && isPolygonGeometry;
      const labelTextStyle =
        label && resolvedLabelText
          ? new Text({
              text: resolvedLabelText,
              fill: new Fill({ color: labelColor }),
              stroke: new Stroke({ color: "rgba(0,0,0,0.7)", width: 2 }),
              font: `${labelFontSize}px sans-serif`,
              offsetY: labelOffset[1],
              offsetX: labelOffset[0],
              textAlign: "center",
              textBaseline: "middle",
            })
          : undefined;

      // 构建样式
      const styleObj: Style = new Style({});
      if (fill) {
        styleObj.setFill(new Fill({ color: fillColor }));
      }
      if (geometry instanceof Point || geometry instanceof MultiPoint) {
        styleObj.setImage(
          new CircleStyle({
            radius: Math.max(lineWidth + 2, 5),
            fill: new Fill({ color: fillColor }),
            stroke: line
              ? new Stroke({ color: lineColor, width: lineWidth })
              : undefined,
          }),
        );
      }
      if (line && !createSeparateBoundary) {
        styleObj.setStroke(
          new Stroke({
            color: lineColor,
            width: lineWidth,
          }),
        );
      }
      if (labelTextStyle && !createSeparateLabel) {
        styleObj.setText(labelTextStyle);
      }

      const cloneFeat = feature.clone();
      cloneFeat.setStyle(styleObj);
      source.addFeature(cloneFeat);
      const addedFeatures: Feature[] = [cloneFeat];

      if (createSeparateBoundary && geometry) {
        const lineCoordinates =
          geometry instanceof MultiPolygon
            ? geometry
                .getPolygons()
                .flatMap((polygon) =>
                  polygon.getLinearRings().map((ring) => ring.getCoordinates()),
                )
            : geometry instanceof Polygon
              ? geometry.getLinearRings().map((ring) => ring.getCoordinates())
              : [];
        if (lineCoordinates.length > 0) {
          const boundaryFeature = cloneFeat.clone();
          boundaryFeature.setGeometry(new MultiLineString(lineCoordinates));
          boundaryFeature.set("altitudeMode", "clampToGround");
          boundaryFeature.setStyle(
            new Style({
              stroke: new Stroke({
                color: lineColor,
                width: lineWidth,
              }),
            }),
          );
          source.addFeature(boundaryFeature);
          addedFeatures.push(boundaryFeature);
        }
      }

      if (createSeparateLabel && isPolygonGeometry && labelTextStyle) {
        const center = feature.get("centroid");
        const centerCoordinate =
          Array.isArray(center) &&
          Number.isFinite(center[0]) &&
          Number.isFinite(center[1])
            ? ([center[0], center[1]] as [number, number])
            : undefined;
        const polygons =
          geometry instanceof MultiPolygon
            ? geometry.getPolygons()
            : [geometry];
        const largestPolygon = polygons.reduce<Polygon | undefined>(
          (largest, polygon) =>
            !largest || polygon.getArea() > largest.getArea()
              ? polygon
              : largest,
          undefined,
        );
        const labelPoint =
          centerCoordinate ??
          largestPolygon?.getInteriorPoint().getCoordinates();

        if (labelPoint) {
          const labelFeature = cloneFeat.clone();
          labelFeature.setGeometry(new Point(labelPoint));
          labelFeature.setStyle(new Style({ text: labelTextStyle }));
          source.addFeature(labelFeature);
          addedFeatures.push(labelFeature);
        }
      }

      if (addedFeatures.length) {
        const groupIndex = highlightGroups.findIndex(
          (group) => group.name === name,
        );
        if (groupIndex >= 0) {
          highlightGroups[groupIndex].features.push(...addedFeatures);
        } else {
          highlightGroups.push({ name, features: addedFeatures });
        }
      }

      // OL定位
      if (locate) {
        mapInstance.getView().fit(geometry.getExtent(), {
          duration: 500,
          padding: [50, 50, 50, 50],
        });
      }
    } else if (mapStore.mapType === "3d" && cesiumInstance) {
      const viewer = cesiumInstance;
      const addedEntityIds: string[] = [];
      const fillCesiumColor =
        Cesium.Color.fromCssColorString(fillColor) ?? Cesium.Color.BLUE;
      const lineCesiumColor =
        Cesium.Color.fromCssColorString(lineColor) ?? Cesium.Color.BLACK;
      const toCartesianPositions = (coordinates: number[][]) =>
        Cesium.Cartesian3.fromDegreesArray(
          coordinates.flatMap((coordinate) => [coordinate[0], coordinate[1]]),
        );
      const addPolyline = (coordinates: number[][]) => {
        if (!line || coordinates.length < 2) return;
        const entity = viewer.entities.add({
          polyline: {
            positions: toCartesianPositions(coordinates),
            clampToGround: true,
            width: lineWidth,
            material: lineCesiumColor,
          },
        });
        addedEntityIds.push(entity.id);
      };
      const addPolygon = (polygon: Polygon) => {
        const linearRings = polygon.getLinearRings();
        const rings = linearRings.map((ring) =>
          toCartesianPositions(ring.getCoordinates()),
        );
        const outerRing = rings[0];
        if (!outerRing?.length || (!fill && !line)) return;

        if (fill) {
          const entity = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(
                outerRing,
                rings
                  .slice(1)
                  .map((positions) => new Cesium.PolygonHierarchy(positions)),
              ),
              material: fillCesiumColor,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });
          addedEntityIds.push(entity.id);
        }

        if (line) {
          linearRings.forEach((ring) => addPolyline(ring.getCoordinates()));
        }
      };
      const addPoint = (coordinates: number[]) => {
        if (
          !Number.isFinite(coordinates[0]) ||
          !Number.isFinite(coordinates[1])
        ) {
          return;
        }
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1],
          ),
          point: {
            pixelSize: Math.max(lineWidth + 4, 8),
            color: fillCesiumColor,
            outlineColor: lineCesiumColor,
            outlineWidth: line ? lineWidth : 0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
        addedEntityIds.push(entity.id);
      };
      const renderGeometry = (currentGeometry: Geometry) => {
        if (currentGeometry instanceof GeometryCollection) {
          currentGeometry.getGeometries().forEach(renderGeometry);
        } else if (currentGeometry instanceof Polygon) {
          addPolygon(currentGeometry);
        } else if (currentGeometry instanceof MultiPolygon) {
          currentGeometry.getPolygons().forEach(addPolygon);
        } else if (currentGeometry instanceof LineString) {
          addPolyline(currentGeometry.getCoordinates());
        } else if (currentGeometry instanceof MultiLineString) {
          currentGeometry
            .getLineStrings()
            .forEach((lineString) => addPolyline(lineString.getCoordinates()));
        } else if (currentGeometry instanceof Point) {
          addPoint(currentGeometry.getCoordinates());
        } else if (currentGeometry instanceof MultiPoint) {
          currentGeometry.getCoordinates().forEach(addPoint);
        }
      };
      renderGeometry(geometry);

      if (label && resolvedLabelText) {
        const center = feature.get("centroid");
        let labelPosition: number[] | undefined =
          Array.isArray(center) &&
          Number.isFinite(center[0]) &&
          Number.isFinite(center[1])
            ? center
            : undefined;

        if (!labelPosition) {
          const polygons =
            geometry instanceof MultiPolygon
              ? geometry.getPolygons()
              : geometry instanceof Polygon
                ? [geometry]
                : geometry instanceof GeometryCollection
                  ? geometry
                      .getGeometries()
                      .flatMap((item) =>
                        item instanceof Polygon
                          ? [item]
                          : item instanceof MultiPolygon
                            ? item.getPolygons()
                            : [],
                      )
                  : [];
          const largestPolygon = polygons.reduce<Polygon | undefined>(
            (largest, polygon) =>
              !largest || polygon.getArea() > largest.getArea()
                ? polygon
                : largest,
            undefined,
          );
          labelPosition = largestPolygon?.getInteriorPoint().getCoordinates();
          if (!labelPosition && geometry instanceof Point) {
            labelPosition = geometry.getCoordinates();
          }
        }

        if (
          labelPosition &&
          Number.isFinite(labelPosition[0]) &&
          Number.isFinite(labelPosition[1])
        ) {
          const labelEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              labelPosition[0],
              labelPosition[1],
            ),
            label: {
              text: resolvedLabelText,
              fillColor:
                Cesium.Color.fromCssColorString(labelColor) ??
                Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
              outlineWidth: 2,
              font: `${labelFontSize}px sans-serif`,
              pixelOffset: new Cesium.Cartesian2(
                labelOffset[0],
                labelOffset[1],
              ),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          addedEntityIds.push(labelEntity.id);
        }
      }

      if (addedEntityIds.length) {
        const groupIndex = highlightGroups.findIndex(
          (group) => group.name === name,
        );
        if (groupIndex >= 0) {
          highlightGroups[groupIndex].features.push(...addedEntityIds);
        } else {
          highlightGroups.push({ name, features: addedEntityIds });
        }
      }

      if (locate && geometry) {
        const extent = geometry.getExtent();
        const bbox = Cesium.Rectangle.fromDegrees(
          extent[0],
          extent[1],
          extent[2],
          extent[3],
        );
        viewer.camera.flyTo({
          destination: bbox,
          duration: 0.5,
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
        });
      }
    }
  },
  /**
   * 在 Cesium 中按中心点和目标点绘制带循环流动动画的弧形飞线。
   *
   * @param options 飞线位置、方向、材质样式和动画参数。
   * @returns 无返回值；可通过 clearFlyLines 或 clearHighLightFeature 按 name 清除。
   */
  addFlyLines(options: FlyLineOptions): void {
    if (!cesiumInstance || cesiumInstance.isDestroyed()) {
      ElMessage.warning("Cesium 地图未初始化，无法添加飞线！");
      return;
    }

    const isValidPosition = (position: [number, number]) =>
      Number.isFinite(position[0]) &&
      Number.isFinite(position[1]) &&
      Math.abs(position[0]) <= 180 &&
      Math.abs(position[1]) <= 90;
    if (
      !options.name ||
      !isValidPosition(options.center) ||
      options.points.length === 0 ||
      options.points.some((point) => !isValidPosition(point))
    ) {
      ElMessage.warning("飞线配置无效，请检查分组名、中心点和目标点！");
      return;
    }

    if (options.clear) {
      utils.clearHighLightFeature(options.name);
    }

    const viewer = cesiumInstance;
    const direction = options.direction ?? "diverge";
    const style = options.style ?? "glow";
    const color =
      Cesium.Color.fromCssColorString(options.color ?? "#ffbd2e") ??
      Cesium.Color.YELLOW;
    const baseColor = color.withAlpha(
      Math.min(Math.max(options.opacity ?? 0.3, 0), 1),
    );
    const width = Math.max(options.width ?? 2, 1);
    const flowWidth = Math.max(options.flowWidth ?? width + 1, 1);
    const glowPower = Math.min(Math.max(options.glowPower ?? 0.2, 0), 1);
    const dashLength = Math.max(options.dashLength ?? 16, 1);
    const arcHeight = Math.max(options.arcHeight ?? 800_000, 0);
    const segments = Math.max(Math.floor(options.segments ?? 64), 8);
    const duration = Math.max(options.duration ?? 2_500, 1) / 1000;
    const trailLength = Math.min(
      Math.max(options.trailLength ?? 0.22, 0.01),
      1,
    );
    const startTime = performance.now();
    const entityIds: string[] = [];

    const getMaterial = (materialColor: Cesium.Color) => {
      if (style === "dash") {
        return new Cesium.PolylineDashMaterialProperty({
          color: materialColor,
          dashLength,
        });
      }
      if (style === "glow") {
        return new Cesium.PolylineGlowMaterialProperty({
          color: materialColor,
          glowPower,
        });
      }
      return materialColor;
    };

    const getProgress = () =>
      (((performance.now() - startTime) / 1000 / duration) % 1 + 1) % 1;

    options.points.forEach((point) => {
      const source =
        direction === "diverge" ? options.center : point;
      const destination =
        direction === "diverge" ? point : options.center;
      const getPosition = (progress: number) => {
        const longitude =
          source[0] + (destination[0] - source[0]) * progress;
        const latitude =
          source[1] + (destination[1] - source[1]) * progress;
        const height = Math.sin(Math.PI * progress) * arcHeight;
        return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
      };
      const positions = Array.from({ length: segments + 1 }, (_, index) =>
        getPosition(index / segments),
      );

      const base = viewer.entities.add({
        polyline: {
          positions,
          width,
          material: getMaterial(baseColor),
        },
      });
      entityIds.push(base.id);

      const flow = viewer.entities.add({
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            const progress = getProgress();
            const start = Math.max(0, progress - trailLength);
            const pointCount = Math.max(
              2,
              Math.ceil((progress - start) * segments),
            );
            return Array.from({ length: pointCount }, (_, index) =>
              getPosition(
                start +
                  ((progress - start) * index) / (pointCount - 1),
              ),
            );
          }, false),
          width: flowWidth,
          material: getMaterial(color),
        },
      });
      entityIds.push(flow.id);

      if (options.showPoint ?? true) {
        const head = viewer.entities.add({
          position: new Cesium.CallbackPositionProperty(
            () => getPosition(getProgress()),
            false,
          ),
          point: {
            pixelSize: Math.max(options.pointSize ?? 8, 1),
            color,
            outlineColor: color.withAlpha(0.35),
            outlineWidth: 4,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        entityIds.push(head.id);
      }
    });

    const group = highlightGroups.find(
      (highlightGroup) => highlightGroup.name === options.name,
    );
    if (group) {
      group.features.push(...entityIds);
    } else {
      highlightGroups.push({ name: options.name, features: entityIds });
    }
    viewer.scene.requestRender();
  },
  clearFlyLines(name: string): void {
    utils.clearHighLightFeature(name);
  },
  /**
   * 在 Cesium 中绘制一个或多个面要素的三维挤出效果。
   *
   * @param inputFeatures 单个 OpenLayers 面要素或面要素数组。
   * @param options 挤出高度、顶面/侧壁/边界样式、标签、定位和分组配置。
   * @returns 无返回值；生成的实体按 name 登记，可使用 clearHighLightFeature 清理。
   */
  highlightExtrudedFeatures(
    inputFeatures: Feature | Feature[],
    options: ExtrudedFeatureOptions,
  ): void {
    if (!cesiumInstance || cesiumInstance.isDestroyed()) {
      ElMessage.warning("Cesium 地图未初始化，无法添加三维挤出效果！");
      return;
    }

    if (options.clear) {
      utils.clearHighLightFeature();
    }

    const viewer = cesiumInstance;
    const features = Array.isArray(inputFeatures)
      ? inputFeatures
      : [inputFeatures];
    const height = Math.max(options.height ?? 12_000, 1);
    const fillColor =
      Cesium.Color.fromCssColorString(options.fillColor ?? "#174f91") ??
      Cesium.Color.fromBytes(23, 79, 145);
    const sideColor =
      Cesium.Color.fromCssColorString(options.sideColor ?? "#102b50") ??
      Cesium.Color.fromBytes(16, 43, 80);
    const lineColor =
      Cesium.Color.fromCssColorString(options.lineColor ?? "#54b8f2") ??
      Cesium.Color.fromBytes(84, 184, 242);
    const entityIds: string[] = [];
    const viewExtent: [number, number, number, number] = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    let hasViewExtent = false;

    const collectPolygons = (geometry: Geometry): Polygon[] => {
      if (geometry instanceof Polygon) return [geometry];
      if (geometry instanceof MultiPolygon) return geometry.getPolygons();
      if (geometry instanceof GeometryCollection) {
        return geometry.getGeometries().flatMap(collectPolygons);
      }
      return [];
    };

    const toHierarchy = (polygon: Polygon) => {
      const rings = polygon
        .getLinearRings()
        .map((ring) =>
          Cesium.Cartesian3.fromDegreesArray(
            ring
              .getCoordinates()
              .flatMap(([longitude, latitude]) => [longitude, latitude]),
          ),
        );
      const outerRing = rings[0];
      if (!outerRing?.length) return null;

      return new Cesium.PolygonHierarchy(
        outerRing,
        rings
          .slice(1)
          .map((positions) => new Cesium.PolygonHierarchy(positions)),
      );
    };

    features.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) return;

      const polygons = collectPolygons(geometry);
      if (polygons.length) {
        const extent = geometry.getExtent();
        viewExtent[0] = Math.min(viewExtent[0], extent[0]);
        viewExtent[1] = Math.min(viewExtent[1], extent[1]);
        viewExtent[2] = Math.max(viewExtent[2], extent[2]);
        viewExtent[3] = Math.max(viewExtent[3], extent[3]);
        hasViewExtent = true;
      }

      if (options.showExtrusion !== false) {
        polygons.forEach((polygon) => {
          const hierarchy = toHierarchy(polygon);
          if (!hierarchy) return;

          const body = viewer.entities.add({
            polygon: {
              hierarchy,
              height: 0,
              extrudedHeight: height,
              material: sideColor,
              outline: false,
            },
          });
          entityIds.push(body.id);

          const top = viewer.entities.add({
            polygon: {
              hierarchy,
              height: height + 10,
              material: fillColor,
              outline: false,
            },
          });
          entityIds.push(top.id);

          if (options.line ?? true) {
            polygon.getLinearRings().forEach((ring) => {
              const coordinates = ring.getCoordinates();
              if (coordinates.length < 2) return;

              const boundary = viewer.entities.add({
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArrayHeights(
                    coordinates.flatMap(([longitude, latitude]) => [
                      longitude,
                      latitude,
                      height + 20,
                    ]),
                  ),
                  width: options.lineWidth ?? 2,
                  material:
                    (options.glowPower ?? 0) > 0
                      ? new Cesium.PolylineGlowMaterialProperty({
                          color: lineColor,
                          glowPower: options.glowPower,
                        })
                      : lineColor,
                },
              });
              entityIds.push(boundary.id);
            });
          }
        });
      }

      if (options.label) {
        const labelText = String(
          options.labelField
            ? (feature.get(options.labelField) ?? "")
            : (feature.get("name") ?? ""),
        );
        const center = feature.get("centroid");
        const largestPolygon = polygons.reduce<Polygon | undefined>(
          (largest, polygon) =>
            !largest || polygon.getArea() > largest.getArea()
              ? polygon
              : largest,
          undefined,
        );
        const interiorPoint = largestPolygon
          ?.getInteriorPoint()
          .getCoordinates();
        const position =
          Array.isArray(center) &&
          Number.isFinite(center[0]) &&
          Number.isFinite(center[1])
            ? center
            : interiorPoint;

        if (labelText && position) {
          const label = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              position[0],
              position[1],
              height + 100,
            ),
            label: {
              text: labelText,
              font: `${options.labelFontSize ?? 12}px sans-serif`,
              fillColor:
                Cesium.Color.fromCssColorString(
                  options.labelColor ?? "#ffffff",
                ) ?? Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineColor: Cesium.Color.BLACK.withAlpha(0.8),
              outlineWidth: 3,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          entityIds.push(label.id);
        }
      }
    });

    if (entityIds.length) {
      const group = highlightGroups.find(
        (highlightGroup) => highlightGroup.name === options.name,
      );
      if (group) {
        group.features.push(...entityIds);
      } else {
        highlightGroups.push({ name: options.name, features: entityIds });
      }
      if ((options.locate ?? true) && hasViewExtent) {
        viewer.camera.flyTo({
          destination: Cesium.Rectangle.fromDegrees(...viewExtent),
          duration: 1.5,
          orientation: {
            heading: Cesium.Math.toRadians(options.heading ?? 0),
            pitch: Cesium.Math.toRadians(options.pitch ?? -45),
            roll: 0,
          },
        });
      }
      viewer.scene.requestRender();
    }
  },
  /**
   * 清除二维/三维高亮要素；不影响普通业务图层或其它 Cesium 实体。
   *
   * @param name 高亮组名称；省略时清除所有已登记的高亮组。
   * @returns 无返回值。
   */
  clearHighLightFeature: (name?: string) => {
    const groupsToClear = name
      ? highlightGroups.filter((group) => group.name === name)
      : [...highlightGroups];
    const source = highlightLayer?.getSource();

    groupsToClear.forEach((group) => {
      group.features.forEach((item) => {
        if (item instanceof Feature) {
          source?.removeFeature(item);
        } else if (cesiumInstance && !cesiumInstance.isDestroyed()) {
          const entity = cesiumInstance.entities.getById(item);
          if (entity) cesiumInstance.entities.remove(entity);
        }
      });
    });

    if (!name) {
      source?.clear();
    }
    groupsToClear.forEach((group) => {
      const index = highlightGroups.indexOf(group);
      if (index >= 0) highlightGroups.splice(index, 1);
    });
  },

  /**
   * 切换当前显示的地图类型，并刷新目标地图的渲染尺寸。
   *
   * @param newType 目标地图类型：2d 为 OpenLayers，3d 为 Cesium。
   * @returns 目标容器更新并完成尺寸刷新后 resolve。
   */
  async changeMapType(newType: "2d" | "3d") {
    if (!isInit.value) {
      ElMessage.warning("请先初始化地图！");
      return;
    }
    if (mapStore.mapType === newType) return;

    mapStore.mapType = newType;

    await nextTick();

    if (newType === "2d" && mapInstance) {
      mapInstance.updateSize();
      if (pendingOlExtent) {
        const size = mapInstance.getSize();
        fitInitialOlView(
          mapInstance.getView(),
          pendingOlExtent,
          pendingOlMaxZoom,
          size ? [size[0], size[1]] : undefined,
        );
        lockOlViewAtCurrentZoom(mapInstance.getView());
        pendingOlExtent = null;
      }
    } else if (
      newType === "3d" &&
      cesiumInstance &&
      !cesiumInstance.isDestroyed()
    ) {
      cesiumInstance.resize();
    }
  },

  /**
   * 解绑事件并销毁二维、三维地图实例，清理高亮和初始化状态。
   *
   * @returns 无返回值；重复调用安全。
   */
  destroy() {
    eventKeys.forEach((key) => unByKey(key));
    eventKeys.clear();
    initGeneration += 1;

    if (cesiumInstance && !cesiumInstance.isDestroyed()) {
      cesiumInstance.destroy();
    }
    if (mapInstance) {
      mapInstance.setTarget(undefined);
    }

    cesiumInstance = null;
    mapInstance = null;
    highlightLayer = null;
    baseLayersGroup.value = [];
    highlightGroups.length = 0;
    pendingOlExtent = null;
    pendingOlMaxZoom = 4;
    initialGeoJsonExtent = null;
    initialGeoJsonMaxZoom = 4;
    initialCesiumView = null;
    isInit.value = false;
    isInitializing = false;
  },
};
export const gismap = { utils };
