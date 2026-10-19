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
      "Helping rebuild a flight booking platform, from the project architecture to production. Leading frontend development, refining the experience, and moving forward as a team.",
    stack: ["Next.js", "React Native", "TypeScript"],
    href: "https://190booking.com",
    linkLabel: "Visit website",
    visual: "booking",
  },
  {
    name: "StockPC",
    category: "Personal project",
    role: "An offline-first desktop app for computer shops",
    description:
      "From a single component to an entire shop. Inventory, customers, cash flow, and warranties in one offline desktop workspace, with optional cloud sync.",
    stack: ["Electron", "React", "SQLite"],
    href: "https://github.com/tnmod/StockPC",
    linkLabel: "Explore source",
    visual: "stock",
  },
  {
    name: "Vietnam Divisions JS",
    category: "Open source",
    role: "Vietnamese administrative data, made accessible",
    description:
      "A JavaScript and TypeScript library for Vietnam’s administrative divisions. Supporting both legacy and current structures, with lookup and migration tools for developers.",
    stack: ["TypeScript", "npm", "Open source"],
    href: "https://github.com/tnmod/vietnam-divisions-js",
    linkLabel: "Explore library",
    visual: "divisions",
  },
] as const;
