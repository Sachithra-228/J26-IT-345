"use client";

import React from "react";

export const Component = () => {
  return (
    <div className="relative aspect-square w-[65px]">
      <span className="animate-loaderAnim absolute rounded-[50px] shadow-[inset_0_0_0_3px] shadow-gray-100" />
      <span className="animate-loaderAnim animation-delay absolute rounded-[50px] shadow-[inset_0_0_0_3px] shadow-gray-100" />
      <style jsx>{`
        @keyframes loaderAnim {
          0% {
            inset: 0 35px 35px 0;
          }
          12.5% {
            inset: 0 35px 0 0;
          }
          25% {
            inset: 35px 35px 0 0;
          }
          37.5% {
            inset: 35px 0 0 0;
          }
          50% {
            inset: 35px 0 0 35px;
          }
          62.5% {
            inset: 0 0 0 35px;
          }
          75% {
            inset: 0 0 35px 35px;
          }
          87.5% {
            inset: 0 0 35px 0;
          }
          100% {
            inset: 0 35px 35px 0;
          }
        }
        .animate-loaderAnim {
          animation: loaderAnim 2.5s infinite;
        }
        .animation-delay {
          animation-delay: -1.25s;
        }
      `}</style>
    </div>
  );
};

export { Component as LumaSpin };
export default Component;
