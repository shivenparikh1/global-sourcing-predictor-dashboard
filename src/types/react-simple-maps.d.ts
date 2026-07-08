declare module "react-simple-maps" {
  import type { ComponentType, ReactNode, SVGProps } from "react";

  type Coordinates = [number, number];

  interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    children?: ReactNode;
  }

  interface ZoomableGroupProps {
    center?: Coordinates;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    children?: ReactNode;
    onMoveEnd?: (position: { coordinates: Coordinates; zoom: number }) => void;
  }

  interface GeographiesProps {
    geography: unknown;
    children: (props: { geographies: Array<Record<string, unknown> & { rsmKey: string }> }) => ReactNode;
  }

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: Record<string, unknown>;
    style?: Record<string, SVGProps<SVGPathElement>>;
  }

  interface LineProps extends SVGProps<SVGPathElement> {
    from: Coordinates;
    to: Coordinates;
  }

  interface MarkerProps {
    coordinates: Coordinates;
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Line: ComponentType<LineProps>;
  export const Marker: ComponentType<MarkerProps>;
}
