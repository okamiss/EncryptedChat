import { theme as antdTheme, type ThemeConfig } from "antd";

export type AppThemeMode = "light" | "dark";

const fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

const lightTokens = {
  colorPrimary: "#2563eb",
  colorBgBase: "#f5f7fb",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorText: "#172033",
  colorTextSecondary: "#667085",
  colorBorder: "#d8dee8",
  borderRadius: 8,
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.12)",
  controlHeight: 36,
  fontSize: 14,
  fontFamily
};

const darkTokens = {
  colorPrimary: "#5b8cff",
  colorBgBase: "#0f141d",
  colorBgContainer: "#171d29",
  colorBgElevated: "#1d2533",
  colorText: "#eef2f8",
  colorTextSecondary: "#9aa7b8",
  colorBorder: "#2d3645",
  borderRadius: 8,
  boxShadow: "0 20px 48px rgba(0, 0, 0, 0.36)",
  controlHeight: 36,
  fontSize: 14,
  fontFamily
};

export function getAppTheme(mode: AppThemeMode): ThemeConfig {
  const dark = mode === "dark";
  const token = dark ? darkTokens : lightTokens;

  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token,
    components: {
      Layout: {
        bodyBg: token.colorBgBase,
        headerBg: token.colorBgContainer,
        siderBg: dark ? "#111722" : "#ffffff"
      },
      Menu: {
        itemBorderRadius: 8,
        itemHeight: 40
      },
      Button: {
        borderRadius: 8,
        controlHeight: 36
      },
      Input: {
        borderRadius: 8,
        controlHeight: 36
      },
      Modal: {
        borderRadiusLG: 10,
        contentBg: token.colorBgElevated,
        headerBg: token.colorBgElevated
      },
      Drawer: {
        colorBgElevated: token.colorBgElevated
      },
      Tabs: {
        horizontalItemPadding: "10px 0"
      },
      Badge: {
        dotSize: 7
      }
    }
  };
}
