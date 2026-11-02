"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { favKey } from "@/lib/favs";
import { useFavs } from "./useFavs";

/** Hesaptaki favoriler bu cihaza gelince (ya da biri çıkarılınca) sayfayı yenile */
export function FavSync({ keys }: { keys: string[] }) {
  const { list } = useFavs();
  const router = useRouter();
  const now = list.map(favKey).sort().join("|");
  const server = [...keys].sort().join("|");
  useEffect(() => {
    if (list.length && now !== server) router.refresh();
  }, [now, server, list.length, router]);
  return null;
}
