"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/profile");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-[#9AA5BD]">
      Перенаправление в профиль...
    </div>
  );
}

