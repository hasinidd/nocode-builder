import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGeoPrice } from "@/hooks/useGeoPrice";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CYCLE_MS = 7 * 60 * 60 * 1000; // 7 hours

function getTimeLeft() {
  const now = Date.now();
  const remaining = CYCLE_MS - (now % CYCLE_MS);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function PromoBanner() {
  const geo = useGeoPrice();
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!geo || geo.code !== "INR") return null;

  return (
    <div className="w-full bg-primary text-primary-foreground text-center py-2 px-4 text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
      <span>
        ⏳ Get the Quick Discount — only{" "}
        <span className="font-bold">₹650</span> for unlimited messages!{" "}
        <span className="opacity-90">Ends in {time}</span>
      </span>
      <Link to="/setup">
        <Button
          size="sm"
          variant="secondary"
          className="h-6 sm:h-7 px-2.5 sm:px-3 text-[10px] sm:text-xs font-bold gap-1 rounded-full"
        >
          Build Your Agent Now <ArrowRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
}
