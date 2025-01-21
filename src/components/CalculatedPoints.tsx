"use client";
import React from "react";

const CalculatedPoints = ({ points }: { points: any }) => {
  const pointKeys = [
    { key: "pivot", label: "Pivot" },
    { key: "bc", label: "BC" },
    { key: "tc", label: "TC" },
    { key: "r1", label: "R1" },
    { key: "r2", label: "R2" },
    { key: "r3", label: "R3" },
    { key: "r4", label: "R4" },
    { key: "s1", label: "S1" },
    { key: "s2", label: "S2" },
    { key: "s3", label: "S3" },
    { key: "s4", label: "S4" },
  ];

  return (
    <div className="bg-gray-800 text-white rounded-lg p-6 shadow-lg">
      <h2 className="text-center text-2xl font-semibold text-yellow-400 mb-6">
        Calculated Points
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        {pointKeys.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col items-center justify-center p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition"
          >
            <span className="text-sm text-gray-400">{label}</span>
            <span className="text-lg font-bold text-cyan-400">
              {points?.[key] ?? "N/A"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalculatedPoints;
