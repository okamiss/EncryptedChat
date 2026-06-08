import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useThemeMode } from "../state/ThemeModeContext";

export function ThemeModeButton() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Button
      aria-label={mode === "dark" ? "切换到亮色主题" : "切换到暗黑模式"}
      icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
      onClick={toggleMode}
    />
  );
}
