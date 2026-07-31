"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecipesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/products");
  }, [router]);

  return null;
}
