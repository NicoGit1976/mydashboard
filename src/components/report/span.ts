// Literal class strings so Tailwind generates them (no dynamic col-span-N).
// Shared by the authenticated report page and the public share page.
export const SPAN_CLASS: Record<number, string> = {
  3: "col-span-12 sm:col-span-6 xl:col-span-3",
  4: "col-span-12 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 xl:col-span-8",
  12: "col-span-12",
};
