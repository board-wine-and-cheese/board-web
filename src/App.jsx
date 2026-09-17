import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { TABLES } from './config';
import { loadTable, visibleRows } from './lib/googleSheets';

const MenuPdfViewer = lazy(() => import('./MenuPdfViewer'));
const LIVE_MUSIC_FALLBACK_IMAGE = '/images/live-music-fallback.svg';

// -----------------------------------------------------------------------------
// Cloudinary helpers
// Owners can paste Cloudinary image URLs directly into CSV/Google Sheets.
// The site automatically inserts f_auto,q_auto for optimized delivery.
// Non-Cloudinary URLs and local /public assets pass through unchanged.
// -----------------------------------------------------------------------------
function cloudinaryImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }

  if (url.includes('/image/upload/f_auto,q_auto/')) {
    return url;
  }

  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}


function cloudinaryVideoUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) {
    return url;
  }

  if (url.includes('/video/upload/f_auto,q_auto/')) {
    return url;
  }

  return url.replace('/video/upload/', '/video/upload/f_auto,q_auto/');
}

function CloudImage({ src, ...props }) {
  return <img src={cloudinaryImageUrl(src)} {...props} />;
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function StarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="dark" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDownIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function getSectionId(label) {
  return label.toLowerCase().trim().split(' ').filter(Boolean).join('-');
}

function parseEventDate(dateText) {
  const raw = String(dateText || '').trim();

  if (!raw) {
    return null;
  }

  // Google Sheets currently publishes FeaturedEvents dates as values such as
  // "September 2". Keep those in the current year, matching the old behavior.
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  const lower = raw.toLowerCase();
  const monthIndex = monthNames.findIndex((month) => lower.includes(month));
  const dayMatch = lower.match(/[0-9]{1,2}/);

  if (monthIndex >= 0 && dayMatch) {
    const yearMatch = lower.match(/\b(20[0-9]{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
    const day = Number(dayMatch[0]);
    const parsedDate = new Date(year, monthIndex, day);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  // Also accept ISO / numeric dates if the sheet format changes later.
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

function formatEventDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
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
  const validRepeats = new Set(['daily', 'weekly', 'monthly']);

  return events.flatMap((event) => {
    const start = parseEventDate(event.startDate || event.date);
    if (!start) {
      return [];
    }

    const repeat = String(event.repeat || '').trim().toLowerCase();
    const end = parseEventDate(event.endDate);

    // Blank repeat/endDate is the normal one-off case.
    if (!validRepeats.has(repeat) || !end || end < start) {
      return [{
        ...event,
        date: formatEventDate(start),
        calendarDate: start,
        occurrenceKey: `${event.title}|${start.toISOString().slice(0, 10)}`,
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
        occurrenceKey: `${event.title}|${occurrenceDate.toISOString().slice(0, 10)}`,
      });

      if (repeat === 'daily') {
        occurrenceDate = new Date(
          occurrenceDate.getFullYear(),
          occurrenceDate.getMonth(),
          occurrenceDate.getDate() + 1
        );
      } else if (repeat === 'weekly') {
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

function featuredEventScheduleText(event) {
  const repeat = String(event.repeat || '').trim().toLowerCase();
  const repeatLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  const parts = [event.startDate || event.date];

  if (event.time) {
    parts.push(event.time);
  }

  if (repeatLabels[repeat] && event.endDate) {
    parts.push(`${repeatLabels[repeat]} through ${event.endDate}`);
  }

  return parts.filter(Boolean).join(' • ');
}

function featuredOccurrenceScheduleText(event) {
  const repeat = String(event.repeat || '').trim().toLowerCase();
  const repeatLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  return [
    event.date || event.startDate,
    event.time,
    repeatLabels[repeat] || '',
  ].filter(Boolean).join(' • ');
}

function buildCalendarMonths(events, monthCount = 3) {
  const today = new Date();
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
      label: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      cells: calendarCells,
    });
  }

  return months;
}

function buildTimeOptions(startHour = 14, endHour = 21) {
  const options = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour && minute > 0) continue;
      const value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
      const date = new Date(2000, 0, 1, hour, minute);
      const label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      options.push({ value, label });
    }
  }
  return options;
}

const PRIVATE_EVENT_TIME_OPTIONS = buildTimeOptions(14, 21);
const JOB_EXPERIENCE_TYPES = [
  'Bartender',
  'Busser',
  'Cook',
  'Dishwasher',
  'Host / Hostess',
  'Prep Cook',
  'Server',
];

const RESOS_BOOKING_URL = 'https://board.resos.com/booking';

function SectionCarousel({ images, altPrefix, heightClass = "h-[500px]" }) {
  const safeImages = (images || []).filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % safeImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [safeImages.length]);

  if (!safeImages.length) return null;

  return (
    <div className={`relative overflow-hidden rounded-3xl shadow-lg ${heightClass}`}>
      {safeImages.map((src, imageIndex) => (
        <CloudImage
          key={src}
          src={src}
          alt={`${altPrefix} ${imageIndex + 1}`}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${imageIndex === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {safeImages.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {safeImages.map((_, imageIndex) => (
            <button
              key={imageIndex}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`Show image ${imageIndex + 1}`}
              className={`h-2.5 rounded-full transition-all ${imageIndex === index ? 'bg-white w-6' : 'bg-white/50 w-2.5 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tableStatus, setTableStatus] = useState({});
  const [showPrivateEventForm, setShowPrivateEventForm] = useState(false);
  const [showCateringForm, setShowCateringForm] = useState(false);
  const [privateEventStatus, setPrivateEventStatus] = useState({ state: 'idle', message: '' });
  const [cateringStatus, setCateringStatus] = useState({ state: 'idle', message: '' });
  const [contactStatus, setContactStatus] = useState({ state: 'idle', message: '' });
  const [jobsStatus, setJobsStatus] = useState({ state: 'idle', message: '' });
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
  const heroTitle = activeHero.title || '';
  const heroSubtitle = activeHero.subtitle || activeHero.subTitle || '';
  const heroMediaUrl = activeHero.mediaURL || activeHero.cloudinaryURL || '';
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const heroVideoUrl = cloudinaryVideoUrl(heroMediaUrl);
  const heroPosterUrl = activeHero.posterURL || '';

  const homeRows = visibleRows(externalHomeRows);
  const findHomeRow = (category) => homeRows.find((row) =>
    String(row.category || '').replace(/[^a-z0-9]/gi, '').toLowerCase() ===
    String(category).replace(/[^a-z0-9]/gi, '').toLowerCase()
  ) || {};
  const homeImages = (row) => [row.mediaURL, row.mediaURL2, row.mediaURL3].filter(Boolean).slice(0, 3);

  const happyHourHome = findHomeRow('HappyHour');
  const privatePartiesHome = findHomeRow('PrivateParties');
  const cateringHome = findHomeRow('Catering');

  const fullMenuRow = visibleRows(externalFullMenuRows)[0] || {};
  const fullMenuButtonText = fullMenuRow.buttonText || fullMenuRow.title || '';
  const fullMenuUrl = fullMenuRow.url || fullMenuRow.pdfURL || fullMenuRow.mediaURL || '';


  const [venueSlides, setVenueSlides] = useState([]);
  const [activeVenueSlide, setActiveVenueSlide] = useState(0);

  useEffect(() => {
    if (venueSlides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setActiveVenueSlide((current) =>
        current === venueSlides.length - 1 ? 0 : current + 1
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [venueSlides.length]);


  const handleInquirySubmit = async (event, formKey, setStatus) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = Object.fromEntries(formData.entries());
    const attachments = [];

    const resumeFile = formData.get('resume');
    if (resumeFile instanceof File && resumeFile.size > 0) {
      if (resumeFile.size > 5 * 1024 * 1024) {
        setStatus({ state: 'error', message: 'Resume file must be 5MB or smaller.' });
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];

      if (resumeFile.type && !allowedTypes.includes(resumeFile.type)) {
        setStatus({ state: 'error', message: 'Please attach a PDF, Word document, or text file.' });
        return;
      }

      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(new Error('Unable to read the resume file.'));
        reader.readAsDataURL(resumeFile);
      });

      attachments.push({
        filename: resumeFile.name,
        content,
        contentType: resumeFile.type || 'application/octet-stream',
      });

      delete fields.resume;
    }

    setStatus({ state: 'sending', message: 'Sending inquiry...' });

    try {
      const response = await fetch('/.netlify/functions/send-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formKey, fields, attachments }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Unable to send inquiry.');
      }

      form.reset();
      setStatus({ state: 'success', message: 'Thanks — your inquiry has been sent.' });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error.message || 'Something went wrong. Please try again.',
      });
    }
  };

  const defaultOrderUrl = 'https://www.toasttab.com/local/order/maine-cheese-board-5-shapleigh-road-suite-108/r-3675ebdf-fcc5-43fb-a265-99af7ccdd2e3?diningOption=takeout';
  const orderOnlineUrl = import.meta.env.VITE_CHOWNOW_URL || defaultOrderUrl;
  const giftCardUrl = import.meta.env.VITE_GIFT_CARD_URL || 'https://order.toasttab.com/egiftcards/maine-cheese-board-5-shapleigh-road-suite-108';
  const navItems = ['Home', 'Menu', 'Happy Hour', 'Events', 'Shop', 'Order Online'];

  const businessHours = externalBusinessHours;
  const happyHourHours = externalHappyHourHours;
  const menuItems = externalMenuItems;
  const menuCategories = Array.from(new Set(menuItems.map((item) => item.category)));
  const signaturePreviewCategories = menuCategories.slice(0, 3);

  const toggleMenuCategory = (category) => {
    setExpandedMenuCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const reviews = externalReviews;
  const musicEvents = externalMusicEvents;
  const featuredEvents = externalFeaturedEvents;

  const faqItems = externalFaqItems;

  useEffect(() => {
    if (faqItems.length > 0) {
      setOpenFaqIndex((current) => (
        current === null || current >= faqItems.length ? 0 : current
      ));
    } else {
      setOpenFaqIndex(null);
    }
  }, [faqItems.length]);

  useEffect(() => {
    const scriptId = 'board-faq-structured-data';
    document.getElementById(scriptId)?.remove();

    if (!faqItems.length) return undefined;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
    document.head.appendChild(script);

    return () => script.remove();
  }, [faqItems]);

  const recurringFeaturedCalendarEvents = useMemo(
    () => expandRecurringFeaturedEvents(featuredEvents),
    [featuredEvents]
  );

  const featuredEventCards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = recurringFeaturedCalendarEvents
      .filter((event) => event.calendarDate && event.calendarDate >= today)
      .sort((a, b) => a.calendarDate - b.calendarDate);

    const eventsToShow = upcoming.length
      ? upcoming
      : [...recurringFeaturedCalendarEvents].sort(
          (a, b) => a.calendarDate - b.calendarDate
        );

    // The calendar needs every generated occurrence, but the homepage should
    // show a recurring series only once. Because the events are date-sorted,
    // this keeps the first upcoming occurrence for each recurring CSV row.
    const recurringSeriesShown = new Set();
    const uniqueHomepageEvents = eventsToShow.filter((event) => {
      const repeat = String(event.repeat || '').trim().toLowerCase();
      const isRecurring = ['daily', 'weekly', 'monthly'].includes(repeat)
        && Boolean(event.endDate);

      if (!isRecurring) {
        return true;
      }

      const seriesKey = [
        event.title,
        event.startDate,
        event.endDate,
        repeat,
        event.time,
      ].join('|');

      if (recurringSeriesShown.has(seriesKey)) {
        return false;
      }

      recurringSeriesShown.add(seriesKey);
      return true;
    });

    // Six cards = up to three rows in the existing two-column desktop layout.
    return uniqueHomepageEvents.slice(0, 6);
  }, [recurringFeaturedCalendarEvents]);

  const calendarEvents = useMemo(
    () => [
      ...musicEvents.map((event) => ({ ...event, type: 'Music' })),
      ...recurringFeaturedCalendarEvents.map((event) => ({ ...event, type: 'Featured' })),
    ],
    [musicEvents, recurringFeaturedCalendarEvents]
  );

  const calendarMonths = useMemo(
    () => buildCalendarMonths(calendarEvents, 3),
    [calendarEvents]
  );

  const happyHourImages = homeImages(happyHourHome)
    .map((src, index) => ({ src, alt: `Happy Hour ${index + 1}` }));

  const shopItems = externalShopCategories || [];

  const shopData = useMemo(() => {
    const groupedItems = externalShoppingItems.reduce((groups, item) => {
      const category = String(item.category || '').trim().toLowerCase();
      if (!category) return groups;
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
      return groups;
    }, {});

    return groupedItems;
  }, [externalShoppingItems]);

  const activeShopTitle = shopItems.find(
    (item) => item.category === activeShopCategory
  )?.title || activeShopCategory;
  const isPickupItem = (item) => String(item.availabilityText || '').trim().toLowerCase() === 'order for pickup';
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
      nextScrollLeft = slider.scrollLeft <= 1
        ? maxScrollLeft
        : Math.max(0, slider.scrollLeft - pageDistance);
    } else {
      nextScrollLeft = slider.scrollLeft >= maxScrollLeft - 1
        ? 0
        : Math.min(maxScrollLeft, slider.scrollLeft + pageDistance);
    }

    slider.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
    shopScrollResumeTimerRef.current = window.setTimeout(
      () => setShopScrollPaused(false),
      1200
    );
  };

  useEffect(() => () => {
    window.clearTimeout(shopScrollResumeTimerRef.current);
  }, []);

  useEffect(() => {
    if (happyHourImages.length <= 1) return undefined;
    const interval = setInterval(() => {
      setHappyHourImageIndex((current) => (current === happyHourImages.length - 1 ? 0 : current + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [happyHourImages.length]);

  useEffect(() => {
    const reviewSlider = reviewSliderRef.current;

    if (!reviewSlider || reviewScrollPaused) {
      return undefined;
    }

    let animationFrameId;
    let lastTimestamp = null;
    const pixelsPerSecond = 35;

    const step = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const elapsedSeconds = (timestamp - lastTimestamp) / 1000;
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
      return undefined;
    }

    let animationFrameId;
    let lastTimestamp = null;
    const pixelsPerSecond = 28;

    const step = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const elapsedSeconds = (timestamp - lastTimestamp) / 1000;
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

    const tableMediaUrl = (row) => row.mediaURL || row.cloudinaryURL || row.image || row.photo || '';

    const handleLoadError = (label, error, onInitialError, isInitialLoad) => {
      console.error(`Unable to load ${label} table:`, error);
      applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: 'error' }));
      if (isInitialLoad && onInitialError) {
        onInitialError();
      }
    };

    const loadAllTables = async ({ force = false, isInitialLoad = false } = {}) => {
      const options = { force };
      const loadNamedTable = (label, url) => {
        if (isInitialLoad) {
          applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: 'loading' }));
        }

        return loadTable(url, options).then((rows) => {
          applyIfMounted(setTableStatus, (current) => ({ ...current, [label]: 'ready' }));
          return rows;
        });
      };

      const tableLoads = [
        loadNamedTable('Hero', TABLES.Hero)
          .then((rows) => {
            applyIfMounted(setExternalHeroRows, visibleRows(rows));
            applyIfMounted(setHeroVideoFailed, false);
          })
          .catch((error) => handleLoadError(
            'Hero',
            error,
            () => applyIfMounted(setExternalHeroRows, []),
            isInitialLoad,
          )),

        loadNamedTable('Home', TABLES.Home)
          .then((rows) => applyIfMounted(setExternalHomeRows, visibleRows(rows)))
          .catch((error) => handleLoadError(
            'Home',
            error,
            () => applyIfMounted(setExternalHomeRows, []),
            isInitialLoad,
          )),

        loadNamedTable('FullMenu', TABLES.FullMenu)
          .then((rows) => applyIfMounted(setExternalFullMenuRows, visibleRows(rows)))
          .catch((error) => handleLoadError(
            'FullMenu',
            error,
            () => applyIfMounted(setExternalFullMenuRows, []),
            isInitialLoad,
          )),

        loadNamedTable('Venue', TABLES.Venue)
          .then((rows) => {
            const slides = visibleRows(rows).map((row) => ({
              title: row.title || '',
              subtitle: row.subtitle || row.subTitle || '',
              image: tableMediaUrl(row) || LIVE_MUSIC_FALLBACK_IMAGE,
            })).filter((slide) => slide.title && slide.image);

            if (slides.length) {
              applyIfMounted(setVenueSlides, slides);
            }
          })
          .catch((error) => handleLoadError('Venue', error, null, isInitialLoad)),

        loadNamedTable('Menu', TABLES.Menu)
          .then((rows) => {
            const menuRows = visibleRows(rows).map((row) => ({
              category: row.category || '',
              item: row.item || '',
              description: row.description || '',
              price: row.price || '',
              image: tableMediaUrl(row),
            })).filter((item) => item.category && item.item);

            applyIfMounted(setExternalMenuItems, menuRows);
          })
          .catch((error) => handleLoadError(
            'Menu',
            error,
            () => applyIfMounted(setExternalMenuItems, []),
            isInitialLoad,
          )),

        loadNamedTable('LiveArtists', TABLES.LiveArtists)
          .then((rows) => {
            const artistRows = visibleRows(rows).map((row) => ({
              title: row.title || '',
              date: row.time ? `${row.date || ''} - ${row.time}` : row.date || '',
              url: row.artistURL || row.websiteURL || row.url || '#',
              spotifyURL: row.spotifyURL || '',
              image: tableMediaUrl(row),
            })).filter((event) => event.title && event.date);

            applyIfMounted(setExternalMusicEvents, artistRows);
          })
          .catch((error) => handleLoadError(
            'LiveArtists',
            error,
            () => applyIfMounted(setExternalMusicEvents, []),
            isInitialLoad,
          )),

        loadNamedTable('FeaturedEvents', TABLES.FeaturedEvents)
          .then((rows) => {
            const featuredRows = visibleRows(rows).map((row) => ({
              title: row.title || '',
              category: row.category || '',
              startDate: row.startDate || row.date || '',
              endDate: row.endDate || '',
              repeat: String(row.repeat || '').trim().toLowerCase(),
              time: row.time || '',
              description: row.subtitle || row.subTitle || row.description || '',
              sortOrder: Number(row.sortOrder || 999),
            }))
              .filter((event) => event.title && event.startDate)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            applyIfMounted(setExternalFeaturedEvents, featuredRows);
          })
          .catch((error) => handleLoadError(
            'FeaturedEvents',
            error,
            () => applyIfMounted(setExternalFeaturedEvents, []),
            isInitialLoad,
          )),

        loadNamedTable('Hours', TABLES.Hours)
          .then((rows) => {
            const hourRows = visibleRows(rows);
            const generalHours = hourRows
              .filter((row) => String(row.category || '').toLowerCase() === 'general')
              .map((row) => ({ days: row.day || row.days || '', hours: row.time || row.hours || '' }))
              .filter((row) => row.days && row.hours);

            const happyHours = hourRows
              .filter((row) => String(row.category || '').toLowerCase() === 'happy hour')
              .map((row) => ({ days: row.day || row.days || '', hours: row.time || row.hours || '' }))
              .filter((row) => row.days && row.hours);

            applyIfMounted(setExternalBusinessHours, generalHours);
            applyIfMounted(setExternalHappyHourHours, happyHours);
          })
          .catch((error) => handleLoadError(
            'Hours',
            error,
            () => {
              applyIfMounted(setExternalBusinessHours, []);
              applyIfMounted(setExternalHappyHourHours, []);
            },
            isInitialLoad,
          )),

        loadNamedTable('FAQs', TABLES.FAQs)
          .then((rows) => {
            const faqRows = visibleRows(rows).map((row) => ({
              question: row.question || '',
              answer: row.answer || '',
              sortOrder: Number(row.sortOrder || 999),
              active: 'yes',
              category: row.category || '',
            })).filter((item) => item.question && item.answer);

            applyIfMounted(setExternalFaqItems, faqRows);
          })
          .catch((error) => handleLoadError(
            'FAQs',
            error,
            () => applyIfMounted(setExternalFaqItems, []),
            isInitialLoad,
          )),

        loadNamedTable('Reviews', TABLES.Reviews)
          .then((rows) => {
            const reviewRows = visibleRows(rows).map((row) => ({
              quote: row.review || row.quote || '',
              author: row.reviewer || row.author || '',
              stars: Number(row.stars || 5),
            })).filter((review) => review.quote && review.author);

            applyIfMounted(setExternalReviews, reviewRows);
          })
          .catch((error) => handleLoadError(
            'Reviews',
            error,
            () => applyIfMounted(setExternalReviews, []),
            isInitialLoad,
          )),

        loadNamedTable('ShoppingCategories', TABLES.ShoppingCategories)
          .then((rows) => {
            const visibleCategoryRows = rows.filter(
              (row) => String(row.visible || '').trim().toLowerCase() === 'true'
            );

            const categoryRows = visibleCategoryRows.map((row) => {
              const category = String(row.category || '').trim().toLowerCase();
              return {
                category,
                title: row.heading || row.title || '',
                action: row.buttonText || row.action || '',
                description: row.subtitle || row.description || '',
                image: tableMediaUrl(row),
                sortOrder: Number(row.sortOrder || 999),
              };
            }).filter((item) => item.category && item.title && item.action && item.image)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            // An empty array is intentional when every published row is hidden.
            applyIfMounted(setExternalShopCategories, categoryRows);
          })
          .catch((error) => handleLoadError(
            'ShoppingCategories',
            error,
            () => applyIfMounted(setExternalShopCategories, null),
            isInitialLoad,
          )),

        loadNamedTable('Shopping', TABLES.Shopping)
          .then((rows) => {
            const visibleShoppingRows = rows.filter(
              (row) => String(row.visible || '').trim().toLowerCase() === 'true'
            );

            const shoppingRows = visibleShoppingRows.map((row) => ({
              category: String(row.category || '').trim().toLowerCase(),
              name: row.item || row.name || '',
              price: row.price || '',
              availabilityText: row.availabilityText || '',
              photo: tableMediaUrl(row),
              sortOrder: Number(row.sortOrder || 999),
            })).filter((item) => item.category && item.name && item.price)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            applyIfMounted(setExternalShoppingItems, shoppingRows);
          })
          .catch((error) => handleLoadError(
            'Shopping',
            error,
            () => {
              // Never substitute sample products when the published sheet is
              // unavailable. An empty dialog is more accurate than stale data.
              applyIfMounted(setExternalShoppingItems, []);
            },
            isInitialLoad,
          )),
      ];

      await Promise.all(tableLoads);
    };

    loadAllTables({ isInitialLoad: true });

    const refreshInterval = window.setInterval(() => {
      loadAllTables({ force: true });
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, []);

  const navHref = (item) => (item === 'Order Online' ? orderOnlineUrl : '#' + getSectionId(item));
  const navTarget = (item) => (item === 'Order Online' ? '_blank' : undefined);
  const navRel = (item) => (item === 'Order Online' ? 'noopener noreferrer' : undefined);
  const getShopItemKey = (item) => String(activeShopCategory) + '|' + item.name + '|' + item.price;
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

  const unavailableTables = Object.entries(tableStatus)
    .filter(([, status]) => status === 'error')
    .map(([label]) => label);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <a href="#home" className="leading-tight shrink-0" aria-label="Board Wine & Cheese home">
            <div className="text-2xl md:text-3xl font-serif tracking-[0.18em] text-stone-900">BOARD</div>
            <p className="mt-1 text-[11px] md:text-xs uppercase tracking-[0.14em] text-stone-500 font-medium whitespace-nowrap">Wine - Cheese - Charcuterie</p>
          </a>

          <nav className="hidden lg:flex gap-7 text-sm font-medium" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a key={item} href={navHref(item)} target={navTarget(item)} rel={navRel(item)} className="hover:text-stone-500 transition-colors whitespace-nowrap">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowReservationModal(true)} className="hidden sm:inline-flex items-center justify-center min-w-[170px] bg-stone-900 text-white px-6 py-3.5 rounded-full text-sm font-medium text-center hover:bg-stone-700 transition-colors whitespace-nowrap shadow-sm">Reserve a Table</button>
            <button type="button" onClick={() => setShowMobileMenu((current) => !current)} className="lg:hidden border border-stone-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-stone-100 transition-colors" aria-expanded={showMobileMenu} aria-controls="mobile-navigation">
              {showMobileMenu ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <nav id="mobile-navigation" className="lg:hidden border-t border-stone-200 bg-white px-6 py-5 shadow-sm" aria-label="Mobile navigation">
            <div className="flex flex-col gap-4 text-sm font-medium">
              {navItems.map((item) => (
                <a key={item} href={navHref(item)} target={navTarget(item)} rel={navRel(item)} onClick={() => setShowMobileMenu(false)} className="py-2 border-b border-stone-100 last:border-b-0 hover:text-stone-500 transition-colors">
                  {item}
                </a>
              ))}
              <button type="button" onClick={() => { setShowMobileMenu(false); setShowReservationModal(true); }} className="mt-2 bg-stone-900 text-white text-center px-5 py-3 rounded-full hover:bg-stone-700 transition-colors">Reserve a Table</button>
            </div>
          </nav>
        )}
      </header>

      {unavailableTables.length > 0 && (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-center text-sm text-amber-950">
          Some current information is temporarily unavailable ({unavailableTables.join(', ')}). Please check back shortly.
        </div>
      )}

      <main id="main-content">
      <section id="home" aria-labelledby="home-heading" className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        {heroPosterUrl && (
          <CloudImage
            src={heroPosterUrl}
            alt="Board Wine and Cheese wine bar atmosphere in Kittery Maine"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {heroVideoUrl && !heroVideoFailed && (
          <video
            key={heroVideoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={heroPosterUrl}
            onError={() => setHeroVideoFailed(true)}
          >
            <source src={heroVideoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <h1 id="home-heading" className="text-5xl md:text-7xl font-serif mb-6 leading-tight">{heroTitle}</h1>
          <p className="text-lg md:text-xl text-stone-100 mb-8 leading-relaxed">{heroSubtitle}</p>
          {heroTitle && <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#menu" className="bg-white text-stone-900 px-8 py-3 rounded-full font-medium hover:bg-stone-200 transition-colors">View Menu</a>
            {/* Order Pickup hero CTA hidden for now. Uncomment if you decide you want it back.
            <a href={orderOnlineUrl} target="_blank" rel="noopener noreferrer" className="border border-white px-8 py-3 rounded-full hover:bg-white/10 transition-colors">Order Pickup</a>
            */}
            <a href="#events" className="border border-white px-8 py-3 rounded-full hover:bg-white/10 transition-colors">Upcoming Events</a>
          </div>}
        </div>
      </section>

      <section aria-labelledby="inside-board-heading" className="bg-white py-20 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8 text-center">
            <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-3">
              Inside Board
            </p>
            <h2 id="inside-board-heading" className="text-3xl md:text-4xl font-serif mb-4">
              The atmosphere matters.
            </h2>
            <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto">
              A warm neighborhood wine bar designed around conversation, shared plates,
              music, and a relaxed evening experience.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 shadow-sm h-[360px] md:h-[430px]">
            {venueSlides.map((slide, index) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === activeVenueSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <CloudImage
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

                <div className="absolute inset-x-0 bottom-0 p-8 md:p-10 text-white">
                  <div className="max-w-2xl">
                    <p className="uppercase tracking-[0.28em] text-xs text-stone-200 mb-4">
                      {slide.title}
                    </p>
                    <h3 className="text-3xl md:text-5xl font-serif mb-5 leading-tight">
                      {slide.subtitle}
                    </h3>
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
              <button
                type="button"
                onClick={() =>
                  setActiveVenueSlide((current) =>
                    current === 0 ? venueSlides.length - 1 : current - 1
                  )
                }
                className="flex items-center justify-center leading-none h-11 w-11 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/25 transition-colors"
                aria-label="Previous venue photo"
              >
                <ArrowLeftIcon size={18} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveVenueSlide((current) =>
                    current === venueSlides.length - 1 ? 0 : current + 1
                  )
                }
                className="flex items-center justify-center leading-none h-11 w-11 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/25 transition-colors"
                aria-label="Next venue photo"
              >
                <ArrowRightIcon size={18} />
              </button>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {venueSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveVenueSlide(index)}
                  className={`transition-all rounded-full ${
                    index === activeVenueSlide
                      ? 'bg-white w-8 h-2.5'
                      : 'bg-white/50 w-2.5 h-2.5'
                  }`}
                  aria-label={`Show venue slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="about-board-heading" className="bg-stone-100 py-24 border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">What Board Is</p>
          <h2 id="about-board-heading" className="text-4xl md:text-5xl font-serif mb-8 leading-tight">More than a wine bar.</h2>
          <p className="text-lg leading-relaxed text-stone-600 max-w-3xl mx-auto">Board is designed around atmosphere, conversation, and discovery. Whether you stop in for a single glass of wine, a shared charcuterie board, or a live music night with friends, the experience is intended to feel curated, welcoming, and distinctly local.</p>
          <p className="sr-only">Board Wine & Cheese is a Kittery, Maine wine bar serving wine flights, artisan cheese, charcuterie boards, craft beer, small plates, private events, catering, and live music for guests from Kittery, Portsmouth, and the Seacoast.</p>
        </div>
      </section>

      <section id="menu" aria-labelledby="menu-heading" className="bg-white py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Menu</p>
            <h2 id="menu-heading" className="text-4xl md:text-5xl font-serif mb-6">Explore the Wine Bar Menu</h2>
            <p className="text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto">
              Thoughtfully curated boards, small plates, wine flights, rotating pours, and craft beer selections designed for sharing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-14">
            {signaturePreviewCategories.map((category) => {
              const categoryItems = menuItems.filter((item) => item.category === category);
              const isExpanded = Boolean(expandedMenuCategories[category]);
              const previewItems = isExpanded ? categoryItems : categoryItems.slice(0, 3);
              const previewImage = categoryItems.find((item) => item.image)?.image || '';

              return (
                <div key={category} className="group bg-stone-50 rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  {previewImage && (
                    <CloudImage src={previewImage} alt={category} className="h-56 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  )}
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <h4 className="text-xl lg:text-[1.35rem] font-serif leading-snug">{category}</h4>
                    </div>
                    <ul className="space-y-3 text-stone-600 text-sm">
                      {previewItems.map((item) => (
                        <li key={item.item} className="flex items-center justify-between gap-3 border-b border-stone-200 pb-3">
                          <span className="min-w-0 flex-1">{item.item}</span>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-stone-400">{item.price}</span>
                            <button
                              type="button"
                              onClick={() => setActiveMenuItem(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-white hover:text-stone-900 transition-colors"
                              aria-label={'View details for ' + item.item}
                            >
                              <ChevronDownIcon size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {categoryItems.length > 3 && (
                      <button
                        type="button"
                        onClick={() => toggleMenuCategory(category)}
                        className="mt-5 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Less' : 'More'}
                        {isExpanded ? <ChevronUpIcon size={15} /> : <ChevronDownIcon size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-5">
            {fullMenuUrl && fullMenuButtonText && (
              <button
                type="button"
                onClick={() => setShowMenuPdfModal(true)}
                className="inline-flex items-center justify-center bg-stone-900 text-white px-10 py-4 rounded-full text-lg hover:bg-stone-700 transition-colors shadow-sm"
              >
                {fullMenuButtonText}
              </button>
            )}
            
            <a
              href={orderOnlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-stone-400 px-10 py-4 rounded-full text-lg hover:bg-stone-100 transition-colors"
            >
              Order Online
            </a>

          </div>
        </div>
      </section>

      {activeMenuItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setActiveMenuItem(null)}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-stone-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {activeMenuItem.image && (
              <CloudImage
                src={activeMenuItem.image}
                alt={activeMenuItem.item}
                className="h-64 w-full object-cover"
              />
            )}

            <div className="p-7 sm:p-8">
              <div className="mb-5 flex items-start justify-between gap-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.3em] text-stone-500">
                    Menu Item
                  </p>
                  <h3 className="text-3xl font-serif text-stone-900">
                    {activeMenuItem.item}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMenuItem(null)}
                  className="h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors"
                  aria-label="Close item details"
                >
                  X
                </button>
              </div>

              {activeMenuItem.price && (
                <p className="text-xl font-medium text-stone-900">
                  {activeMenuItem.price}
                </p>
              )}

              {activeMenuItem.description && (
                <p className="mt-4 text-stone-600 leading-relaxed">
                  {activeMenuItem.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showMenuPdfModal && fullMenuUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6"
          onClick={() => setShowMenuPdfModal(false)}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-stone-50 shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-1">Menu</p>
                <h3 className="text-2xl sm:text-3xl font-serif text-stone-900">Current Menu</h3>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={fullMenuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex border border-stone-300 px-5 py-2.5 rounded-full text-sm hover:bg-white transition-colors"
                >
                  Open PDF
                </a>

                <button
                  type="button"
                  onClick={() => setShowMenuPdfModal(false)}
                  className="h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors"
                  aria-label="Close menu"
                >
                  X
                </button>
              </div>
            </div>

            <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-stone-500">Loading menu viewer…</div>}>
              <MenuPdfViewer file={fullMenuUrl} />
            </Suspense>
          </div>
        </div>
      )}

      <section id="happy-hour" aria-labelledby="happy-hour-heading" className="bg-stone-100 py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Happy Hour</p>
            <h2 id="happy-hour-heading" className="text-4xl font-serif mb-6 leading-tight">{happyHourHome.title}</h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8">{happyHourHome.subtitle || happyHourHome.subTitle}</p>
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm inline-block">
              <p className="text-sm uppercase tracking-[0.2em] text-stone-500 mb-2">Hours</p>
              {happyHourHours.map((row) => (
                <p key={row.days} className="text-2xl font-serif">{row.days} - {row.hours}</p>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl shadow-lg h-[500px]">
            {happyHourImages.map((image, index) => (
              <CloudImage key={image.alt} src={image.src} alt={image.alt} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === happyHourImageIndex ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {happyHourImages.map((_, index) => (
                <button key={index} type="button" onClick={() => setHappyHourImageIndex(index)} aria-label={'Show image ' + (index + 1)} className={`h-2.5 rounded-full transition-all ${index === happyHourImageIndex ? 'bg-white w-6' : 'bg-white/50 w-2.5 hover:bg-white/80'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="events" aria-labelledby="events-heading" className="bg-stone-900 text-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 text-center">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-400 mb-4">Events</p>
            <h2 id="events-heading" className="text-4xl font-serif mb-6">Live Music & Community Nights in Kittery</h2>
            <p className="text-stone-300 max-w-3xl mx-auto text-lg leading-relaxed">From live acoustic sets and wine tastings to seasonal community gatherings, Board is designed to bring people together around atmosphere, conversation, food, and wine.</p>
          </div>

          <div className="mb-20">
            <div className="flex items-end justify-between gap-6 mb-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-sm text-stone-400 mb-2">Live Music Calendar</p>
                <h4 className="text-3xl font-serif">Upcoming Performances</h4>
              </div>
              <div className="hidden sm:flex gap-3">
                <button type="button" onClick={() => document.getElementById('music-slider')?.scrollBy({ left: -320, behavior: 'smooth' })} className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-600 hover:bg-stone-800 transition-colors" aria-label="Scroll music events left">
                  <ArrowLeftIcon size={18} />
                </button>
                <button type="button" onClick={() => document.getElementById('music-slider')?.scrollBy({ left: 320, behavior: 'smooth' })} className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-600 hover:bg-stone-800 transition-colors" aria-label="Scroll music events right">
                  <ArrowRightIcon size={18} />
                </button>
              </div>
            </div>
            <div id="music-slider" className="flex gap-6 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {musicEvents.map((event) => (
                <article key={event.title} className="min-w-[260px] sm:min-w-[300px] lg:min-w-[320px] snap-start bg-stone-800 border border-stone-700 rounded-3xl overflow-hidden shadow-lg">
                  <CloudImage
                    src={event.image}
                    alt={`${event.title} live music event at Board Wine and Cheese`}
                    className="h-48 w-full object-cover"
                    onError={(imageEvent) => {
                      if (!imageEvent.currentTarget.src.endsWith(LIVE_MUSIC_FALLBACK_IMAGE)) {
                        imageEvent.currentTarget.src = LIVE_MUSIC_FALLBACK_IMAGE;
                      }
                    }}
                  />
                  <div className="p-5">
                    <p className="text-stone-400 text-xs uppercase tracking-wide mb-2">{event.date}</p>
                    <h3 className="text-lg font-serif leading-snug text-white">{event.title}</h3>
                    <div className="mt-4 flex flex-wrap gap-4">
                      {event.url && event.url !== '#' && (
                        <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-stone-300 underline underline-offset-4 hover:text-white">Website</a>
                      )}
                      {event.spotifyURL && (
                        <a href={event.spotifyURL} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-stone-300 underline underline-offset-4 hover:text-white">Spotify</a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <p className="text-sm text-stone-500 sm:hidden">Swipe sideways to see more performances.</p>
              <button type="button" onClick={() => setShowCalendarModal(true)} className="hidden sm:inline-flex border border-stone-600 px-6 py-3 rounded-full text-sm hover:bg-stone-800 transition-colors">View Full Calendar</button>
            </div>
          </div>

          <div className="mb-16">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-400 mb-4">Featured Seasonal Events</p>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredEventCards.map((event) => (
                <article key={event.occurrenceKey || `${event.title}|${event.date}`} className="bg-stone-800 border border-stone-700 rounded-2xl p-6">
                  <h3 className="text-xl font-serif text-white mb-2">{event.title}</h3>
                  <p className="text-stone-400 text-sm mb-3">
                    {featuredOccurrenceScheduleText(event)}
                  </p>
                  {event.description && (
                    <p className="text-stone-300 leading-relaxed text-sm">
                      {event.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => setShowCalendarModal(true)} className="inline-flex border border-stone-600 px-6 py-3 rounded-full text-sm hover:bg-stone-800 transition-colors">View Full Calendar</button>
            </div>
          </div>

          <div className="bg-stone-800 border border-stone-700 rounded-3xl p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="uppercase tracking-[0.3em] text-sm text-stone-400 mb-4">Private Parties</p>
              <h4 className="text-4xl font-serif mb-6 leading-tight">{privatePartiesHome.title}</h4>
              <p className="text-stone-300 text-lg leading-relaxed mb-8">{privatePartiesHome.subtitle || privatePartiesHome.subTitle}</p>
              <button type="button" onClick={() => setShowPrivateEventForm((current) => !current)} className="bg-white text-stone-900 px-8 py-4 rounded-full hover:bg-stone-200 transition-colors font-medium">{showPrivateEventForm ? 'Hide Private Event Form' : 'Inquire About Private Events'}</button>
              {showPrivateEventForm && (
                <form onSubmit={(event) => handleInquirySubmit(event, 'private_events', setPrivateEventStatus)} className="mt-8 bg-stone-900 border border-stone-700 rounded-3xl p-8 text-left">
                  <h5 className="text-2xl font-serif mb-6 text-white">Private Event Inquiry</h5>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input name="name" type="text" placeholder="Name" required className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                    <input name="phone" type="tel" placeholder="Phone" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                    <input name="email" type="email" placeholder="Email" required className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                    <input name="number_of_people" type="number" placeholder="Number of People" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                    <input name="requested_date" type="date" aria-label="Requested date" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white focus:outline-none" />
                    <select name="requested_time" required defaultValue="" aria-label="Requested time" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white focus:outline-none">
                      <option value="" disabled>Requested time</option>
                      {PRIVATE_EVENT_TIME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input name="duration" type="text" placeholder="Duration" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                    <input name="occasion" type="text" placeholder="Occasion" className="px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                  </div>
                  <textarea name="details" placeholder="Additional Details (including food allergies, dietary restrictions, setup requests, guest count details, or anything else we should know)" rows={4} className="w-full mt-4 px-5 py-4 rounded-2xl bg-stone-800 border border-stone-700 text-white placeholder:text-stone-400 focus:outline-none" />
                  <button type="submit" disabled={privateEventStatus.state === 'sending'} className="mt-6 bg-white text-stone-900 px-8 py-4 rounded-full hover:bg-stone-200 transition-colors font-medium disabled:opacity-60">{privateEventStatus.state === 'sending' ? 'Sending...' : 'Submit Inquiry'}</button>
                  {privateEventStatus.message && (
                    <p className={`mt-4 text-sm ${privateEventStatus.state === 'error' ? 'text-red-300' : 'text-stone-300'}`}>{privateEventStatus.message}</p>
                  )}
                </form>
              )}
            </div>
            <SectionCarousel images={homeImages(privatePartiesHome)} altPrefix="Private party at Board Wine and Cheese" heightClass="h-[400px]" />
          </div>
        </div>
      </section>

      {showCalendarModal && (
        <div className="hidden sm:flex fixed inset-0 z-[100] items-center justify-center bg-black/70 px-6" onClick={() => setShowCalendarModal(false)}>
          <div className="relative w-full max-w-6xl rounded-3xl bg-stone-50 p-8 shadow-2xl text-stone-900 max-h-[85vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-6 mb-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-2">Full Calendar</p>
                <h3 className="text-4xl font-serif">Upcoming Events</h3>
                <p className="mt-3 text-stone-600">Showing the current month and upcoming months from the music and featured-event CSV files.</p>
              </div>
              <button type="button" onClick={() => setShowCalendarModal(false)} className="h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors" aria-label="Close calendar">X</button>
            </div>

            <div className="space-y-12">
              {calendarMonths.map((month) => (
                <div key={month.label}>
                  <h4 className="text-2xl font-serif mb-5">{month.label}</h4>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-stone-500 mb-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => <div key={dayName}>{dayName}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {month.cells.map((day, index) => (
                      <div key={index} className={`min-h-[105px] rounded-2xl border p-3 text-left ${day ? 'bg-white border-stone-200' : 'bg-stone-100 border-stone-200/70'}`}>
                        {day && (
                          <>
                            <p className="text-sm font-medium text-stone-700 mb-2">{day.day}</p>
                            <div className="space-y-2">
                              {day.events.map((event) => (
                                <a
                                  key={event.occurrenceKey || event.title + event.date}
                                  href={event.url && event.url !== '#' ? event.url : undefined}
                                  target={event.url && event.url !== '#' ? '_blank' : undefined}
                                  rel={event.url && event.url !== '#' ? 'noopener noreferrer' : undefined}
                                  className="block rounded-xl bg-stone-900 px-3 py-2 text-xs leading-snug text-white hover:bg-stone-700"
                                >
                                  <span className="block text-stone-300">{event.type}</span>
                                  {event.title}
                                </a>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section id="catering" aria-labelledby="catering-heading" className="bg-stone-100 py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <SectionCarousel images={homeImages(cateringHome)} altPrefix="Board catering" heightClass="h-[500px]" />
          <div>
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Catering</p>
            <h2 id="catering-heading" className="text-4xl font-serif mb-6 leading-tight">{cateringHome.title}</h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8">{cateringHome.subtitle || cateringHome.subTitle}</p>
            <button
              type="button"
              onClick={() => setShowCateringForm((current) => !current)}
              className="bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors"
            >
              {showCateringForm ? 'Hide Catering Inquiry' : 'Inquire About Catering'}
            </button>

            {showCateringForm && (
              <form onSubmit={(event) => handleInquirySubmit(event, 'catering', setCateringStatus)} className="mt-8 bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
                <h4 className="text-2xl font-serif mb-6 text-stone-900">Catering Inquiry</h4>

                <div className="grid md:grid-cols-2 gap-4">
                  <input name="name" type="text" placeholder="Name" required className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" />
                  <input name="phone" type="tel" placeholder="Phone" className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" />
                  <input name="email" type="email" placeholder="Email" required className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" />
                  <input name="requested_date" type="date" aria-label="Requested date" className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none" />
                  <input name="occasion" type="text" placeholder="Occasion" className="md:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none" />
                </div>

                <textarea
                  name="details"
                  placeholder="Additional Details (including food allergies, dietary restrictions, setup requests, guest count details, or anything else we should know)"
                  rows={4}
                  className="w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none"
                />

                <button type="submit" disabled={cateringStatus.state === 'sending'} className="mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-60">{cateringStatus.state === 'sending' ? 'Sending...' : 'Submit Catering Inquiry'}</button>
                {cateringStatus.message && (
                  <p className={`mt-4 text-sm ${cateringStatus.state === 'error' ? 'text-red-700' : 'text-stone-600'}`}>{cateringStatus.message}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {shopItems.length > 0 && (
      <section id="shop" aria-labelledby="shop-heading" className="bg-white py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Shop</p>
            <h2 id="shop-heading" className="text-4xl md:text-5xl font-serif mb-6 leading-tight">Take a piece of Board home.</h2>
            <p className="text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto">In addition to dining in, Board offers select wines by the bottle, cheese to take home, and eventually a small collection of branded goods and gifts.</p>
          </div>
          {shopItems.length > 3 && (
            <div className="flex justify-end gap-3 mb-6">
              <button
                type="button"
                onClick={() => scrollShopCategories(-1)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-400 hover:bg-stone-100 transition-colors"
                aria-label="Scroll shopping categories left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollShopCategories(1)}
                className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-stone-400 hover:bg-stone-100 transition-colors"
                aria-label="Scroll shopping categories right"
              >
                →
              </button>
            </div>
          )}
          <div
            ref={shopItems.length > 3 ? shopSliderRef : null}
            className={shopItems.length > 3
              ? 'flex gap-8 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
              : 'grid md:grid-cols-3 gap-8'}
            onMouseEnter={() => setShopScrollPaused(true)}
            onMouseLeave={() => setShopScrollPaused(false)}
            onTouchStart={() => setShopScrollPaused(true)}
            onTouchEnd={() => setShopScrollPaused(false)}
          >
            {shopItems.map((item) => (
              <div key={item.category} className={`bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden shadow-sm ${shopItems.length > 3 ? 'min-w-[85%] md:min-w-[calc((100%-4rem)/3)]' : ''}`}>
                <CloudImage src={item.image} alt={item.title} className="h-64 w-full object-cover" />
                <div className="p-8">
                  <h4 className="text-2xl font-serif mb-4">{item.title}</h4>
                  <p className="text-stone-600 leading-relaxed mb-6">{item.description}</p>
                  <button type="button" onClick={() => { setSelectedShopItems([]); setActiveShopCategory(item.category); }} className="border border-stone-400 px-6 py-3 rounded-full text-sm hover:bg-stone-100 transition-colors">
                    {item.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {activeShopCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6" onClick={() => setActiveShopCategory(null)}>
          <div className="relative w-full max-w-3xl rounded-3xl bg-stone-50 p-8 shadow-2xl text-stone-900 max-h-[85vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-6 mb-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-2">Shop</p>
                <h3 className="text-4xl font-serif">{activeShopTitle}</h3>
              </div>
              <button type="button" onClick={() => setActiveShopCategory(null)} className="h-11 w-11 rounded-full border border-stone-300 hover:bg-white transition-colors" aria-label="Close shop popup">X</button>
            </div>

            <div className="space-y-4">
              {(shopData[activeShopCategory] || []).map((item) => (
                <div key={item.name} className={`flex items-center justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors ${isPickupItem(item) ? 'cursor-pointer hover:border-stone-400' : ''}`}>
                  <div className="flex items-center gap-4">
                    {isPickupItem(item) && (
                      <input type="checkbox" checked={isShopItemSelected(item)} onChange={() => toggleShopItem(item)} className="h-5 w-5 rounded border-stone-300" />
                    )}
                    {item.photo && <CloudImage src={item.photo} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />}
                    <div>
                      <h4 className="text-xl font-serif">{item.name}</h4>
                      {item.availabilityText && (
                        <p className="text-sm text-stone-500">{item.availabilityText}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-medium whitespace-nowrap">{item.price}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end border-t border-stone-200 pt-6">
              <button type="button" onClick={() => setActiveShopCategory(null)} className="border border-stone-300 px-8 py-4 rounded-full hover:bg-white transition-colors">Close</button>
              {activeShopHasPickupItems && (
                <a href={selectedShopItems.length ? getPurchaseUrl() : '#'} target={selectedShopItems.length ? '_blank' : undefined} rel={selectedShopItems.length ? 'noopener noreferrer' : undefined} onClick={(event) => { if (!selectedShopItems.length) event.preventDefault(); }} className={`px-8 py-4 rounded-full transition-colors text-center ${selectedShopItems.length ? 'bg-stone-900 text-white hover:bg-stone-700' : 'bg-stone-300 text-stone-500 cursor-not-allowed'}`}>
                  Buy {selectedShopItems.length ? '(' + selectedShopItems.length + ')' : ''}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <section aria-labelledby="reviews-heading" className="bg-stone-100 py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between gap-6 mb-12">
            <div>
              <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Reviews</p>
              <h2 id="reviews-heading" className="text-4xl font-serif">What guests are saying.</h2>
            </div>
          </div>
          <div
            id="review-slider"
            ref={reviewSliderRef}
            className="flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onMouseEnter={() => setReviewScrollPaused(true)}
            onMouseLeave={() => setReviewScrollPaused(false)}
            onTouchStart={() => setReviewScrollPaused(true)}
            onTouchEnd={() => setReviewScrollPaused(false)}
          >
            {reviews.map((review) => (
              <div key={review.author} className="min-w-[280px] sm:min-w-[340px] lg:min-w-[360px] snap-start bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
                <div className="flex gap-1 text-stone-900 mb-6" aria-label={`${review.stars || 5} star review`}>
                  {Array.from({ length: Math.max(1, Math.min(5, Number(review.stars || 5))) }).map((_, index) => (
                    <StarIcon key={index} size={16} />
                  ))}
                </div>
                <p className="text-lg leading-relaxed text-stone-600 mb-6 italic">{review.quote}</p>
                <p className="text-sm uppercase tracking-wide text-stone-500">{review.author}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-stone-500 sm:hidden">Swipe sideways to see more reviews.</p>
        </div>
      </section>

      <section id="wine-club" aria-labelledby="wine-club-heading" className="bg-white border-y border-stone-200 py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Join the Board</p>
          <h2 id="wine-club-heading" className="text-4xl md:text-5xl font-serif mb-8 leading-tight">Gift Cards.</h2>
          <p className="text-lg text-stone-600 leading-relaxed mb-10 max-w-3xl mx-auto">Give someone the Board experience with a digital gift card. Our Wine Club is coming soon.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <span className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-stone-100 px-8 py-4 text-stone-500" aria-label="Wine Club coming soon">Wine Club — Coming Soon</span>
            <a href={giftCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors">Buy Gift Cards</a>
          </div>
        </div>
      </section>

    <section id="reservations" aria-labelledby="reservations-heading" className="bg-stone-100 border-y border-stone-200 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">
            Reservations
          </p>
          <h2 id="reservations-heading" className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
            Reserve a table at Board Wine &amp; Cheese.
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto mb-8">
            Reservations are recommended for evenings, live music nights, and special events. Book securely through resOS.
          </p>
          <button
            type="button"
            onClick={() => setShowReservationModal(true)}
            className="inline-flex items-center justify-center bg-stone-900 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-stone-700 transition-colors shadow-sm"
          >
            Reserve Now
          </button>
        </div>
      </section>

      {showReservationModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-5"
          onClick={() => setShowReservationModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-heading"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-stone-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-7">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-1">
                  Reservations
                </p>
                <h3 id="reservation-modal-heading" className="text-2xl sm:text-3xl font-serif text-stone-900">
                  Reserve a Table
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowReservationModal(false)}
                className="h-10 w-10 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors"
                aria-label="Close reservation booking"
              >
                X
              </button>
            </div>

            <div className="px-5 py-6 sm:px-7 sm:py-7 text-center">
              <p className="text-stone-600 leading-relaxed">
                Reservations are handled securely through resOS. Continue below to choose your date, time, and party size.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
                <a
                  href={RESOS_BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-7 py-3.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700 transition-colors"
                >
                  Continue to Reservations
                </a>

                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-7 py-3.5 text-sm font-medium text-stone-700 hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-stone-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-6 border-b border-stone-200 px-6 py-5 sm:px-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-2">Contact Us</p>
                <h3 className="text-3xl sm:text-4xl font-serif text-stone-900">Send a Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors"
                aria-label="Close contact form"
              >
                X
              </button>
            </div>

            <form
              onSubmit={(event) => handleInquirySubmit(event, 'contact', setContactStatus)}
              className="p-6 sm:p-8"
            >
              <p className="text-stone-600 leading-relaxed mb-6">
                Questions about reservations, events, catering, wine club, gift cards, or anything else? Send us a note and we will get back to you shortly.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="name"
                  type="text"
                  placeholder="Name"
                  required
                  className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone"
                  className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  className="sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
                />
                <select
                  name="inquiry_type"
                  defaultValue=""
                  className="sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-stone-500"
                >
                  <option value="" disabled>What can we help with?</option>
                  <option value="General Question">General Question</option>
                  <option value="Reservation">Reservation</option>
                  <option value="Catering">Catering</option>
                  <option value="Private Events">Private Events</option>
                  <option value="Wine Club">Wine Club</option>
                  <option value="Gift Cards">Gift Cards</option>
                </select>
              </div>

              <textarea
                name="message"
                placeholder="Tell us how we can help..."
                rows={6}
                required
                className="w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500"
              />

              <button
                type="submit"
                disabled={contactStatus.state === 'sending'}
                className="mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors font-medium disabled:opacity-60"
              >
                {contactStatus.state === 'sending' ? 'Sending...' : 'Send Message'}
              </button>

              {contactStatus.message && (
                <p className={`mt-4 text-sm ${contactStatus.state === 'error' ? 'text-red-700' : 'text-stone-600'}`}>
                  {contactStatus.message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {showJobsModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setShowJobsModal(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-stone-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-6 border-b border-stone-200 px-6 py-5 sm:px-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-xs text-stone-500 mb-2">Jobs</p>
                <h3 className="text-3xl sm:text-4xl font-serif text-stone-900">Apply to Join Board</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJobsModal(false)}
                className="h-11 w-11 shrink-0 rounded-full border border-stone-300 hover:bg-white transition-colors"
                aria-label="Close jobs form"
              >
                X
              </button>
            </div>

            <form
              onSubmit={(event) => handleInquirySubmit(event, 'jobs', setJobsStatus)}
              className="p-6 sm:p-8"
            >
              <p className="text-stone-600 leading-relaxed mb-6">
                Interested in working at Board? Tell us a little about your hospitality experience and attach a resume if you have one.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <input name="name" type="text" placeholder="Name" required className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" />
                <input name="email" type="email" placeholder="Email" required className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" />
                <input name="phone" type="tel" placeholder="Phone" className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" />
                <input name="experience_years" type="number" min="0" step="1" placeholder="Experience (years)" className="px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" />
                <select name="experience_type" required defaultValue="" className="sm:col-span-2 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-stone-500">
                  <option value="" disabled>Experience type</option>
                  {JOB_EXPERIENCE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <textarea name="cover_letter" placeholder="Cover letter" rows={6} className="w-full mt-4 px-5 py-4 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500" />

              <label className="mt-4 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-5 text-stone-700 hover:border-stone-500 transition-colors">
                <span className="font-medium text-stone-900">Attach Resume</span>
                <span className="text-sm text-stone-500">PDF, Word, or text file. Maximum 5MB.</span>
                <input name="resume" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="text-sm text-stone-600" />
              </label>

              <button type="submit" disabled={jobsStatus.state === 'sending'} className="mt-6 bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors font-medium disabled:opacity-60">
                {jobsStatus.state === 'sending' ? 'Sending...' : 'Submit Application'}
              </button>

              {jobsStatus.message && (
                <p className={`mt-4 text-sm ${jobsStatus.state === 'error' ? 'text-red-700' : 'text-stone-600'}`}>
                  {jobsStatus.message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      </main>
{faqItems.length > 0 && (
<section id="faq" aria-labelledby="faq-heading" className="bg-stone-100 py-16 border-y border-stone-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-3">
              FAQ
            </p>
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-serif text-stone-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed max-w-2xl mx-auto">
              Quick answers about reservations, catering, private events, live music, gift cards, and visiting Board Wine &amp; Cheese in Kittery, Maine.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              const answerId = `faq-answer-${index}`;

              return (
                <div key={item.question} className="border-b border-stone-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left hover:bg-stone-50 transition-colors sm:px-8"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                  >
                    <span className="text-lg font-serif text-stone-900 sm:text-xl">{item.question}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xl text-stone-600" aria-hidden="true">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  {isOpen && (
                    <div id={answerId} className="px-6 pb-6 sm:px-8">
                      <p className="max-w-3xl text-stone-600 leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
)}


      <footer className="bg-stone-950 text-stone-300 py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div>
            <h4 className="text-2xl font-serif text-white mb-4">BOARD</h4>
            <p className="text-sm leading-relaxed text-stone-400">Wine - Cheese - Charcuterie</p>

            <ul className="mt-3 space-y-2 text-sm text-stone-400">
              <li className="pt-4 text-white font-medium uppercase tracking-wide text-xs">Hours</li>
              {businessHours.map((row) => <li key={row.days}>{row.days}: {row.hours}</li>)}
            </ul>
</div>
          
          <div>
            <h5 className="text-white font-medium mb-4">Visit</h5>
            <address className="not-italic text-sm text-stone-400">
              <p>5 Shapleigh Road</p>
              <p>Kittery, ME 03904</p>
              <p className="sr-only">Board Wine &amp; Cheese is located in Kittery, Maine near Portsmouth, New Hampshire.</p>
            </address>

            <div className="mt-4 overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
              <iframe
                title="Board Wine & Cheese location map"
                src="https://www.google.com/maps?q=5+Shapleigh+Road+Kittery+ME+03904&output=embed"
                className="h-36 w-full border-0 opacity-90 grayscale"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <a
              href="https://maps.google.com/?q=5+Shapleigh+Road+Kittery+ME+03904"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-200 transition-colors"
            >
              Get Directions
            </a>

          </div>
          <div>
            <h5 className="text-white font-medium mb-4">Explore</h5>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><a href={giftCardUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Gift Cards</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#catering" className="hover:text-white transition-colors">Catering</a></li>
              <li><a href="#events" className="hover:text-white transition-colors">Private Events</a></li>
              <li><button type="button" onClick={() => setShowContactModal(true)} className="hover:text-white transition-colors text-left">Contact</button></li>
              <li><button type="button" onClick={() => setShowJobsModal(true)} className="hover:text-white transition-colors text-left">Jobs</button></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-medium mb-4">Contact Us</h5>
            <ul className="space-y-3 text-sm text-stone-400">
              <li>
                <button type="button" onClick={() => setShowContactModal(true)} className="inline-flex rounded-full bg-white px-5 py-2.5 text-stone-900 font-medium hover:bg-stone-200 transition-colors">
                  Send a Message
                </button>
              </li>
              <li className="pt-2">
                <span className="text-white">Email:</span>{' '}
                <a href="mailto:cscala@mainecheeseboard.com" className="hover:text-white transition-colors">
                  cscala@mainecheeseboard.com
                </a>
              </li>
              <li>
                <span className="text-white">Phone:</span>{' '}
                <a href="tel:+12074360300" className="hover:text-white transition-colors">
                  (207) 436-0300
                </a>
              </li>
              <li className="pt-4">
                <a href="https://www.instagram.com/boardwineandcheese/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors">
                  <InstagramIcon size={18} />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/Board.KitteryME/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors">
                  <FacebookIcon size={18} />
                  <span>Facebook</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-12 pt-8 text-center text-sm text-stone-500">2026 Board Wine & Cheese - Curated hospitality experience.</div>
      </footer>
    </div>
  );
}
