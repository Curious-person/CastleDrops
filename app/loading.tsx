import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#e7f6fc] z-[9999]">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-32 h-32 animate-pulse">
          <Image
            src="/images/logo.png"
            alt="Castle Drops Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        
        {/* Loading Bar */}
        <div className="w-48 h-1.5 bg-sky-200/50 rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-full bg-[#2FA9D9] rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
}
