import { useEffect } from "react";

const FORM_URL = "https://forms.gle/wdAjWwM8GLjc8YqF6";

export default function CareerRedirect() {
  useEffect(() => {
    window.location.replace(FORM_URL);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirecting to our careers form…{" "}
      <a href={FORM_URL} className="ml-1 text-primary underline">
        Click here if not redirected
      </a>
    </div>
  );
}
