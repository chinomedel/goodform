import { useQuery } from "@tanstack/react-query";
import { AppConfig } from "@shared/schema";
import { useEffect } from "react";
import { hexToHSL } from "@/lib/color-utils";

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { data: config } = useQuery<AppConfig>({
    queryKey: ["/api/public-config"],
  });

  useEffect(() => {
    if (config?.primaryColor) {
      const hsl = hexToHSL(config.primaryColor);
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--sidebar-primary', hsl);
      document.documentElement.style.setProperty('--sidebar-ring', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
      document.documentElement.style.setProperty('--chart-1', hsl);
    }

    if (config?.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }

    if (config?.appName) {
      document.title = config.appName;
    }
  }, [config]);

  return <>{children}</>;
}
