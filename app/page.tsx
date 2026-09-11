"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalStore } from "@/lib/storage/local-store";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = LocalStore.getCurrentSession();
    if (!session || !session.isAuthenticated) {
      router.replace("/login");
    } else if (session.role === "superadmin") {
      router.replace("/admin");
    } else {
      router.replace("/planner");
    }
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-zinc-400 font-medium">Carregant...</p>
    </div>
  );
}

