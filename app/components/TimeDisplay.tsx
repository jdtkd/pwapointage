'use client';

import { useEffect, useState } from "react";

export function TimeDisplay() {
  const [currentTime, setCurrentTime] = useState("--:--:--");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));
      setCurrentDate(now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <p className="text-default-500 text-center sm:text-left mt-2 capitalize">
        {currentDate}
      </p>
      <div className="text-5xl sm:text-6xl font-mono font-bold tracking-wider">
        {currentTime}
      </div>
    </>
  );
} 