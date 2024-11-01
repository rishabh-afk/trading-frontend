"use client";
import React, { useEffect, useRef, memo } from "react";

const TradingViewWidget: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
          "symbol": "NASDAQ:AAPL",
          "interval": "3",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "allow_symbol_change": true,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`;
    if (container.current) {
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="h-screen w-full min-h-screen max-h-screen">
      <div
        ref={container}
        className="tradingview-widget-container h-screen min-h-screen max-h-screen w-full"
      >
        <div className="tradingview-widget-container__widget h-screen min-h-screen max-h-screen w-full"></div>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
