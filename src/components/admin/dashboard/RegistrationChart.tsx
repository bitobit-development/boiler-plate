"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/admin/providers/SocketProvider";
import { cn } from "@/lib/utils";

interface ChartData {
  date: string;
  registrations: number;
  verified: number;
}

// Mock data for the chart
const generateMockData = (): ChartData[] => {
  const data: ChartData[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      registrations: Math.floor(Math.random() * 50) + 30,
      verified: Math.floor(Math.random() * 40) + 20,
    });
  }

  return data;
};

export function RegistrationChart() {
  const [data, setData] = useState<ChartData[]>(generateMockData());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { socket, isConnected } = useSocket();

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.registrations, d.verified)));
  const scale = 250 / maxValue; // Chart height is 250px

  // Listen for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      socket.on("chart:update", (newData: ChartData[]) => {
        setData(newData);
      });

      return () => {
        socket.off("chart:update");
      };
    }
  }, [socket, isConnected]);

  return (
    <div className="relative">
      {/* Chart Container */}
      <div className="relative h-[250px] w-full">
        {/* Grid lines */}
        <div className="absolute inset-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute w-full border-t border-border/50"
              style={{ top: `${i * 25}%` }}
            >
              <span className="absolute -left-8 -top-2 text-xs text-muted-foreground">
                {Math.round(maxValue * (1 - i * 0.25))}
              </span>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="relative flex h-full items-end justify-between gap-1">
          {data.map((item, index) => (
            <div
              key={index}
              className="relative flex flex-1 flex-col items-center gap-0.5"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Verified bar */}
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-300",
                  hoveredIndex === index
                    ? "bg-green-500"
                    : "bg-green-500/70"
                )}
                style={{
                  height: `${item.verified * scale}px`,
                }}
              />
              {/* Total registrations bar */}
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-300",
                  hoveredIndex === index
                    ? "bg-blue-500"
                    : "bg-blue-500/70"
                )}
                style={{
                  height: `${(item.registrations - item.verified) * scale}px`,
                }}
              />

              {/* Tooltip */}
              {hoveredIndex === index && (
                <div className="absolute bottom-full mb-2 z-10 rounded-lg bg-popover p-2 text-xs shadow-lg border">
                  <div className="font-medium">{item.date}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Total: {item.registrations}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Verified: {item.verified}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="absolute -bottom-6 flex w-full justify-between text-xs text-muted-foreground">
          {data
            .filter((_, i) => i % 5 === 0 || i === data.length - 1)
            .map((item, index, arr) => (
              <span
                key={index}
                style={{
                  left: `${(data.indexOf(item) / (data.length - 1)) * 100}%`,
                }}
                className="absolute transform -translate-x-1/2"
              >
                {item.date}
              </span>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-8 justify-center">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-blue-500" />
          <span className="text-sm text-muted-foreground">New Registrations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span className="text-sm text-muted-foreground">Verified</span>
        </div>
      </div>
    </div>
  );
}