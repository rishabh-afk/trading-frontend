import { toast } from "react-toastify";
import React, { useEffect } from "react";

const Runtimer = ({
  makeApiCall,
  selectedCompany,
}: {
  makeApiCall: any;
  selectedCompany: any;
}) => {
  useEffect(() => {
    const startTime = new Date();
    startTime.setHours(9, 15, 0, 0); // Set to 9:15 AM

    const endTime = new Date();
    endTime.setHours(23, 30, 0, 0); // Set to 3:30 PM

    const now = new Date();

    let intervalId: NodeJS.Timeout; // Move intervalId declaration here to access in the cleanup

    if (now > startTime && now < endTime) {
      const intervalTime = 3 * 60 * 1000; // 3 minutes in milliseconds
      let currentTime = new Date();

      // If it's already past 9:15, calculate the first interval start time
      let firstIntervalTime = startTime.getTime() - currentTime.getTime();
      if (firstIntervalTime < 0) {
        firstIntervalTime = 0;
      }

      // Start making API calls after 9:15 AM
      intervalId = setInterval(() => {
        // Check if it's past 3:30 PM, stop the interval if it is
        if (new Date() > endTime) {
          clearInterval(intervalId);
          toast.info("End of trading session at 3:30 PM");
          return;
        }
        makeApiCall(selectedCompany); // Make the API call
      }, intervalTime);

      // Initial delay until 9:15 AM
      setTimeout(
        () => {
          makeApiCall(selectedCompany); // Make the first API call
        },
        firstIntervalTime,
        selectedCompany
      );
    } else {
      toast.info("Trading session starts at 9:15 AM");
    }

    // Cleanup function to clear the interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [selectedCompany]);

  return <div></div>;
};

export default Runtimer;
