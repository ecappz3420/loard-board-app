"use client";
import { useSearchParams } from "next/navigation";

const useQueryId = () => {
  const params = useSearchParams();
  return params.get("id");
};

export default useQueryId;
