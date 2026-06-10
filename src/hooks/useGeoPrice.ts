import { useState, useEffect } from "react";

const COUNTRY_CURRENCY: Record<string, { symbol: string; code: string }> = {
  US: { symbol: "$", code: "USD" },
  GB: { symbol: "£", code: "GBP" },
  DE: { symbol: "€", code: "EUR" },
  FR: { symbol: "€", code: "EUR" },
  IT: { symbol: "€", code: "EUR" },
  ES: { symbol: "€", code: "EUR" },
  IN: { symbol: "₹", code: "INR" },
  LK: { symbol: "Rs.", code: "LKR" },
  PK: { symbol: "Rs.", code: "PKR" },
  BD: { symbol: "৳", code: "BDT" },
  AE: { symbol: "AED ", code: "AED" },
  SA: { symbol: "SAR ", code: "SAR" },
  AU: { symbol: "A$", code: "AUD" },
  CA: { symbol: "C$", code: "CAD" },
  JP: { symbol: "¥", code: "JPY" },
  BR: { symbol: "R$", code: "BRL" },
  MX: { symbol: "MX$", code: "MXN" },
  NG: { symbol: "₦", code: "NGN" },
  ZA: { symbol: "R", code: "ZAR" },
  MY: { symbol: "RM", code: "MYR" },
  PH: { symbol: "₱", code: "PHP" },
  ID: { symbol: "Rp", code: "IDR" },
  KR: { symbol: "₩", code: "KRW" },
  TH: { symbol: "฿", code: "THB" },
};

/**
 * Round up to the nearest "nice" increment based on value magnitude:
 * - value > 100  → round up to nearest 500
 * - value > 10   → round up to nearest 50
 * - value > 1    → round up to nearest 0.5
 * - value <= 1   → round up to nearest 0.5
 */
function ceilToNice(value: number): number {
  if (value > 100) {
    return Math.ceil(value / 500) * 500;
  } else if (value > 10) {
    return Math.ceil(value / 50) * 50;
  } else {
    return Math.ceil(value * 2) / 2; // nearest 0.5
  }
}

export function formatNicePrice(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString();
  }
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export interface GeoPriceData {
  /** Pre-formatted price string for $7 baseline */
  price: string;
  flag: string;
  countryName: string;
  /** Currency symbol e.g. "$", "₹", "Rs." */
  symbol: string;
  /** ISO currency code e.g. "USD", "INR" */
  code: string;
  /** Exchange rate from USD, or 1 if USD */
  rate: number;
  /** Whether conversion is ready */
  ready: boolean;
}

/** Convert any USD amount to the user's local currency, rounded nicely */
export function convertUSD(usdAmount: number, rate: number, symbol: string): string {
  if (rate === 1 && symbol === "$") {
    const val = usdAmount;
    if (Number.isInteger(val)) return `$${val}`;
    return `$${val % 1 === 0 ? val : val.toFixed(2)}`;
  }
  const raw = usdAmount * rate;
  const rounded = ceilToNice(raw);
  return `${symbol}${formatNicePrice(rounded)}`;
}

/** Get the raw numeric converted amount (for Stripe) */
export function convertUSDRaw(usdAmount: number, rate: number): number {
  if (rate === 1) return usdAmount;
  return ceilToNice(usdAmount * rate);
}

let cachedResult: GeoPriceData | null = null;
let fetchPromise: Promise<GeoPriceData> | null = null;

async function fetchGeoInfo(): Promise<GeoPriceData> {
  try {
    const geoRes = await fetch("https://ipapi.co/json/");
    const geoData = await geoRes.json();
    const country = geoData?.country_code as string;
    const countryName = (geoData?.country_name as string) || "";

    const flag = country
      ? String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
      : "🌍";

    const curr = COUNTRY_CURRENCY[country];
    if (!curr || curr.code === "USD") {
      return { price: "$7.50", flag, countryName, symbol: "$", code: "USD", rate: 1, ready: true };
    }

    const rateRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const rateData = await rateRes.json();
    const rate = rateData?.rates?.[curr.code];
    if (rate) {
      const raw = 7 * rate;
      const rounded = ceilToNice(raw);
      return {
        price: `${curr.symbol}${formatNicePrice(rounded)}`,
        flag,
        countryName,
        symbol: curr.symbol,
        code: curr.code,
        rate,
        ready: true,
      };
    }
    return { price: "$7.50", flag, countryName, symbol: "$", code: "USD", rate: 1, ready: true };
  } catch {
    return { price: "$7.50", flag: "🌍", countryName: "", symbol: "$", code: "USD", rate: 1, ready: true };
  }
}

export function useGeoPrice() {
  const [info, setInfo] = useState<GeoPriceData | null>(cachedResult);

  useEffect(() => {
    if (cachedResult) {
      setInfo(cachedResult);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchGeoInfo();
    }
    fetchPromise.then((result) => {
      cachedResult = result;
      setInfo(result);
    });
  }, []);

  return info;
}
