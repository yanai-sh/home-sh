declare module 'webgl-fluid' {
  export interface FluidColor {
    r: number;
    g: number;
    b: number;
  }
  export interface FluidConfig {
    SIM_RESOLUTION?: number;
    DYE_RESOLUTION?: number;
    CAPTURE_RESOLUTION?: number;
    DENSITY_DISSIPATION?: number;
    VELOCITY_DISSIPATION?: number;
    PRESSURE?: number;
    PRESSURE_ITERATIONS?: number;
    CURL?: number;
    SPLAT_RADIUS?: number;
    SPLAT_FORCE?: number;
    SPLAT_COUNT?: number;
    SPLAT_COLOR?: FluidColor;
    SHADING?: boolean;
    COLORFUL?: boolean;
    COLOR_UPDATE_SPEED?: number;
    COLOR_PALETTE?: string[];
    HOVER?: boolean;
    BACK_COLOR?: FluidColor;
    TRANSPARENT?: boolean;
    BLOOM?: boolean;
    BLOOM_ITERATIONS?: number;
    BLOOM_RESOLUTION?: number;
    BLOOM_INTENSITY?: number;
    BLOOM_THRESHOLD?: number;
    BLOOM_SOFT_KNEE?: number;
    SUNRAYS?: boolean;
    SUNRAYS_RESOLUTION?: number;
    SUNRAYS_WEIGHT?: number;
    AUTO?: boolean;
    IMMEDIATE?: boolean;
    INTERVAL?: number;
    PAUSED?: boolean;
    TRIGGER?: 'hover' | 'click';
    RGBA?: boolean;
  }
  export default function WebGLFluid(canvas: HTMLCanvasElement, config?: FluidConfig): void;
}
