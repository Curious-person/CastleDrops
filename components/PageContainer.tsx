import React from "react";

interface PageContainerProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ title, children, className = "" }: PageContainerProps) {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 print:hidden flex-1 min-w-0 ${className}`}>
      <h1 className="text-4xl font-bold mb-2 text-[#2FA9D9]">{title}</h1>
      <div className="rounded-xl bg-white overflow-hidden">
        {children}
      </div>
    </div>
  );
}
