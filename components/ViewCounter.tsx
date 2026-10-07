"use client";

import { useEffect } from "react";

export default function ViewCounter({ id }: { id: string }) {
  useEffect(() => {
    fetch(`/api/views/${id}`, { method: "POST" }).catch(() => {});
  }, [id]);
  return null;
}
