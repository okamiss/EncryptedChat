import { App as AntApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ReactNode } from "react";
import { useThemeMode } from "../state/ThemeModeContext";
import { getAppTheme } from "../theme/appTheme";

interface AppThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const { mode } = useThemeMode();

  return (
    <ConfigProvider locale={zhCN} theme={getAppTheme(mode)}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
