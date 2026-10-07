"use client";

import { useParams } from "next/navigation";
import { SujetDetail } from "@/domains/sujets/components/SujetDetail";

export default function SujetPage() {
  const { id } = useParams<{ id: string }>();
  return <SujetDetail sujetId={id} />;
}
