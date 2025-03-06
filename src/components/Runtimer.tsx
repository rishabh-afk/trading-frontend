import { toast } from "react-toastify";
import React, { useEffect, useRef, useState } from "react";

const Runtimer = ({
  makeApiCall,
  selectedCompany,
}: {
  makeApiCall: (company: any) => void;
  selectedCompany: any;
}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isApiRunning, setIsApiRunning] = useState(false);

  useEffect(() => {
    const getISTTime = () => {
      const now = new Date();
      return new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
    };

    const startTime = getISTTime();
    startTime.setHours(9, 15, 0, 0); // 9:15 AM IST

    const endTime = getISTTime();
    endTime.setHours(15, 30, 0, 0); // 3:30 PM IST

    const now = getISTTime();

    if (now < startTime) {
      toast.info("Trading session starts at 9:15 AM IST");
      return;
    }

    if (now > endTime) {
      toast.info("Trading session ended at 3:30 PM IST");
      return;
    }

    const getNextInterval = () => {
      const currentTime = getISTTime();
      const minutes = currentTime.getMinutes();
      const remainder = minutes % 3;
      const nextRunMinutes =
        remainder === 0 ? minutes : minutes + (3 - remainder);

      currentTime.setMinutes(nextRunMinutes, 0, 0);
      return currentTime;
    };

    const scheduleApiCalls = () => {
      if (isApiRunning) return; // Prevent starting a new interval if it's already running
      setIsApiRunning(true);

      const nextInterval = getNextInterval();
      const delay = nextInterval.getTime() - getISTTime().getTime();

      setTimeout(() => {
        makeApiCall(selectedCompany);
        intervalRef.current = setInterval(() => {
          const nowIST = getISTTime();
          if (nowIST > endTime) {
            clearInterval(intervalRef.current!);
            toast.info("End of trading session at 3:30 PM IST");
            setIsApiRunning(false); // Reset API running state
            return;
          }
          makeApiCall(selectedCompany);
        }, 3 * 60 * 1000); // Every 3 minutes
      }, delay);
    };

    scheduleApiCalls();

    // return () => {
    //   if (intervalRef.current) clearInterval(intervalRef.current);
    //   setIsApiRunning(false); // Cleanup on component unmount or when selectedCompany changes
    // };
  }, [selectedCompany]); // The effect runs whenever selectedCompany changes

  return <div></div>;
};

export default Runtimer;
