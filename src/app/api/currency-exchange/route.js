import { exchangeCurrency } from "@/controllers/tms.app";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const currency = searchParams.get("currency");

    if (!currency) {
      return NextResponse.json(
        { error: "Currency parameter is required" },
        { status: 400 }
      );
    }

    const response = await exchangeCurrency(currency);
    return NextResponse.json({ data: response }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching currency", details: error.message },
      { status: 500 }
    );
  }
}
