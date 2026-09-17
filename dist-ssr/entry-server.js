import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { lazy, useState, useRef, useEffect, useMemo, Suspense } from "react";
const TABLES = {
  Hero: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=96924857&single=true&output=csv",
  Home: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=301709255&single=true&output=csv",
  Venue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=680145671&single=true&output=csv",
  Menu: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=253177342&single=true&output=csv",
  FullMenu: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=771274199&single=true&output=csv",
  LiveArtists: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=453466059&single=true&output=csv",
  FeaturedEvents: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=1550669419&single=true&output=csv",
  Hours: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=331828726&single=true&output=csv",
  FAQs: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=0&single=true&output=csv",
  Reviews: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=999102820&single=true&output=csv",
  Shopping: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=1638245179&single=true&output=csv",
  ShoppingCategories: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_1mxQZuPoLoZaCxEuE6gFlnu_6lgtTTHrzgaiYfi1Mv-7n3MNQ9xHUJn4qwy9zBmp6tOBHxJVL0F5/pub?gid=1336320144&single=true&output=csv"
};
const tableCache = /* @__PURE__ */ new Map();
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => String(cell || "").trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    value += char;
  }
  row.push(value);
  if (row.some((cell) => String(cell || "").trim() !== "")) rows.push(row);
  return rows;
}
const HEADER_ALIASES = {
  subtitle: "subtitle",
  sub_title: "subtitle",
  mediaurl: "mediaURL",
  media_url: "mediaURL",
  mediaurl2: "mediaURL2",
  media_url_2: "mediaURL2",
  mediaurl3: "mediaURL3",
  media_url_3: "mediaURL3",
  cloudinaryurl: "cloudinaryURL",
  sortorder: "sortOrder",
  sort_order: "sortOrder",
  artisturl: "artistURL",
  artist_url: "artistURL",
  websiteurl: "websiteURL",
  website_url: "websiteURL",
  spotifyurl: "spotifyURL",
  spotify_url: "spotifyURL",
  buttontext: "buttonText",
  button_text: "buttonText",
  pdfurl: "pdfURL",
  pdf_url: "pdfURL"
};
function cleanHeader(header) {
  const raw = String(header || "").trim().replace(/^\uFEFF/, "");
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return HEADER_ALIASES[key] || raw;
}
function cleanValue(value) {
  const trimmed = String(value ?? "").trim();
  if (/^(true|yes|y|on)$/i.test(trimmed)) return true;
  if (/^(false|no|n|off)$/i.test(trimmed)) return false;
  return trimmed;
}
function isVisibleRow(row) {
  if (!row || row.visible === void 0 || row.visible === "") return true;
  if (typeof row.visible === "boolean") return row.visible;
  return !/^(false|no|n|off|0)$/i.test(String(row.visible).trim());
}
function sortBySortOrder(rows) {
  return [...rows].sort((a, b) => Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999));
}
function visibleRows(rows) {
  return sortBySortOrder((rows || []).filter(isVisibleRow));
}
async function loadTable(url, { force = false } = {}) {
  if (!url || !/^https:\/\//i.test(url)) throw new Error(`Invalid Google Sheet CSV URL: ${url || "(empty)"}`);
  if (!force && tableCache.has(url)) return tableCache.get(url);
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load Google Sheet table: ${response.status}`);
  const csvText = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(csvText)) throw new Error("Google returned HTML instead of CSV. Republish this tab as CSV.");
  const parsedRows = parseCsv(csvText);
  if (!parsedRows.length) return [];
  const headers = parsedRows[0].map(cleanHeader);
  const dataRows = parsedRows.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cleanValue(cells[index]);
    });
    return row;
  }).filter((row) => Object.values(row).some((value) => value !== ""));
  tableCache.set(url, dataRows);
  return dataRows;
}
const MenuPdfViewer = lazy(() => import("./assets/MenuPdfViewer-D6zix4iJ.js"));
function cloudinaryImageUrl(url) {
  if (!url || typeof url !== "string") {
    return url;
  }
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  if (url.includes("/image/upload/f_auto,q_auto/")) {
    return url;
  }
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}
function cloudinaryVideoUrl(url) {
  if (!url || typeof url !== "string") {
    return url;
  }
  if (!url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) {
    return url;
  }
  if (url.includes("/video/upload/f_auto,q_auto/")) {
    return url;
  }
  return url.replace("/video/upload/", "/video/upload/f_auto,q_auto/");
}
function CloudImage({ src, ...props }) {
  return /* @__PURE__ */ jsx("img", { src: cloudinaryImageUrl(src), ...props });
}
function InstagramIcon({ size = 18 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("rect", { x: "2", y: "2", width: "20", height: "20", rx: "5", ry: "5" }),
    /* @__PURE__ */ jsx("path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }),
    /* @__PURE__ */ jsx("line", { x1: "17.5", y1: "6.5", x2: "17.51", y2: "6.5" })
  ] });
}
function FacebookIcon({ size = 18 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" }) });
}
function StarIcon({ size = 18 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "dark", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }) });
}
function ArrowLeftIcon({ size = 18 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M19 12H5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 19l-7-7 7-7" })
  ] });
}
function ArrowRightIcon({ size = 18 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { d: "M5 12h14" }),
    /* @__PURE__ */ jsx("path", { d: "M12 5l7 7-7 7" })
  ] });
}
function ChevronDownIcon({ size = 18 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M6 9l6 6 6-6" }) });
}
function ChevronUpIcon({ size = 18 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M18 15l-6-6-6 6" }) });
}
function getSectionId(label) {
  return label.toLowerCase().trim().split(" ").filter(Boolean).join("-");
}
function parseEventDate(dateText) {
  const raw = String(dateText || "").trim();
  if (!raw) {
    return null;
  }
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const lower = raw.toLowerCase();
  const monthIndex = monthNames.findIndex((month) => lower.includes(month));
  const dayMatch = lower.match(/[0-9]{1,2}/);
  if (monthIndex >= 0 && dayMatch) {
    const yearMatch = lower.match(/\b(20[0-9]{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : (/* @__PURE__ */ new Date()).getFullYear();
    const day = Number(dayMatch[0]);
    const parsedDate = new Date(year, monthIndex, day);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}
function formatEventDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });
}
function addMonthsClamped(date, monthCount = 1) {
  const originalDay = date.getDate();
  const targetMonthFirst = new Date(date.getFullYear(), date.getMonth() + monthCount, 1);
  const daysInTargetMonth = new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth() + 1,
    0
  ).getDate();
  return new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth(),
    Math.min(originalDay, daysInTargetMonth)
  );
}
function expandRecurringFeaturedEvents(events) {
  const validRepeats = /* @__PURE__ */ new Set(["daily", "weekly", "monthly"]);
  return events.flatMap((event) => {
    const start = parseEventDate(event.startDate || event.date);
    if (!start) {
      return [];
    }
    const repeat = String(event.repeat || "").trim().toLowerCase();
    const end = parseEventDate(event.endDate);
    if (!validRepeats.has(repeat) || !end || end < start) {
      return [{
        ...event,
        date: formatEventDate(start),
        calendarDate: start,
        occurrenceKey: `${event.title}|${start.toISOString().slice(0, 10)}`
      }];
    }
    const occurrences = [];
    let occurrenceDate = new Date(start);
    let safetyCount = 0;
    while (occurrenceDate <= end && safetyCount < 400) {
      occurrences.push({
        ...event,
        date: formatEventDate(occurrenceDate),
        calendarDate: new Date(occurrenceDate),
        occurrenceKey: `${event.title}|${occurrenceDate.toISOString().slice(0, 10)}`
      });
      if (repeat === "daily") {
        occurrenceDate = new Date(
          occurrenceDate.getFullYear(),
          occurrenceDate.getMonth(),
          occurrenceDate.getDate() + 1
        );
      } else if (repeat === "weekly") {
        occurrenceDate = new Date(
          occurrenceDate.getFullYear(),
          occurrenceDate.getMonth(),
          occurrenceDate.getDate() + 7
        );
      } else {
        occurrenceDate = addMonthsClamped(occurrenceDate, 1);
      }
      safetyCount += 1;
    }
    return occurrences;
  });
}
function featuredOccurrenceScheduleText(event) {
  const repeat = String(event.repeat || "").trim().toLowerCase();
  const repeatLabels = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly"
  };
  return [
    event.date || event.startDate,
    event.time,
    repeatLabels[repeat] || ""
  ].filter(Boolean).join(" • ");
}
function buildCalendarMonths(events, monthCount = 3) {
  const today = /* @__PURE__ */ new Date();
  const months = [];
  for (let offset = 0; offset < monthCount; offset += 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarCells = [];
    for (let index = 0; index < firstDay; index += 1) {
      calendarCells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayEvents = events.filter((event) => {
        const eventDate = event.calendarDate || parseEventDate(event.date || event.startDate);
        return eventDate && eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day;
      });
      calendarCells.push({ day, events: dayEvents });
    }
    months.push({
      label: monthDate.toLocaleString("default", { month: "long", year: "numeric" }),
      cells: calendarCells
    });
  }
  return months;
}
function buildTimeOptions(startHour = 14, endHour = 21) {
  const options = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) continue;
      const value = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
      const date = new Date(2e3, 0, 1, hour, minute);
      const label = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      options.push({ value, label });
    }
  }
  return options;
}
const PRIVATE_EVENT_TIME_OPTIONS = buildTimeOptions(14, 21);
const JOB_EXPERIENCE_TYPES = [
  "Bartender",
  "Busser",
  "Cook",
  "Dishwasher",
  "Host / Hostess",
  "Prep Cook",
  "Server"
];
const RESOS_BOOKING_URL = "https://board.resos.com/booking";
function SectionCarousel({ images, altPrefix, heightClass = "h-[500px]" }) {
  const safeImages = (images || []).filter(Boolean);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (safeImages.length <= 1) return void 0;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % safeImages.length);
    }, 4e3);
    return () => clearInterval(timer);
  }, [safeImages.length]);
  if (!safeImages.length) return null;
  return /* @__PURE__ */ jsxs("div", { className: `relative overflow-hidden rounded-3xl shadow-lg ${heightClass}`, children: [
    safeImages.map((src, imageIndex) => /* @__PURE__ */ jsx(
      CloudImage,
      {
        src,
        alt: `${altPrefix} ${imageIndex + 1}`,
        className: `absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${imageIndex === index ? "opacity-100" : "opacity-0"}`
      },
      src
    )),
    safeImages.length > 1 && /* @__PURE__ */ jsx("div", { className: "absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10", children: safeImages.map((_, imageIndex) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => setIndex(imageIndex),
        "aria-label": `Show image ${imageIndex + 1}`,
        className: `h-2.5 rounded-full transition-all ${imageIndex === index ? "bg-white w-6" : "bg-white/50 w-2.5 hover:bg-white/80"}`
      },
      imageIndex
    )) })
  ] });
}
function App() {
  var _a;
  const [tableStatus, setTableStatus] = useState({});
  const [showPrivateEventForm, setShowPrivateEventForm] = useState(false);
  const [showCateringForm, setShowCateringForm] = useState(false);
  const [privateEventStatus, setPrivateEventStatus] = useState({ state: "idle", message: "" });
  const [cateringStatus, setCateringStatus] = useState({ state: "idle", message: "" });
  const [contactStatus, setContactStatus] = useState({ state: "idle", message: "" });
  const [jobsStatus, setJobsStatus] = useState({ state: "idle", message: "" });
  const [showContactModal, setShowContactModal] = useState(false);
  const [showJobsModal, setShowJobsModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [happyHourImageIndex, setHappyHourImageIndex] = useState(0);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showMenuPdfModal, setShowMenuPdfModal] = useState(false);
  const [externalMusicEvents, setExternalMusicEvents] = useState([]);
  const [externalReviews, setExternalReviews] = useState([]);
  const [activeShopCategory, setActiveShopCategory] = useState(null);
  const [externalShoppingItems, setExternalShoppingItems] = useState([]);
  const [externalShopCategories, setExternalShopCategories] = useState(null);
  const [selectedShopItems, setSelectedShopItems] = useState([]);
  const [externalBusinessHours, setExternalBusinessHours] = useState([]);
  const [externalHappyHourHours, setExternalHappyHourHours] = useState([]);
  const [externalFeaturedEvents, setExternalFeaturedEvents] = useState([]);
  const [externalFaqItems, setExternalFaqItems] = useState([]);
  const [externalMenuItems, setExternalMenuItems] = useState([]);
  const [externalHeroRows, setExternalHeroRows] = useState([]);
  const [externalHomeRows, setExternalHomeRows] = useState([]);
  const [externalFullMenuRows, setExternalFullMenuRows] = useState([]);
  const [reviewScrollPaused, setReviewScrollPaused] = useState(false);
  const [shopScrollPaused, setShopScrollPaused] = useState(false);
  const [expandedMenuCategories, setExpandedMenuCategories] = useState({});
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const reviewSliderRef = useRef(null);
  const shopSliderRef = useRef(null);
  const shopScrollResumeTimerRef = useRef(null);
  const activeHero = externalHeroRows[0] || {};
  const heroTitle = activeHero.title || "";
  const heroSubtitle = activeHero.subtitle || activeHero.subTitle || "";
  const heroMediaUrl = activeHero.mediaURL || activeHero.cloudinaryURL || "";
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const heroVideoUrl = cloudinaryVideoUrl(heroMediaUrl);
  const heroPosterUrl = activeHero.posterURL || "";
  const homeRows = visibleRows(externalHomeRows);
  const findHomeRow = (category) => homeRows.find(
    (row) => String(row.category || "").replace(/[^a-z0-9]/gi, "").toLowerCase() === String(category).replace(/[^a-z0-9]/gi, "").toLowerCase()
  ) || {};
  const homeImages = (row) => [row.mediaURL, row.mediaURL2, row.mediaURL3].filter(Boolean).slice(0, 3);
  const happyHourHome = findHomeRow("HappyHour");
  const privatePartiesHome = findHomeRow("PrivateParties");
  const cateringHome = findHomeRow("Catering");
  const fullMenuRow = visibleRows(externalFullMenuRows)[0] || {};
  const fullMenuButtonText = fullMenuRow.buttonText || fullMenuRow.title || "";
  const fullMenuUrl = fullMenuRow.url || fullMenuRow.pdfURL || fullMenuRow.mediaURL || "";
  const [venueSlides, setVenueSlides] = useState([]);
  const [activeVenueSlide, setActiveVenueSlide] = useState(0);
  useEffect(() => {
    if (venueSlides.length <= 1) return void 0;
    const interval = setInterval(() => {
      setActiveVenueSlide(
        (current) => current === venueSlides.length - 1 ? 0 : current + 1
      );
    }, 6e3);
    return () => clearInterval(interval);
  }, [venueSlides.length]);
  const handleInquirySubmit = async (event, formKey, setStatus) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = Object.fromEntries(formData.entries());
    const attachments = [];
    const resumeFile = formData.get("resume");
    if (resumeFile instanceof File && resumeFile.size > 0) {
      if (resumeFile.size > 5 * 1024 * 1024) {
        setStatus({ state: "error", message: "Resume file must be 5MB or smaller." });
        return;
      }
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
      ];
      if (resumeFile.type && !allowedTypes.includes(resumeFile.type)) {
        setStatus({ state: "error", message: "Please attach a PDF, Word document, or text file." });
        return;
      }
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = () => reject(new Error("Unable to read the resume file."));
        reader.readAsDataURL(resumeFile);
      });
      attachments.push({
        filename: resumeFile.name,
        content,
        contentType: resumeFile.type || "application/octet-stream"
      });
      delete fields.resume;
    }
    setStatus({ state: "sending", message: "Sending inquiry..." });
    try {
      const response = await fetch("/.netlify/functions/send-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formKey, fields, attachments })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to send inquiry.");
      }
      form.reset();
      setStatus({ state: "success", message: "Thanks — your inquiry has been sent." });
    } catch (error) {
      setStatus({
        state: "error",
        message: error.message || "Something went wrong. Please try again."
      });
    }
  };
  const defaultOrderUrl = "https://www.toasttab.com/local/order/maine-cheese-board-5-shapleigh-road-suite-108/r-3675ebdf-fcc5-43fb-a265-99af7ccdd2e3?diningOption=takeout";
  const orderOnlineUrl = defaultOrderUrl;
  const giftCardUrl = "https://order.toasttab.com/egiftcards/maine-cheese-board-5-shapleigh-road-suite-108";
  const navItems = ["Home", "Menu", "Happy Hour", "Events", "Shop", "Order Online"];
  const businessHours = externalBusinessHours;
  const happyHourHours = externalHappyHourHours;
  const menuItems = externalMenuItems;
  const menuCategories = Array.from(new Set(menuItems.map((item) => item.category)));
  const signaturePreviewCategories = menuCategories.slice(0, 3);
  const toggleMenuCategory = (category) => {
    setExpandedMenuCategories((current) => ({
      ...current,
      [category]: !current[category]
    }));
  };
  const reviews = externalReviews;
  const musicEvents = externalMusicEvents;
  const featuredEvents = externalFeaturedEvents;
  const faqItems = externalFaqItems;
  useEffect(() => {
    if (faqItems.length > 0) {
      setOpenFaqIndex((current) => current === null || current >= faqItems.length ? 0 : current);
    } else {
      setOpenFaqIndex(null);
    }
  }, [faqItems.length]);
  useEffect(() => {
    var _a2;
    const scriptId = "board-faq-structured-data";
    (_a2 = document.getElementById(scriptId)) == null ? void 0 : _a2.remove();
    if (!faqItems.length) return void 0;
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [faqItems]);
  const recurringFeaturedCalendarEvents = useMemo(
    () => expandRecurringFeaturedEvents(featuredEvents),
    [featuredEvents]
  );
  const featuredEventCards = useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = recurringFeaturedCalendarEvents.filter((event) => event.calendarDate && event.calendarDate >= today).sort((a, b) => a.calendarDate - b.calendarDate);
    const eventsToShow = upcoming.length ? upcoming : [...recurringFeaturedCalendarEvents].sort(
      (a, b) => a.calendarDate - b.calendarDate
    );
    const recurringSeriesShown = /* @__PURE__ */ new Set();
    const uniqueHomepageEvents = eventsToShow.filter((event) => {
      const repeat = String(event.repeat || "").trim().toLowerCase();
      const isRecurring = ["daily", "weekly", "monthly"].includes(repeat) && Boolean(event.endDate);
      if (!isRecurring) {
        return true;
      }
      const seriesKey = [
        event.title,
        event.startDate,
        event.endDate,
        repeat,
        event.time
      ].join("|");
      if (recurringSeriesShown.has(seriesKey)) {
        return false;
      }
      recurringSeriesShown.add(seriesKey);
      return true;
    });
    return uniqueHomepageEvents.slice(0, 6);
  }, [recurringFeaturedCalendarEvents]);
  const calendarEvents = useMemo(
    () => [
      ...musicEvents.map((event) => ({ ...event, type: "Music" })),
      ...recurringFeaturedCalendarEvents.map((event) => ({ ...event, type: "Featured" }))
    ],
    [musicEvents, recurringFeaturedCalendarEvents]
  );
  const calendarMonths = useMemo(
    () => buildCalendarMonths(calendarEvents, 3),
    [calendarEvents]
  );
  const happyHourImages = homeImages(happyHourHome).map((src, index) => ({ src, alt: `Happy Hour ${index + 1}` }));
  const shopItems = externalShopCategories || [];
  const shopData = useMemo(() => {
    const groupedItems = externalShoppingItems.reduce((groups, item) => {
      const category = String(item.category || "").trim().toLowerCase();
      if (!category) return groups;
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
      return groups;
    }, {});
    return groupedItems;
  }, [externalShoppingItems]);
  const activeShopTitle = ((_a = shopItems.find(
    (item) => item.category === activeShopCategory
  )) == null ? void 0 : _a.title) || activeShopCategory;
  const isPickupItem = (item) => String(item.availabilityText || "").trim().toLowerCase() === "order for pickup";
  const activeShopHasPickupItems = (shopData[activeShopCategory] || []).some(isPickupItem);
  const scrollShopCategories = (direction) => {
    const slider = shopSliderRef.current;
    if (!slider) return;
    setShopScrollPaused(true);
    window.clearTimeout(shopScrollResumeTimerRef.current);
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
    const pageDistance = Math.max(320, slider.clientWidth * 0.9);
    let nextScrollLeft;
    if (direction < 0) {
      nextScrollLeft = slider.scrollLeft <= 1 ? maxScrollLeft : Math.max(0, slider.scrollLeft - pageDistance);
    } else {
      nextScrollLeft = slider.scrollLeft >= maxScrollLeft - 1 ? 0 : Math.min(maxScrollLeft, slider.scrollLeft + pageDistance);
    }
    slider.scrollTo({ left: nextScrollLeft, behavior: "smooth" });
    shopScrollResumeTimerRef.current = window.setTimeout(
      () => setShopScrollPaused(false),
      1200
    );
  };
  useEffect(() => () => {
    window.clearTimeout(shopScrollResumeTimerRef.current);
  }, []);
  useEffect(() => {
    if (happyHourImages.length <= 1) return void 0;
    const interval = setInterval(() => {
      setHappyHourImageIndex((current) => current === happyHourImages.length - 1 ? 0 : current + 1);
    }, 4e3);
    return () => clearInterval(interval);
  }, [happyHourImages.length]);
  useEffect(() => {
    const reviewSlider = reviewSliderRef.current;
    if (!reviewSlider || reviewScrollPaused) {
      return void 0;
    }
    let animationFrameId;
    let lastTimestamp = null;
    const pixelsPerSecond = 35;
    const step = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const elapsedSeconds = (timestamp - lastTimestamp) / 1e3;
      lastTimestamp = timestamp;
      const maxScrollLeft = reviewSlider.scrollWidth - reviewSlider.clientWidth;
      if (maxScrollLeft > 0) {
        if (reviewSlider.scrollLeft >= maxScrollLeft - 1) {
          reviewSlider.scrollLeft = 0;
        } else {
          reviewSlider.scrollLeft += pixelsPerSecond * elapsedSeconds;
        }
      }
      animationFrameId = window.requestAnimationFrame(step);
    };
    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [reviewScrollPaused, reviews.length]);
  useEffect(() => {
    const shopSlider = shopSliderRef.current;
    if (!shopSlider || shopItems.length <= 3 || shopScrollPaused) {
      return void 0;
    }
    let animationFrameId;
    let lastTimestamp = null;
    const pixelsPerSecond = 28;
    const step = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const elapsedSeconds = (timestamp - lastTimestamp) / 1e3;
      lastTimestamp = timestamp;
      const maxScrollLeft = shopSlider.scrollWidth - shopSlider.clientWidth;
      if (maxScrollLeft > 0) {
        if (shopSlider.scrollLeft >= maxScrollLeft - 1) {
          shopSlider.scrollLeft = 0;
        } else {
          shopSlider.scrollLeft += pixelsPerSecond * elapsedSeconds;
        }
      }
      animationFrameId = window.requestAnimationFrame(step);
    };
    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [shopItems.length, shopScrollPaused]);
  useEffect(() => {
    let cancelled = false;
    const applyIfMounted = (setter, value) => {
      if (!cancelled) {
        setter(value);
      }
    };
    const tableMediaUrl = (row) => row.mediaURL || row.cloudinaryURL || row.image || row.photo || "";
    const handleLoadError = (label, error, onInitialError, isInitialLoad) => {
      console.error(`Unable to load ${label} table:`, error);
      applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: "error" }));
      if (isInitialLoad && onInitialError) {
        onInitialError();
      }
    };
    const loadAllTables = async ({ force = false, isInitialLoad = false } = {}) => {
      const options = { force };
      const loadNamedTable = (label, url) => {
        if (isInitialLoad) {
          applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: "loading" }));
        }
        return loadTable(url, options).then((rows) => {
          applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: "ready" }));
          return rows;
        });
      };
      const tableLoads = [
        loadNamedTable("Hero", TABLES.Hero).then((rows) => {
          applyIfMounted(setExternalHeroRows, visibleRows(rows));
          applyIfMounted(setHeroVideoFailed, false);
        }).catch((error) => handleLoadError(
          "Hero",
          error,
          () => applyIfMounted(setExternalHeroRows, []),
          isInitialLoad
        )),
        loadNamedTable("Home", TABLES.Home).then((rows) => applyIfMounted(setExternalHomeRows, visibleRows(rows))).catch((error) => handleLoadError(
          "Home",
          error,
          () => applyIfMounted(setExternalHomeRows, []),
          isInitialLoad
        )),
        loadNamedTable("FullMenu", TABLES.FullMenu).then((rows) => applyIfMounted(setExternalFullMenuRows, visibleRows(rows))).catch((error) => handleLoadError(
          "FullMenu",
          error,
          () => applyIfMounted(setExternalFullMenuRows, []),
          isInitialLoad
        )),
        loadNamedTable("Venue", TABLES.Venue).then((rows) => {
          const slides = visibleRows(rows).map((row) => ({
            title: row.title || "",
            subtitle: row.subtitle || row.subTitle || "",
            image: tableMediaUrl(row) || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop"
          })).filter((slide) => slide.title && slide.image);
          if (slides.length) {
            applyIfMounted(setVenueSlides, slides);
          }
        }).catch((error) => handleLoadError("Venue", error, null, isInitialLoad)),
        loadNamedTable("Menu", TABLES.Menu).then((rows) => {
          const menuRows = visibleRows(rows).map((row) => ({
            category: row.category || "",
            item: row.item || "",
            description: row.description || "",
            price: row.price || "",
            image: tableMediaUrl(row)
          })).filter((item) => item.category && item.item);
          applyIfMounted(setExternalMenuItems, menuRows);
        }).catch((error) => handleLoadError(
          "Menu",
          error,
          () => applyIfMounted(setExternalMenuItems, []),
          isInitialLoad
        )),
        loadNamedTable("LiveArtists", TABLES.LiveArtists).then((rows) => {
          const artistRows = visibleRows(rows).map((row) => ({
            title: row.title || "",
            date: row.time ? `${row.date || ""} - ${row.time}` : row.date || "",
            url: row.artistURL || row.websiteURL || row.url || "#",
            spotifyURL: row.spotifyURL || "",
            image: tableMediaUrl(row)
          })).filter((event) => event.title && event.date);
          applyIfMounted(setExternalMusicEvents, artistRows);
        }).catch((error) => handleLoadError(
          "LiveArtists",
          error,
          () => applyIfMounted(setExternalMusicEvents, []),
          isInitialLoad
        )),
        loadNamedTable("FeaturedEvents", TABLES.FeaturedEvents).then((rows) => {
          const featuredRows = visibleRows(rows).map((row) => ({
            title: row.title || "",
            category: row.category || "",
            startDate: row.startDate || row.date || "",
            endDate: row.endDate || "",
            repeat: String(row.repeat || "").trim().toLowerCase(),
            time: row.time || "",
            description: row.subtitle || row.subTitle || row.description || "",
            sortOrder: Number(row.sortOrder || 999)
          })).filter((event) => event.title && event.startDate).sort((a, b) => a.sortOrder - b.sortOrder);
          applyIfMounted(setExternalFeaturedEvents, featuredRows);
        }).catch((error) => handleLoadError(
          "FeaturedEvents",
          error,
          () => applyIfMounted(setExternalFeaturedEvents, []),
          isInitialLoad
        )),
        loadNamedTable("Hours", TABLES.Hours).then((rows) => {
          const hourRows = visibleRows(rows);
          const generalHours = hourRows.filter((row) => String(row.category || "").toLowerCase() === "general").map((row) => ({ days: row.day || row.days || "", hours: row.time || row.hours || "" })).filter((row) => row.days && row.hours);
          const happyHours = hourRows.filter((row) => String(row.category || "").toLowerCase() === "happy hour").map((row) => ({ days: row.day || row.days || "", hours: row.time || row.hours || "" })).filter((row) => row.days && row.hours);
          applyIfMounted(setExternalBusinessHours, generalHours);
          applyIfMounted(setExternalHappyHourHours, happyHours);
        }).catch((error) => handleLoadError(
          "Hours",
          error,
          () => {
            applyIfMounted(setExternalBusinessHours, []);
            applyIfMounted(setExternalHappyHourHours, []);
          },
          isInitialLoad
        )),
        loadNamedTable("FAQs", TABLES.FAQs).then((rows) => {
          const faqRows = visibleRows(rows).map((row) => ({
            question: row.question || "",
            answer: row.answer || "",
            sortOrder: Number(row.sortOrder || 999),
            active: "yes",
            category: row.category || ""
          })).filter((item) => item.question && item.answer);
          applyIfMounted(setExternalFaqItems, faqRows);
        }).catch((error) => handleLoadError(
          "FAQs",
          error,
          () => applyIfMounted(setExternalFaqItems, []),
          isInitialLoad
        )),
        loadNamedTable("Reviews", TABLES.Reviews).then((rows) => {
          const reviewRows = visibleRows(rows).map((row) => ({
            quote: row.review || row.quote || "",
            author: row.reviewer || row.author || "",
            stars: Number(row.stars || 5)
          })).filter((review) => review.quote && review.author);
          applyIfMounted(setExternalReviews, reviewRows);
        }).catch((error) => handleLoadError(
          "Reviews",
          error,
          () => applyIfMounted(setExternalReviews, []),
          isInitialLoad
        )),
        loadNamedTable("ShoppingCategories", TABLES.ShoppingCategories).then((rows) => {
          const visibleCategoryRows = rows.filter(
            (row) => String(row.visible || "").trim().toLowerCase() === "true"
          );
          const categoryRows = visibleCategoryRows.map((row) => {
            const category = String(row.category || "").trim().toLowerCase();
            return {
              category,
              title: row.heading || row.title || "",
              action: row.buttonText || row.action || "",
              description: row.subtitle || row.description || "",
              image: tableMediaUrl(row),
              sortOrder: Number(row.sortOrder || 999)
            };
          }).filter((item) => item.category && item.title && item.action && item.image).sort((a, b) => a.sortOrder - b.sortOrder);
          applyIfMounted(setExternalShopCategories, categoryRows);
        }).catch((error) => handleLoadError(
          "ShoppingCategories",
          error,
          () => applyIfMounted(setExternalShopCategories, null),
          isInitialLoad
        )),
        loadNamedTable("Shopping", TABLES.Shopping).then((rows) => {
          const visibleShoppingRows = rows.filter(
            (row) => String(row.visible || "").trim().toLowerCase() === "true"
          );
          const shoppingRows = visibleShoppingRows.map((row) => ({
            category: String(row.category || "").trim().toLowerCase(),
            name: row.item || row.name || "",
            price: row.price || "",
            availabilityText: row.availabilityText || "",
            photo: tableMediaUrl(row),
            sortOrder: Number(row.sortOrder || 999)
          })).filter((item) => item.category && item.name && item.price).sort((a, b) => a.sortOrder - b.sortOrder);
          applyIfMounted(setExternalShoppingItems, shoppingRows);
        }).catch((error) => handleLoadError(
          "Shopping",
          error,
          () => {
            applyIfMounted(setExternalShoppingItems, []);
          },
          isInitialLoad
        ))
      ];
      await Promise.all(tableLoads);
    };
    loadAllTables({ isInitialLoad: true });
    const refreshInterval = window.setInterval(() => {
      loadAllTables({ force: true });
    }, 5 * 60 * 1e3);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, []);
  const navHref = (item) => item === "Order Online" ? orderOnlineUrl : "#" + getSectionId(item);
  const navTarget = (item) => item === "Order Online" ? "_blank" : void 0;
  const navRel = (item) => item === "Order Online" ? "noopener noreferrer" : void 0;
  const getShopItemKey = (item) => String(activeShopCategory) + "|" + item.name + "|" + item.price;
  const isShopItemSelected = (item) => selectedShopItems.some((selected) => selected.key === getShopItemKey(item));
  const toggleShopItem = (item) => {
    const key = getShopItemKey(item);
    setSelectedShopItems((current) => {
      if (current.some((selected) => selected.key === key)) {
        return current.filter((selected) => selected.key !== key);
      }
      return [...current, { key, category: activeShopCategory, name: item.name, price: item.price }];
    });
  };
  const getPurchaseUrl = () => {
    return orderOnlineUrl;
  };
  const unavailableTables = Object.entries(tableStatus).filter(([, status]) => status === "error").map(([label]) => label);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-stone-50 text-stone-800 font-sans", children: [
    /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6", children: [
        /* @__PURE__ */ jsxs("a", { href: "#home", className: "leading-tight shrink-0", "aria-label": "Board Wine & Cheese home", children: [
          /* @__PURE__ */ jsx("div", { className: "text-2xl md:text-3xl font-serif tracking-[0.18em] text-stone-900", children: "BOARD" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] md:text-xs uppercase tracking-[0.14em] text-stone-500 font-medium whitespace-nowrap", children: "Wine - Cheese - Charcuterie" })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: "hidden lg:flex gap-7 text-sm font-medium", "aria-label": "Primary navigation", children: navItems.map((item) => /* @__PURE__ */ jsx("a", { href: navHref(item), target: navTarget(item), rel: navRel(item), className: "hover:text-stone-500 transition-colors whitespace-nowrap", children: item }, item)) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowReservationModal(true), className: "hidden sm:inline-flex items-center justify-center min-w-[170px] bg-stone-900 text-white px-6 py-3.5 rounded-full text-sm font-medium text-center hover:bg-stone-700 transition-colors whitespace-nowrap shadow-sm", children: "Reserve a Table" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowMobileMenu((current) => !current), className: "lg:hidden border border-stone-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-stone-100 transition-colors", "aria-expanded": showMobileMenu, "aria-controls": "mobile-navigation", children: showMobileMenu ? "Close" : "Menu" })
        ] })
      ] }),
      showMobileMenu && /* @__PURE__ */ jsx("nav", { id: "mobile-navigation", className: "lg:hidden border-t border-stone-200 bg-white px-6 py-5 shadow-sm", "aria-label": "Mobile navigation", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 text-sm font-medium", children: [
        navItems.map((item) => /* @__PURE__ */ jsx("a", { href: navHref(item), target: navTarget(item), rel: navRel(item), onClick: () => setShowMobileMenu(false), className: "py-2 border-b border-stone-100 last:border-b-0 hover:text-stone-500 transition-colors", children: item }, item)),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          setShowMobileMenu(false);
          setShowReservationModal(true);
        }, className: "mt-2 bg-stone-900 text-white text-center px-5 py-3 rounded-full hover:bg-stone-700 transition-colors", children: "Reserve a Table" })
      ] }) })
    ] }),
    unavailableTables.length > 0 && /* @__PURE__ */ jsxs("div", { role: "status", className: "border-b border-amber-300 bg-amber-50 px-6 py-3 text-center text-sm text-amber-950", children: [
      "Some current information is temporarily unavailable (",
      unavailableTables.join(", "),
      "). Please check back shortly."
    ] }),
    /* @__PURE__ */ jsxs("main", { id: "main-content", children: [
      /* @__PURE__ */ jsxs("section", { id: "home", "aria-labelledby": "home-heading", className: "relative h-[70vh] flex items-center justify-center overflow-hidden", children: [
        heroPosterUrl && /* @__PURE__ */ jsx(
          CloudImage,
          {
            src: heroPosterUrl,
            alt: "Board Wine and Cheese wine bar atmosphere in Kittery Maine",
            className: "absolute inset-0 w-full h-full object-cover"
          }
        ),
        heroVideoUrl && !heroVideoFailed && /* @__PURE__ */ jsx(
          "video",
          {
            className: "absolute inset-0 w-full h-full object-cover",
            autoPlay: true,
            muted: true,
            loop: true,
            playsInline: true,
            poster: heroPosterUrl,
            onError: () => setHeroVideoFailed(true),
            children: /* @__PURE__ */ jsx("source", { src: heroVideoUrl, type: "video/mp4" })
          },
          heroVideoUrl
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/40" }),
        /* @__PURE__ */ jsxs("div", { className: "relative z-10 text-center text-white px-6 max-w-3xl", children: [
          /* @__PURE__ */ jsx("h1", { id: "home-heading", className: "text-5xl md:text-7xl font-serif mb-6 leading-tight", children: heroTitle }),
          /* @__PURE__ */ jsx("p", { className: "text-lg md:text-xl text-stone-100 mb-8 leading-relaxed", children: heroSubtitle }),
          heroTitle && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-4 justify-center", children: [
            /* @__PURE__ */ jsx("a", { href: "#menu", className: "bg-white text-stone-900 px-8 py-3 rounded-full font-medium hover:bg-stone-200 transition-colors", children: "View Menu" }),
            /* @__PURE__ */ jsx("a", { href: "#events", className: "border border-white px-8 py-3 rounded-full hover:bg-white/10 transition-colors", children: "Upcoming Events" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "inside-board-heading", className: "bg-white py-20 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-8 text-center", children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-xs text-stone-500 mb-3", children: "Inside Board" }),
          /* @__PURE__ */ jsx("h2", { id: "inside-board-heading", className: "text-3xl md:text-4xl font-serif mb-4", children: "The atmosphere matters." }),
          /* @__PURE__ */ jsx("p", { className: "text-stone-600 leading-relaxed max-w-2xl mx-auto", children: "A warm neighborhood wine bar designed around conversation, shared plates, music, and a relaxed evening experience." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-[2rem] border border-stone-200 shadow-sm h-[360px] md:h-[430px]", children: [
          venueSlides.map((slide, index) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: `absolute inset-0 transition-opacity duration-1000 ${index === activeVenueSlide ? "opacity-100" : "opacity-0"}`,
              children: [
                /* @__PURE__ */ jsx(
                  CloudImage,
                  {
                    src: slide.image,
                    alt: slide.title,
                    className: "absolute inset-0 h-full w-full object-cover"
                  }
                ),
                /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" }),
                /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 bottom-0 p-8 md:p-10 text-white", children: /* @__PURE__ */ jsxs("div", { className: "max-w-2xl", children: [
                  /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.28em] text-xs text-stone-200 mb-4", children: slide.title }),
                  /* @__PURE__ */ jsx("h3", { className: "text-3xl md:text-5xl font-serif mb-5 leading-tight", children: slide.subtitle })
                ] }) })
              ]
            },
            slide.title
          )),
          /* @__PURE__ */ jsxs("div", { className: "absolute bottom-6 right-6 flex items-center gap-3 z-10", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setActiveVenueSlide(
                  (current) => current === 0 ? venueSlides.length - 1 : current - 1
                ),
                className: "flex items-center justify-center leading-none h-11 w-11 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/25 transition-colors",
                "aria-label": "Previous venue photo",
                children: /* @__PURE__ */ jsx(ArrowLeftIcon, { size: 18 })
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setActiveVenueSlide(
                  (current) => current === venueSlides.length - 1 ? 0 : current + 1
                ),
                className: "flex items-center justify-center leading-none h-11 w-11 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/25 transition-colors",
                "aria-label": "Next venue photo",
                children: /* @__PURE__ */ jsx(ArrowRightIcon, { size: 18 })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10", children: venueSlides.map((_, index) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setActiveVenueSlide(index),
              className: `transition-all rounded-full ${index === activeVenueSlide ? "bg-white w-8 h-2.5" : "bg-white/50 w-2.5 h-2.5"}`,
              "aria-label": `Show venue slide ${index + 1}`
            },
            index
          )) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "about-board-heading", className: "bg-stone-100 py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto px-6 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "What Board Is" }),
        /* @__PURE__ */ jsx("h2", { id: "about-board-heading", className: "text-4xl md:text-5xl font-serif mb-8 leading-tight", children: "More than a wine bar." }),
        /* @__PURE__ */ jsx("p", { className: "text-lg leading-relaxed text-stone-600 max-w-3xl mx-auto", children: "Board is designed around atmosphere, conversation, and discovery. Whether you stop in for a single glass of wine, a shared charcuterie board, or a live music night with friends, the experience is intended to feel curated, welcoming, and distinctly local." }),
        /* @__PURE__ */ jsx("p", { className: "sr-only", children: "Board Wine & Cheese is a Kittery, Maine wine bar serving wine flights, artisan cheese, charcuterie boards, craft beer, small plates, private events, catering, and live music for guests from Kittery, Portsmouth, and the Seacoast." })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "menu", "aria-labelledby": "menu-heading", className: "bg-white py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Menu" }),
          /* @__PURE__ */ jsx("h2", { id: "menu-heading", className: "text-4xl md:text-5xl font-serif mb-6", children: "Explore the Wine Bar Menu" }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto", children: "Thoughtfully curated boards, small plates, wine flights, rotating pours, and craft beer selections designed for sharing." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-3 gap-8 mb-14", children: signaturePreviewCategories.map((category) => {
          var _a2;
          const categoryItems = menuItems.filter((item) => item.category === category);
          const isExpanded = Boolean(expandedMenuCategories[category]);
          const previewItems = isExpanded ? categoryItems : categoryItems.slice(0, 3);
          const previewImage = ((_a2 = categoryItems.find((item) => item.image)) == null ? void 0 : _a2.image) || "";
          return /* @__PURE__ */ jsxs("div", { className: "group bg-stone-50 rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-shadow", children: [
            previewImage && /* @__PURE__ */ jsx(CloudImage, { src: previewImage, alt: category, className: "h-56 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" }),
            /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
              /* @__PURE__ */ jsx("div", { className: "flex items-start justify-between gap-4 mb-5", children: /* @__PURE__ */ jsx("h4", { className: "text-xl lg:text-[1.35rem] font-serif leading-snug", children: category }) }),
              /* @__PURE__ */ jsx("ul", { className: "space-y-3 text-stone-600 text-sm", children: previewItems.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-3 border-b border-stone-200 pb-3", children: [
                /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1", children: item.item }),
                /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-stone-400", children: item.price }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setActiveMenuItem(item),
                      className: "inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-white hover:text-stone-900 transition-colors",
                      "aria-label": "View details for " + item.item,
                      children: /* @__PURE__ */ jsx(ChevronDownIcon, { size: 14 })
                    }
                  )
                ] })
              ] }, item.item)) }),
              categoryItems.length > 3 && /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => toggleMenuCategory(category),
                  className: "mt-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors",
                  "aria-expanded": isExpanded,
                  children: [
                    isExpanded ? "Less" : "More",
                    isExpanded ? /* @__PURE__ */ jsx(ChevronUpIcon, { size: 15 }) : /* @__PURE__ */ jsx(ChevronDownIcon, { size: 15 })
                  ]
                }
              )
            ] })
          ] }, category);
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row justify-center gap-5", children: [
          fullMenuUrl && fullMenuButtonText && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowMenuPdfModal(true),
              className: "inline-flex items-center justify-center bg-stone-900 text-white px-10 py-4 rounded-full text-lg hover:bg-stone-700 transition-colors shadow-sm",
              children: fullMenuButtonText
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: orderOnlineUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex items-center justify-center border border-stone-400 px-10 py-4 rounded-full text-lg hover:bg-stone-100 transition-colors",
              children: "Order Online"
            }
          )
        ] })
      ] }) }),
      activeMenuItem && /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6",
          onClick: () => setActiveMenuItem(null),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative w-full max-w-xl overflow-hidden rounded-3xl bg-stone-50 shadow-2xl",
              onClick: (event) => event.stopPropagation(),
              children: [
                activeMenuItem.image && /* @__PURE__ */ jsx(
                  CloudImage,
                  {
                    src: activeMenuItem.image,
                    alt: activeMenuItem.item,
                    className: "h-64 w-full object-cover"
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "p-7 sm:p-8", children: [
                  /* @__PURE__ */ jsxs("div", { className: "mb-5 flex items-start justify-between gap-5", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("p", { className: "mb-2 text-xs uppercase tracking-[0.3em] text-stone-500", children: "Menu Item" }),
                      /* @__PURE__ */ jsx("h3", { className: "text-3xl font-serif text-stone-900", children: activeMenuItem.item })
                    ] }),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setActiveMenuItem(null),
                        className: "h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors",
                        "aria-label": "Close item details",
                        children: "X"
                      }
                    )
                  ] }),
                  activeMenuItem.price && /* @__PURE__ */ jsx("p", { className: "text-xl font-medium text-stone-900", children: activeMenuItem.price }),
                  activeMenuItem.description && /* @__PURE__ */ jsx("p", { className: "mt-4 text-stone-600 leading-relaxed", children: activeMenuItem.description })
                ] })
              ]
            }
          )
        }
      ),
      showMenuPdfModal && fullMenuUrl && /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6",
          onClick: () => setShowMenuPdfModal(false),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-stone-50 shadow-2xl overflow-hidden",
              onClick: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-8", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-xs text-stone-500 mb-1", children: "Menu" }),
                    /* @__PURE__ */ jsx("h3", { className: "text-2xl sm:text-3xl font-serif text-stone-900", children: "Current Menu" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: fullMenuUrl,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "hidden sm:inline-flex border border-stone-300 px-5 py-2.5 rounded-full text-sm hover:bg-white transition-colors",
                        children: "Open PDF"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setShowMenuPdfModal(false),
                        className: "h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors",
                        "aria-label": "Close menu",
                        children: "X"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx("div", { className: "flex min-h-64 items-center justify-center text-stone-500", children: "Loading menu viewer…" }), children: /* @__PURE__ */ jsx(MenuPdfViewer, { file: fullMenuUrl }) })
              ]
            }
          )
        }
      ),
      /* @__PURE__ */ jsx("section", { id: "happy-hour", "aria-labelledby": "happy-hour-heading", className: "bg-stone-100 py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Happy Hour" }),
          /* @__PURE__ */ jsx("h2", { id: "happy-hour-heading", className: "text-4xl font-serif mb-6 leading-tight", children: happyHourHome.title }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed mb-8", children: happyHourHome.subtitle || happyHourHome.subTitle }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-stone-200 rounded-2xl p-6 shadow-sm inline-block", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm uppercase tracking-[0.2em] text-stone-500 mb-2", children: "Hours" }),
            happyHourHours.map((row) => /* @__PURE__ */ jsxs("p", { className: "text-2xl font-serif", children: [
              row.days,
              " - ",
              row.hours
            ] }, row.days))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden rounded-3xl shadow-lg h-[500px]", children: [
          happyHourImages.map((image, index) => /* @__PURE__ */ jsx(CloudImage, { src: image.src, alt: image.alt, className: `absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === happyHourImageIndex ? "opacity-100" : "opacity-0"}` }, image.alt)),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2", children: happyHourImages.map((_, index) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setHappyHourImageIndex(index), "aria-label": "Show image " + (index + 1), className: `h-2.5 rounded-full transition-all ${index === happyHourImageIndex ? "bg-white w-6" : "bg-white/50 w-2.5 hover:bg-white/80"}` }, index)) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "events", "aria-labelledby": "events-heading", className: "bg-stone-900 text-white py-24", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-16 text-center", children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-400 mb-4", children: "Events" }),
          /* @__PURE__ */ jsx("h2", { id: "events-heading", className: "text-4xl font-serif mb-6", children: "Live Music & Community Nights in Kittery" }),
          /* @__PURE__ */ jsx("p", { className: "text-stone-300 max-w-3xl mx-auto text-lg leading-relaxed", children: "From live acoustic sets and wine tastings to seasonal community gatherings, Board is designed to bring people together around atmosphere, conversation, food, and wine." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-20", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between gap-6 mb-8", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-400 mb-2", children: "Live Music Calendar" }),
              /* @__PURE__ */ jsx("h4", { className: "text-3xl font-serif", children: "Upcoming Performances" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "hidden sm:flex gap-3", children: [
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
                var _a2;
                return (_a2 = document.getElementById("music-slider")) == null ? void 0 : _a2.scrollBy({ left: -320, behavior: "smooth" });
              }, className: "h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-600 hover:bg-stone-800 transition-colors", "aria-label": "Scroll music events left", children: /* @__PURE__ */ jsx(ArrowLeftIcon, { size: 18 }) }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
                var _a2;
                return (_a2 = document.getElementById("music-slider")) == null ? void 0 : _a2.scrollBy({ left: 320, behavior: "smooth" });
              }, className: "h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-600 hover:bg-stone-800 transition-colors", "aria-label": "Scroll music events right", children: /* @__PURE__ */ jsx(ArrowRightIcon, { size: 18 }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { id: "music-slider", className: "flex gap-6 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden", children: musicEvents.map((event) => /* @__PURE__ */ jsxs("article", { className: "min-w-[260px] sm:min-w-[300px] lg:min-w-[320px] snap-start bg-stone-800 border border-stone-700 rounded-3xl overflow-hidden shadow-lg", children: [
            /* @__PURE__ */ jsx(CloudImage, { src: event.image, alt: `${event.title} live music event at Board Wine and Cheese`, className: "h-48 w-full object-cover" }),
            /* @__PURE__ */ jsxs("div", { className: "p-5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-stone-400 text-xs uppercase tracking-wide mb-2", children: event.date }),
              /* @__PURE__ */ jsx("h3", { className: "text-lg font-serif leading-snug text-white", children: event.title }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-4", children: [
                event.url && event.url !== "#" && /* @__PURE__ */ jsx("a", { href: event.url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex text-sm text-stone-300 underline underline-offset-4 hover:text-white", children: "Website" }),
                event.spotifyURL && /* @__PURE__ */ jsx("a", { href: event.spotifyURL, target: "_blank", rel: "noopener noreferrer", className: "inline-flex text-sm text-stone-300 underline underline-offset-4 hover:text-white", children: "Spotify" })
              ] })
            ] })
          ] }, event.title)) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row justify-center gap-5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm text-stone-500 sm:hidden", children: "Swipe sideways to see more performances." }),
            /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowCalendarModal(true), className: "hidden sm:inline-flex border border-stone-600 px-6 py-3 rounded-full text-sm hover:bg-stone-800 transition-colors", children: "View Full Calendar" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mb-16", children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-400 mb-4", children: "Featured Seasonal Events" }),
          /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 gap-6", children: featuredEventCards.map((event) => /* @__PURE__ */ jsxs("article", { className: "bg-stone-800 border border-stone-700 rounded-2xl p-6", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-xl font-serif text-white mb-2", children: event.title }),
            /* @__PURE__ */ jsx("p", { className: "text-stone-400 text-sm mb-3", children: featuredOccurrenceScheduleText(event) }),
            event.description && /* @__PURE__ */ jsx("p", { className: "text-stone-300 leading-relaxed text-sm", children: event.description })
          ] }, event.occurrenceKey || `${event.title}|${event.date}`)) }),
          /* @__PURE__ */ jsx("div", { className: "mt-8 flex justify-center", children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowCalendarModal(true), className: "inline-flex border border-stone-600 px-6 py-3 rounded-full text-sm hover:bg-stone-800 transition-colors", children: "View Full Calendar" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-stone-800 border border-stone-700 rounded-3xl p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-400 mb-4", children: "Private Parties" }),
            /* @__PURE__ */ jsx("h4", { className: "text-4xl font-serif mb-6 leading-tight", children: privatePartiesHome.title }),
            /* @__PURE__ */ jsx("p", { className: "text-stone-300 text-lg leading-relaxed mb-8", children: privatePartiesHome.subtitle || privatePartiesHome.subTitle }),
            /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowPrivateEventForm((current) => !current), className: "bg-white text-stone-900 px-8 py-4 rounded-full hover:bg-stone-200 transition-colors font-medium", children: showPrivateEventForm ? "Hide Private Event Form" : "Inquire About Private Events" }),
            showPrivateEventForm && /* @__PURE__ */ jsxs("form", { onSubmit: (event) => handleInquirySubmit(event, "private_events", setPrivateEventStatus), className: "mt-8 bg-stone-900 border border-stone-700 rounded-3xl p-8 text-left", children: [
              /* @__PURE__ */ jsx("h5", { className: "text-2xl font-serif mb-6 text-white", children: "Private Event Inquiry" }),
              /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ jsx("input", { name: "name", type: "text", placeholder: "Name", required: true, className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
                /* @__PURE__ */ jsx("input", { name: "phone", type: "tel", placeholder: "Phone", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
                /* @__PURE__ */ jsx("input", { name: "email", type: "email", placeholder: "Email", required: true, className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
                /* @__PURE__ */ jsx("input", { name: "number_of_people", type: "number", placeholder: "Number of People", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
                /* @__PURE__ */ jsx("input", { name: "requested_date", type: "date", "aria-label": "Requested date", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white focus:outline-none" }),
                /* @__PURE__ */ jsxs("select", { name: "requested_time", required: true, defaultValue: "", "aria-label": "Requested time", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white focus:outline-none", children: [
                  /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Requested time" }),
                  PRIVATE_EVENT_TIME_OPTIONS.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
                ] }),
                /* @__PURE__ */ jsx("input", { name: "duration", type: "text", placeholder: "Duration", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
                /* @__PURE__ */ jsx("input", { name: "occasion", type: "text", placeholder: "Occasion", className: "px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" })
              ] }),
              /* @__PURE__ */ jsx("textarea", { name: "details", placeholder: "Additional Details (including food allergies, dietary restrictions, setup requests, guest count details, or anything else we should know)", rows: 4, className: "w-full mt-4 px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" }),
              /* @__PURE__ */ jsx("button", { type: "submit", disabled: privateEventStatus.state === "sending", className: "mt-6 bg-white text-stone-900 px-8 py-4 rounded-full hover:bg-stone-200 transition-colors font-medium disabled:opacity-60", children: privateEventStatus.state === "sending" ? "Sending..." : "Submit Inquiry" }),
              privateEventStatus.message && /* @__PURE__ */ jsx("p", { className: `mt-4 text-sm ${privateEventStatus.state === "error" ? "text-red-300" : "text-stone-300"}`, children: privateEventStatus.message })
            ] })
          ] }),
          /* @__PURE__ */ jsx(SectionCarousel, { images: homeImages(privatePartiesHome), altPrefix: "Private party at Board Wine and Cheese", heightClass: "h-[400px]" })
        ] })
      ] }) }),
      showCalendarModal && /* @__PURE__ */ jsx("div", { className: "hidden sm:flex fixed inset-0 z-[100] items-center justify-center bg-black/70 px-6", onClick: () => setShowCalendarModal(false), children: /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-6xl rounded-3xl bg-stone-50 p-8 shadow-2xl text-stone-900 max-h-[85vh] overflow-y-auto", onClick: (event) => event.stopPropagation(), children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6 mb-8", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-2", children: "Full Calendar" }),
            /* @__PURE__ */ jsx("h3", { className: "text-4xl font-serif", children: "Upcoming Events" }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-stone-600", children: "Showing the current month and upcoming months from the music and featured-event CSV files." })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowCalendarModal(false), className: "h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors", "aria-label": "Close calendar", children: "X" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-12", children: calendarMonths.map((month) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-2xl font-serif mb-5", children: month.label }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-stone-500 mb-3", children: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => /* @__PURE__ */ jsx("div", { children: dayName }, dayName)) }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-2", children: month.cells.map((day, index) => /* @__PURE__ */ jsx("div", { className: `min-h-[105px] rounded-2xl border p-3 text-left ${day ? "bg-white border-stone-200" : "bg-stone-100 border-stone-200/70"}`, children: day && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-stone-700 mb-2", children: day.day }),
            /* @__PURE__ */ jsx("div", { className: "space-y-2", children: day.events.map((event) => /* @__PURE__ */ jsxs(
              "a",
              {
                href: event.url && event.url !== "#" ? event.url : void 0,
                target: event.url && event.url !== "#" ? "_blank" : void 0,
                rel: event.url && event.url !== "#" ? "noopener noreferrer" : void 0,
                className: "block rounded-xl bg-stone-900 px-3 py-2 text-xs leading-snug text-white hover:bg-stone-700",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "block text-stone-300", children: event.type }),
                  event.title
                ]
              },
              event.occurrenceKey || event.title + event.date
            )) })
          ] }) }, index)) })
        ] }, month.label)) })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "catering", "aria-labelledby": "catering-heading", className: "bg-stone-100 py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center", children: [
        /* @__PURE__ */ jsx(SectionCarousel, { images: homeImages(cateringHome), altPrefix: "Board catering", heightClass: "h-[500px]" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Catering" }),
          /* @__PURE__ */ jsx("h2", { id: "catering-heading", className: "text-4xl font-serif mb-6 leading-tight", children: cateringHome.title }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed mb-8", children: cateringHome.subtitle || cateringHome.subTitle }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowCateringForm((current) => !current),
              className: "bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors",
              children: showCateringForm ? "Hide Catering Inquiry" : "Inquire About Catering"
            }
          ),
          showCateringForm && /* @__PURE__ */ jsxs("form", { onSubmit: (event) => handleInquirySubmit(event, "catering", setCateringStatus), className: "mt-8 bg-white border border-stone-200 rounded-3xl p-8 shadow-sm", children: [
            /* @__PURE__ */ jsx("h4", { className: "text-2xl font-serif mb-6 text-stone-900", children: "Catering Inquiry" }),
            /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsx("input", { name: "name", type: "text", placeholder: "Name", required: true, className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" }),
              /* @__PURE__ */ jsx("input", { name: "phone", type: "tel", placeholder: "Phone", className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" }),
              /* @__PURE__ */ jsx("input", { name: "email", type: "email", placeholder: "Email", required: true, className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" }),
              /* @__PURE__ */ jsx("input", { name: "requested_date", type: "date", "aria-label": "Requested date", className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none" }),
              /* @__PURE__ */ jsx("input", { name: "occasion", type: "text", placeholder: "Occasion", className: "md:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" })
            ] }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                name: "details",
                placeholder: "Additional Details (including food allergies, dietary restrictions, setup requests, guest count details, or anything else we should know)",
                rows: 4,
                className: "w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none"
              }
            ),
            /* @__PURE__ */ jsx("button", { type: "submit", disabled: cateringStatus.state === "sending", className: "mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-60", children: cateringStatus.state === "sending" ? "Sending..." : "Submit Catering Inquiry" }),
            cateringStatus.message && /* @__PURE__ */ jsx("p", { className: `mt-4 text-sm ${cateringStatus.state === "error" ? "text-red-700" : "text-stone-600"}`, children: cateringStatus.message })
          ] })
        ] })
      ] }) }),
      shopItems.length > 0 && /* @__PURE__ */ jsx("section", { id: "shop", "aria-labelledby": "shop-heading", className: "bg-white py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Shop" }),
          /* @__PURE__ */ jsx("h2", { id: "shop-heading", className: "text-4xl md:text-5xl font-serif mb-6 leading-tight", children: "Take a piece of Board home." }),
          /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto", children: "In addition to dining in, Board offers select wines by the bottle, cheese to take home, and eventually a small collection of branded goods and gifts." })
        ] }),
        shopItems.length > 3 && /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-3 mb-6", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => scrollShopCategories(-1),
              className: "h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-400 hover:bg-stone-100 transition-colors",
              "aria-label": "Scroll shopping categories left",
              children: "←"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => scrollShopCategories(1),
              className: "h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-400 hover:bg-stone-100 transition-colors",
              "aria-label": "Scroll shopping categories right",
              children: "→"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            ref: shopItems.length > 3 ? shopSliderRef : null,
            className: shopItems.length > 3 ? "flex gap-8 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" : "grid md:grid-cols-3 gap-8",
            onMouseEnter: () => setShopScrollPaused(true),
            onMouseLeave: () => setShopScrollPaused(false),
            onTouchStart: () => setShopScrollPaused(true),
            onTouchEnd: () => setShopScrollPaused(false),
            children: shopItems.map((item) => /* @__PURE__ */ jsxs("div", { className: `bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden shadow-sm ${shopItems.length > 3 ? "min-w-[85%] md:min-w-[calc((100%-4rem)/3)]" : ""}`, children: [
              /* @__PURE__ */ jsx(CloudImage, { src: item.image, alt: item.title, className: "h-64 w-full object-cover" }),
              /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
                /* @__PURE__ */ jsx("h4", { className: "text-2xl font-serif mb-4", children: item.title }),
                /* @__PURE__ */ jsx("p", { className: "text-stone-600 leading-relaxed mb-6", children: item.description }),
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
                  setSelectedShopItems([]);
                  setActiveShopCategory(item.category);
                }, className: "border border-stone-400 px-6 py-3 rounded-full text-sm hover:bg-stone-100 transition-colors", children: item.action })
              ] })
            ] }, item.category))
          }
        )
      ] }) }),
      activeShopCategory && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6", onClick: () => setActiveShopCategory(null), children: /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-3xl rounded-3xl bg-stone-50 p-8 shadow-2xl text-stone-900 max-h-[85vh] overflow-y-auto", onClick: (event) => event.stopPropagation(), children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6 mb-8", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-2", children: "Shop" }),
            /* @__PURE__ */ jsx("h3", { className: "text-4xl font-serif", children: activeShopTitle })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setActiveShopCategory(null), className: "h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors", "aria-label": "Close shop popup", children: "X" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-4", children: (shopData[activeShopCategory] || []).map((item) => /* @__PURE__ */ jsxs("div", { className: `flex items-center justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors ${isPickupItem(item) ? "cursor-pointer hover:border-stone-400" : ""}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
            isPickupItem(item) && /* @__PURE__ */ jsx("input", { type: "checkbox", checked: isShopItemSelected(item), onChange: () => toggleShopItem(item), className: "h-5 w-5 rounded border-stone-300" }),
            item.photo && /* @__PURE__ */ jsx(CloudImage, { src: item.photo, alt: item.name, className: "h-20 w-20 rounded-2xl object-cover" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xl font-serif", children: item.name }),
              item.availabilityText && /* @__PURE__ */ jsx("p", { className: "text-sm text-stone-500", children: item.availabilityText })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-lg font-medium whitespace-nowrap", children: item.price })
        ] }, item.name)) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 flex flex-col sm:flex-row gap-4 justify-end border-t border-stone-200 pt-6", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setActiveShopCategory(null), className: "border border-stone-300 px-8 py-4 rounded-full hover:bg-white transition-colors", children: "Close" }),
          activeShopHasPickupItems && /* @__PURE__ */ jsxs("a", { href: selectedShopItems.length ? getPurchaseUrl() : "#", target: selectedShopItems.length ? "_blank" : void 0, rel: selectedShopItems.length ? "noopener noreferrer" : void 0, onClick: (event) => {
            if (!selectedShopItems.length) event.preventDefault();
          }, className: `px-8 py-4 rounded-full transition-colors text-center ${selectedShopItems.length ? "bg-stone-900 text-white hover:bg-stone-700" : "bg-stone-300 text-stone-500 cursor-not-allowed"}`, children: [
            "Buy ",
            selectedShopItems.length ? "(" + selectedShopItems.length + ")" : ""
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "reviews-heading", className: "bg-stone-100 py-24 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-end justify-between gap-6 mb-12", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Reviews" }),
          /* @__PURE__ */ jsx("h2", { id: "reviews-heading", className: "text-4xl font-serif", children: "What guests are saying." })
        ] }) }),
        /* @__PURE__ */ jsx(
          "div",
          {
            id: "review-slider",
            ref: reviewSliderRef,
            className: "flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            onMouseEnter: () => setReviewScrollPaused(true),
            onMouseLeave: () => setReviewScrollPaused(false),
            onTouchStart: () => setReviewScrollPaused(true),
            onTouchEnd: () => setReviewScrollPaused(false),
            children: reviews.map((review) => /* @__PURE__ */ jsxs("div", { className: "min-w-[280px] sm:min-w-[340px] lg:min-w-[360px] snap-start bg-white rounded-3xl border border-stone-200 p-8 shadow-sm", children: [
              /* @__PURE__ */ jsx("div", { className: "flex gap-1 text-stone-900 mb-6", "aria-label": `${review.stars || 5} star review`, children: Array.from({ length: Math.max(1, Math.min(5, Number(review.stars || 5))) }).map((_, index) => /* @__PURE__ */ jsx(StarIcon, { size: 16 }, index)) }),
              /* @__PURE__ */ jsx("p", { className: "text-lg leading-relaxed text-stone-600 mb-6 italic", children: review.quote }),
              /* @__PURE__ */ jsx("p", { className: "text-sm uppercase tracking-wide text-stone-500", children: review.author })
            ] }, review.author))
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-stone-500 sm:hidden", children: "Swipe sideways to see more reviews." })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "wine-club", "aria-labelledby": "wine-club-heading", className: "bg-white border-y border-stone-200 py-24", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto px-6 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Join the Board" }),
        /* @__PURE__ */ jsx("h2", { id: "wine-club-heading", className: "text-4xl md:text-5xl font-serif mb-8 leading-tight", children: "Gift Cards." }),
        /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed mb-10 max-w-3xl mx-auto", children: "Give someone the Board experience with a digital gift card. Our Wine Club is coming soon." }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-4 justify-center", children: [
          /* @__PURE__ */ jsx("span", { className: "inline-flex items-center justify-center rounded-full border border-stone-300 bg-stone-100 px-8 py-4 text-stone-500", "aria-label": "Wine Club coming soon", children: "Wine Club — Coming Soon" }),
          /* @__PURE__ */ jsx("a", { href: giftCardUrl, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center justify-center bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors", children: "Buy Gift Cards" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "reservations", "aria-labelledby": "reservations-heading", className: "bg-stone-100 border-y border-stone-200 py-16", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-6 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-4", children: "Reservations" }),
        /* @__PURE__ */ jsx("h2", { id: "reservations-heading", className: "text-4xl md:text-5xl font-serif mb-6 leading-tight", children: "Reserve a table at Board Wine & Cheese." }),
        /* @__PURE__ */ jsx("p", { className: "text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto mb-8", children: "Reservations are recommended for evenings, live music nights, and special events. Book securely through resOS." }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowReservationModal(true),
            className: "inline-flex items-center justify-center bg-stone-900 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-stone-700 transition-colors shadow-sm",
            children: "Reserve Now"
          }
        )
      ] }) }),
      showReservationModal && /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-5",
          onClick: () => setShowReservationModal(false),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              role: "dialog",
              "aria-modal": "true",
              "aria-labelledby": "reservation-modal-heading",
              className: "relative w-full max-w-lg overflow-hidden rounded-3xl bg-stone-50 shadow-2xl",
              onClick: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-7", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-xs text-stone-500 mb-1", children: "Reservations" }),
                    /* @__PURE__ */ jsx("h3", { id: "reservation-modal-heading", className: "text-2xl sm:text-3xl font-serif text-stone-900", children: "Reserve a Table" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setShowReservationModal(false),
                      className: "h-10 w-10 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors",
                      "aria-label": "Close reservation booking",
                      children: "X"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "px-5 py-6 sm:px-7 sm:py-7 text-center", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-stone-600 leading-relaxed", children: "Reservations are handled securely through resOS. Continue below to choose your date, time, and party size." }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-7 flex flex-col sm:flex-row justify-center gap-3", children: [
                    /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: RESOS_BOOKING_URL,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "inline-flex items-center justify-center rounded-full bg-stone-900 px-7 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700 transition-colors",
                        children: "Continue to Reservations"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => setShowReservationModal(false),
                        className: "inline-flex items-center justify-center rounded-full border border-stone-300 px-7 py-3.5 text-sm font-medium text-stone-700 hover:bg-white transition-colors",
                        children: "Cancel"
                      }
                    )
                  ] })
                ] })
              ]
            }
          )
        }
      ),
      showContactModal && /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6",
          onClick: () => setShowContactModal(false),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-stone-50 shadow-2xl",
              onClick: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6 border-b border-stone-200 px-6 py-5 sm:px-8", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-xs text-stone-500 mb-2", children: "Contact Us" }),
                    /* @__PURE__ */ jsx("h3", { className: "text-3xl sm:text-4xl font-serif text-stone-900", children: "Send a Message" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setShowContactModal(false),
                      className: "h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors",
                      "aria-label": "Close contact form",
                      children: "X"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  "form",
                  {
                    onSubmit: (event) => handleInquirySubmit(event, "contact", setContactStatus),
                    className: "p-6 sm:p-8",
                    children: [
                      /* @__PURE__ */ jsx("p", { className: "text-stone-600 leading-relaxed mb-6", children: "Questions about reservations, events, catering, wine club, gift cards, or anything else? Send us a note and we will get back to you shortly." }),
                      /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-4", children: [
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            name: "name",
                            type: "text",
                            placeholder: "Name",
                            required: true,
                            className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            name: "phone",
                            type: "tel",
                            placeholder: "Phone",
                            className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "input",
                          {
                            name: "email",
                            type: "email",
                            placeholder: "Email",
                            required: true,
                            className: "sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "select",
                          {
                            name: "inquiry_type",
                            defaultValue: "",
                            className: "sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-stone-500",
                            children: [
                              /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "What can we help with?" }),
                              /* @__PURE__ */ jsx("option", { value: "General Question", children: "General Question" }),
                              /* @__PURE__ */ jsx("option", { value: "Reservation", children: "Reservation" }),
                              /* @__PURE__ */ jsx("option", { value: "Catering", children: "Catering" }),
                              /* @__PURE__ */ jsx("option", { value: "Private Events", children: "Private Events" }),
                              /* @__PURE__ */ jsx("option", { value: "Wine Club", children: "Wine Club" }),
                              /* @__PURE__ */ jsx("option", { value: "Gift Cards", children: "Gift Cards" })
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsx(
                        "textarea",
                        {
                          name: "message",
                          placeholder: "Tell us how we can help...",
                          rows: 6,
                          required: true,
                          className: "w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "submit",
                          disabled: contactStatus.state === "sending",
                          className: "mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors font-medium disabled:opacity-60",
                          children: contactStatus.state === "sending" ? "Sending..." : "Send Message"
                        }
                      ),
                      contactStatus.message && /* @__PURE__ */ jsx("p", { className: `mt-4 text-sm ${contactStatus.state === "error" ? "text-red-700" : "text-stone-600"}`, children: contactStatus.message })
                    ]
                  }
                )
              ]
            }
          )
        }
      ),
      showJobsModal && /* @__PURE__ */ jsx(
        "div",
        {
          className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6",
          onClick: () => setShowJobsModal(false),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-stone-50 shadow-2xl",
              onClick: (event) => event.stopPropagation(),
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6 border-b border-stone-200 px-6 py-5 sm:px-8", children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-xs text-stone-500 mb-2", children: "Jobs" }),
                    /* @__PURE__ */ jsx("h3", { className: "text-3xl sm:text-4xl font-serif text-stone-900", children: "Apply to Join Board" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setShowJobsModal(false),
                      className: "h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors",
                      "aria-label": "Close jobs form",
                      children: "X"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs(
                  "form",
                  {
                    onSubmit: (event) => handleInquirySubmit(event, "jobs", setJobsStatus),
                    className: "p-6 sm:p-8",
                    children: [
                      /* @__PURE__ */ jsx("p", { className: "text-stone-600 leading-relaxed mb-6", children: "Interested in working at Board? Tell us a little about your hospitality experience and attach a resume if you have one." }),
                      /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-4", children: [
                        /* @__PURE__ */ jsx("input", { name: "name", type: "text", placeholder: "Name", required: true, className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" }),
                        /* @__PURE__ */ jsx("input", { name: "email", type: "email", placeholder: "Email", required: true, className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" }),
                        /* @__PURE__ */ jsx("input", { name: "phone", type: "tel", placeholder: "Phone", className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" }),
                        /* @__PURE__ */ jsx("input", { name: "experience_years", type: "number", min: "0", step: "1", placeholder: "Experience (years)", className: "px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" }),
                        /* @__PURE__ */ jsxs("select", { name: "experience_type", required: true, defaultValue: "", className: "sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-stone-500", children: [
                          /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Experience type" }),
                          JOB_EXPERIENCE_TYPES.map((type) => /* @__PURE__ */ jsx("option", { value: type, children: type }, type))
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx("textarea", { name: "cover_letter", placeholder: "Cover letter", rows: 6, className: "w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" }),
                      /* @__PURE__ */ jsxs("label", { className: "mt-4 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-5 text-stone-700 hover:border-stone-500 transition-colors", children: [
                        /* @__PURE__ */ jsx("span", { className: "font-medium text-stone-900", children: "Attach Resume" }),
                        /* @__PURE__ */ jsx("span", { className: "text-sm text-stone-500", children: "PDF, Word, or text file. Maximum 5MB." }),
                        /* @__PURE__ */ jsx("input", { name: "resume", type: "file", accept: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain", className: "text-sm text-stone-600" })
                      ] }),
                      /* @__PURE__ */ jsx("button", { type: "submit", disabled: jobsStatus.state === "sending", className: "mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors font-medium disabled:opacity-60", children: jobsStatus.state === "sending" ? "Sending..." : "Submit Application" }),
                      jobsStatus.message && /* @__PURE__ */ jsx("p", { className: `mt-4 text-sm ${jobsStatus.state === "error" ? "text-red-700" : "text-stone-600"}`, children: jobsStatus.message })
                    ]
                  }
                )
              ]
            }
          )
        }
      )
    ] }),
    faqItems.length > 0 && /* @__PURE__ */ jsx("section", { id: "faq", "aria-labelledby": "faq-heading", className: "bg-stone-100 py-16 border-y border-stone-200", children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsx("p", { className: "uppercase tracking-[0.3em] text-sm text-stone-500 mb-3", children: "FAQ" }),
        /* @__PURE__ */ jsx("h2", { id: "faq-heading", className: "text-3xl md:text-4xl font-serif text-stone-900", children: "Frequently Asked Questions" }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 text-stone-600 leading-relaxed max-w-2xl mx-auto", children: "Quick answers about reservations, catering, private events, live music, gift cards, and visiting Board Wine & Cheese in Kittery, Maine." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm", children: faqItems.map((item, index) => {
        const isOpen = openFaqIndex === index;
        const answerId = `faq-answer-${index}`;
        return /* @__PURE__ */ jsxs("div", { className: "border-b border-stone-200 last:border-b-0", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setOpenFaqIndex(isOpen ? null : index),
              className: "flex w-full items-center justify-between gap-6 px-6 py-5 text-left hover:bg-stone-50 transition-colors sm:px-8",
              "aria-expanded": isOpen,
              "aria-controls": answerId,
              children: [
                /* @__PURE__ */ jsx("span", { className: "text-lg font-serif text-stone-900 sm:text-xl", children: item.question }),
                /* @__PURE__ */ jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xl text-stone-600", "aria-hidden": "true", children: isOpen ? "−" : "+" })
              ]
            }
          ),
          isOpen && /* @__PURE__ */ jsx("div", { id: answerId, className: "px-6 pb-6 sm:px-8", children: /* @__PURE__ */ jsx("p", { className: "max-w-3xl text-stone-600 leading-relaxed", children: item.answer }) })
        ] }, item.question);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxs("footer", { className: "bg-stone-950 text-stone-300 py-16", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-10", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-2xl font-serif text-white mb-4", children: "BOARD" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm leading-relaxed text-stone-400", children: "Wine - Cheese - Charcuterie" }),
          /* @__PURE__ */ jsxs("ul", { className: "mt-3 space-y-2 text-sm text-stone-400", children: [
            /* @__PURE__ */ jsx("li", { className: "pt-4 text-white font-medium uppercase tracking-wide text-xs", children: "Hours" }),
            businessHours.map((row) => /* @__PURE__ */ jsxs("li", { children: [
              row.days,
              ": ",
              row.hours
            ] }, row.days))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h5", { className: "text-white font-medium mb-4", children: "Visit" }),
          /* @__PURE__ */ jsxs("address", { className: "not-italic text-sm text-stone-400", children: [
            /* @__PURE__ */ jsx("p", { children: "5 Shapleigh Road" }),
            /* @__PURE__ */ jsx("p", { children: "Kittery, ME 03904" }),
            /* @__PURE__ */ jsx("p", { className: "sr-only", children: "Board Wine & Cheese is located in Kittery, Maine near Portsmouth, New Hampshire." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-4 overflow-hidden rounded-2xl border border-stone-800 bg-stone-900", children: /* @__PURE__ */ jsx(
            "iframe",
            {
              title: "Board Wine & Cheese location map",
              src: "https://www.google.com/maps?q=5+Shapleigh+Road+Kittery+ME+03904&output=embed",
              className: "h-36 w-full border-0 opacity-90 grayscale",
              loading: "lazy",
              referrerPolicy: "no-referrer-when-downgrade"
            }
          ) }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "https://maps.google.com/?q=5+Shapleigh+Road+Kittery+ME+03904",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-200 transition-colors",
              children: "Get Directions"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h5", { className: "text-white font-medium mb-4", children: "Explore" }),
          /* @__PURE__ */ jsxs("ul", { className: "space-y-2 text-sm text-stone-400", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: giftCardUrl, target: "_blank", rel: "noopener noreferrer", className: "hover:text-white transition-colors", children: "Gift Cards" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#faq", className: "hover:text-white transition-colors", children: "FAQ" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#catering", className: "hover:text-white transition-colors", children: "Catering" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#events", className: "hover:text-white transition-colors", children: "Private Events" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowContactModal(true), className: "hover:text-white transition-colors text-left", children: "Contact" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowJobsModal(true), className: "hover:text-white transition-colors text-left", children: "Jobs" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h5", { className: "text-white font-medium mb-4", children: "Contact Us" }),
          /* @__PURE__ */ jsxs("ul", { className: "space-y-3 text-sm text-stone-400", children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowContactModal(true), className: "inline-flex rounded-full bg-white px-5 py-2.5 text-stone-900 font-medium hover:bg-stone-200 transition-colors", children: "Send a Message" }) }),
            /* @__PURE__ */ jsxs("li", { className: "pt-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-white", children: "Email:" }),
              " ",
              /* @__PURE__ */ jsx("a", { href: "mailto:cscala@mainecheeseboard.com", className: "hover:text-white transition-colors", children: "cscala@mainecheeseboard.com" })
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-white", children: "Phone:" }),
              " ",
              /* @__PURE__ */ jsx("a", { href: "tel:+12074360300", className: "hover:text-white transition-colors", children: "(207) 436-0300" })
            ] }),
            /* @__PURE__ */ jsx("li", { className: "pt-4", children: /* @__PURE__ */ jsxs("a", { href: "https://www.instagram.com/boardwineandcheese/", target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-3 hover:text-white transition-colors", children: [
              /* @__PURE__ */ jsx(InstagramIcon, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Instagram" })
            ] }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", { href: "https://www.facebook.com/Board.KitteryME/", target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-3 hover:text-white transition-colors", children: [
              /* @__PURE__ */ jsx(FacebookIcon, { size: 18 }),
              /* @__PURE__ */ jsx("span", { children: "Facebook" })
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-t border-stone-800 mt-12 pt-8 text-center text-sm text-stone-500", children: "2026 Board Wine & Cheese - Curated hospitality experience." })
    ] })
  ] });
}
function render() {
  return renderToString(/* @__PURE__ */ jsx(App, {}));
}
export {
  render
};
