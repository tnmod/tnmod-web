export const profile = {
  name: "Nguyễn Phú Tín",
  alias: "tnmod",
  role: "Frontend Developer",
  email: "nguyenphutin.dev@gmail.com",
  github: "https://github.com/tnmod",
  cv: "/documents/nguyen-phu-tin-cv.pdf",
};

export const projects = [
  {
    name: "190booking",
    category: "Professional work",
    role: "Frontend Team Lead · VietNamBooking",
    description:
      "A flight booking platform for searching routes and booking domestic and international journeys. My work spans frontend architecture, feature delivery, code reviews, and production releases as Frontend Team Lead at VietNamBooking.",
    stack: ["Next.js", "React Native", "TypeScript"],
    href: "https://190booking.com",
    linkLabel: "Visit website",
    additionalLinks: [],
    visual: "booking",
  },
  {
    name: "StockPC",
    category: "Personal project",
    role: "An offline-first desktop app for computer shops",
    description:
      "An offline desktop workspace for PC shops, covering complete builds and individual components, customer transactions, used-PC appraisals, cash flow, and sales receipts. Local SQLite storage keeps the shop running offline, with optional Firebase sync for data and images.",
    stack: ["Electron", "React", "TypeScript", "SQLite", "Firebase"],
    href: "https://github.com/tnmod/StockPC",
    linkLabel: "Explore source",
    additionalLinks: [],
    visual: "stock",
  },
  {
    name: "Vietnam Divisions JS",
    category: "Open source",
    role: "Vietnamese administrative data, made accessible",
    description:
      "A published JavaScript and TypeScript library supporting both Vietnam’s legacy 63-province, three-level structure and the newer 34-province, two-level structure. Search provinces and communes, look up administrative codes, and migrate old ward codes and merged provinces through dedicated APIs.",
    stack: ["TypeScript", "ESM / CommonJS", "npm"],
    href: "https://www.npmjs.com/package/vietnam-divisions-js",
    linkLabel: "View on npm",
    additionalLinks: [{ label: "Source & docs", href: "https://github.com/tnmod/vietnam-divisions-js" }],
    visual: "divisions",
  },
] as const;
