export type ExtensionEngineKind =
  | 'mangadex'
  | 'comick'
  | 'madara'
  | 'asura'
  | 'mangathemesia'
  | 'iken'
  | 'unsupported';

export interface ExtensionEngineConfig {
  packageName: string;
  engine: ExtensionEngineKind;
  baseUrl: string;
  /** Madara path segment, default `manga` */
  mangaPath?: string;
  /** MangaThemesia listing path, default `/manga` */
  mangaDirectory?: string;
  apkLocalPath?: string;
  detectedAt: number;
  unsupportedReason?: string;
}
