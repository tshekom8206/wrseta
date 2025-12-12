declare module 'feather-icons' {
  export interface FeatherIcon {
    toSvg(attrs?: Record<string, string>): string;
    name: string;
    contents: string;
    tags: string[];
  }

  export interface FeatherIcons {
    [key: string]: FeatherIcon;
  }

  export const icons: FeatherIcons;
  export function replace(options?: Record<string, any>): void;
  export function toSvg(name: string, attrs?: Record<string, string>): string;
}

