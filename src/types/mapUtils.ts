/*
 * @Author: lixuming
 * @Date: 2026-09-23 10:34:13
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-09-23 11:26:54
 * @Description: 
 * @FilePath: \team-management-vue\src\types\mapUtils.ts
 */
export interface HighlightFeatureOptions {
  /** 高亮分组名称，用于单独清除该组高亮 */
  name: string;
  /** 是否定位到要素（地图缩放平移至该要素范围） */
  locate?: boolean;
  /** 是否填充面 */
  fill?: boolean;
  /** 填充颜色，rgba字符串 */
  fillColor?: string;
  /** 是否显示边线 */
  line?: boolean;
  /** 边线颜色 */
  lineColor?: string;
  /** 边线宽度 */
  lineWidth?: number;
  /** 是否清除之前所有高亮 */
  clear?: boolean;
  /** 是否显示 label 文本 */
  label?: boolean;
  /** label 文本字段名，从 feature 属性中取值 */
  labelField?: string;
  /** label 文本内容，优先级高于 labelField */
  labelText?: string;
  /** label 字体颜色 */
  labelColor?: string;
  /** label 字体大小 */
  labelFontSize?: number;
  /** label 偏移 */
  labelOffset?: [number, number];
}

export interface ExtrudedFeatureOptions {
  /** 高亮分组名称，可通过 clearHighLightFeature(name) 清理 */
  name: string;
  /** 挤出高度，单位米 */
  height?: number;
  /** 是否绘制挤出面和边界；关闭后可仅显示标签 */
  showExtrusion?: boolean;
  /** 立体侧壁颜色 */
  sideColor?: string;
  /** 顶面颜色 */
  fillColor?: string;
  /** 发光边界颜色 */
  lineColor?: string;
  /** 是否绘制边界线 */
  line?: boolean;
  /** 边界宽度 */
  lineWidth?: number;
  /** 边界发光强度，范围 0-1 */
  glowPower?: number;
  /** 是否显示要素名称 */
  label?: boolean;
  /** 标签字段名 */
  labelField?: string;
  /** 标签颜色 */
  labelColor?: string;
  /** 标签字号 */
  labelFontSize?: number;
  /** 是否定位到要素 */
  locate?: boolean;
  /** 定位视角倾斜角，单位度，负值向下俯视 */
  pitch?: number;
  /** 定位视角方向，单位度 */
  heading?: number;
  /** 添加前是否清除全部高亮 */
  clear?: boolean;
}

export interface FlyLineOptions {
  /** 飞线分组名，用于单独清理 */
  name: string;
  /** 飞线中心点 [经度, 纬度] */
  center: [number, number];
  /** 与中心点连接的目标点列表 [经度, 纬度] */
  points: [number, number][];
  /** diverge 从中心向外飞；converge 从目标点汇聚到中心 */
  direction?: "diverge" | "converge";
  /** 飞线颜色，支持 CSS 颜色格式 */
  color?: string;
  /** 飞线样式 */
  style?: "solid" | "glow" | "dash";
  /** 静态底线宽度 */
  width?: number;
  /** 静态底线透明度，范围 0-1 */
  opacity?: number;
  /** Glow 材质发光强度，范围 0-1 */
  glowPower?: number;
  /** 虚线间距 */
  dashLength?: number;
  /** 弧线最高点高度，单位米 */
  arcHeight?: number;
  /** 每条弧线采样点数 */
  segments?: number;
  /** 流动动画周期，单位毫秒 */
  duration?: number;
  /** 流动亮线长度，占整条弧线比例，范围 0-1 */
  trailLength?: number;
  /** 流动亮线宽度 */
  flowWidth?: number;
  /** 是否显示流动端点 */
  showPoint?: boolean;
  /** 流动端点像素大小 */
  pointSize?: number;
  /** 添加前是否清理同名分组 */
  clear?: boolean;
}

// 图层组：底图 + 标注图层一对
export interface LayerPair {
  baseLayer: any;
  labelLayer: any;
}
