declare const _globalThis: {
  [key: string]: any;
  Zotero: any;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const Zotero: any;

declare const Cc: any;

declare const Ci: any;

declare const __env__: "production" | "development";
