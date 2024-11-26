"use client";
import React from "react";

const CalculatedPoints = ({ points }: { points: any }) => {
  return (
    <div className="pb-10 w-1/2">
      <strong className="block text-center pb-10 text-3xl text-yellow-500">
        Calculated Points:
      </strong>
      <div className="text-cyan-500 flex mx-auto justify-center items-center flex-wrap gap-5 font-mono whitespace-pre-line">
        <span>Pivot: {points.pivot}</span>
        <span>BC: {points.bc}</span>
        <span>TC: {points.tc}</span>
        <span>R1: {points.r1}</span>
        <span>R2: {points.r2}</span>
        <span>R3: {points.r3}</span>
        <span>R4: {points.r4}</span>
        <span>S1: {points.s1}</span>
        <span>S2: {points.s2}</span>
        <span>S3: {points.s3}</span>
        <span>S4: {points.s4}</span>
      </div>
    </div>
  );
};

export default CalculatedPoints;
