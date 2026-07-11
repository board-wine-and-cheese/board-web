import { useEffect, useMemo, useRef, useState } from 'react';
import { TABLES } from './config';
import { loadTable, visibleRows } from './lib/googleSheets';

const LOCAL_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1600&auto=format&fit=crop',
  happyHourWine: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200&auto=format&fit=crop',
  happyHourBoard: 'https://res.cloudinary.com/boardwineandcheese/image/upload/v1783206639/food/boards/charcuterie-3.jpg?q=80&w=1200&auto=format&fit=crop',
  happyHourBeer: 'https://res.cloudinary.com/boardwineandcheese/image/upload/v1783279897/food/beverages/beer-and-cheese.jpg?q=80&w=1200&auto=format&fit=crop',
  catering: 'https://res.cloudinary.com/boardwineandcheese/image/upload/v1783277697/main/catering.jpg?q=80&w=1200&auto=format&fit=crop',
  privateEvents: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?q=80&w=1200&auto=format&fit=crop',
  wineBottle: 'https://res.cloudinary.com/boardwineandcheese/image/upload/v1783279489/main/wines.jpg?q=80&w=1200&auto=format&fit=crop',
  cheeseDisplay: 'https://res.cloudinary.com/boardwineandcheese/image/upload/v1783279619/main/wine-and-cheese.jpg?q=80&w=900&auto=format&fit=crop',
  swagDisplay: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=900&auto=format&fit=crop',
};

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

function parsePipeDelimitedRows(text, mapper) {
  const lineBreak = String.fromCharCode(10);
  const carriageReturn = String.fromCharCode(13);

  return text
    .split(lineBreak)
    .map((line) => line.replace(carriageReturn, '').trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const values = line.split('|').map((value) => (value ? value.trim() : ''));
      return mapper(values);
    });
}

function parseVenueGalleryCsv(csvText) {
  return csvText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [title, subtitle, image] = line
        .split('|')
        .map((value) => value.trim());

      return { title, subtitle, image };
    });
}

function parseEventsCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    title: values[0] || '',
    date: values[1] || '',
    url: values[2] || '#',
    image: values[3] || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop',
  })).filter((event) => event.title && event.date);
}

function parseReviewsCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    quote: values[0] || '',
    author: values[1] || '',
  })).filter((review) => review.quote && review.author);
}

function parseSimpleShopCsv(csvText, fallbackPhoto) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    name: values[0] || '',
    price: values[1] || '',
    photo: values[2] || fallbackPhoto,
  })).filter((item) => item.name && item.price);
}

function parseSwagCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    name: values[0] || '',
    photo: values[1] || '',
    price: values[2] || '',
  })).filter((item) => item.name && item.price);
}

function parseHoursCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    days: values[0] || '',
    hours: values[1] || '',
  })).filter((row) => row.days && row.hours);
}

function parseFaqCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    question: values[0] || '',
    answer: values[1] || '',
    sortOrder: Number(values[2] || 999),
    active: String(values[3] || 'yes').toLowerCase(),
  }))
    .filter((item) => item.question && item.answer && item.active !== 'no' && item.active !== 'false')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseFeaturedEventsCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    title: values[0] || '',
    date: values[1] || '',
    time: values[2] || '',
    description: values[3] || '',
  })).filter((event) => event.title && event.date);
}

function parseMenuCsv(csvText) {
  return parsePipeDelimitedRows(csvText, (values) => ({
    category: values[0] || '',
    item: values[1] || '',
    description: values[2] || '',
    price: values[3] || '',
    image: values[4] || '',
  })).filter((item) => item.category && item.item);
}

function parseEventDate(dateText) {
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

  const lower = String(dateText || '').toLowerCase();
  const monthIndex = monthNames.findIndex((month) => lower.includes(month));
  const dayMatch = lower.match(/[0-9]{1,2}/);

  if (monthIndex < 0 || !dayMatch) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const day = Number(dayMatch[0]);
  const parsedDate = new Date(currentYear, monthIndex, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
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
        const eventDate = parseEventDate(event.date);
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

const parserTests = [
  { name: 'events parser', result: parseEventsCsv('Band One | June 6 | https://example.com').length, expected: 1 },
  { name: 'reviews parser', result: parseReviewsCsv('Great place | Sarah M.').length, expected: 1 },
  { name: 'hours parser', result: parseHoursCsv('Tue-Fri | 4PM-10PM').length, expected: 1 },
  { name: 'featured events parser', result: parseFeaturedEventsCsv('Event | June 4 | 5PM | Description').length, expected: 1 },
];

parserTests.forEach((test) => {
  if (test.result !== test.expected) {
    console.warn('Parser test failed:', test.name);
  }
});


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
const RESOS_RESTAURANT_ID = 'D2tg5gKY3LXAMgByZ';
const RESOS_DOMAIN = 'board.resos.com';

{/* const RESOS_BOOKING_URL = 'https://restaurant-1780243399.resos.com/booking'; */}
{/* const RESOS_RESTAURANT_ID = 'xAa6YYk2iJ6j6jmzT'; */}
{/* const RESOS_DOMAIN = 'restaurant-1780243399.resos.com'; */}

{/*
  <!-- resOS Booking widget v3 script START -->
  <a class="resos-booking-widget" href="https://board.resos.com/booking" 
  data-lang="en" data-restaurant-id="D2tg5gKY3LXAMgByZ" 
  data-domain="board.resos.com">Book a table</a><div id="resos-booking-script-3" style="text-align:center;opacity:0.6;font-size:70%;margin-top:10px;"><a target="_blank" rel="noopener" href="https://resos.com/?utm_source=restaurantsite&utm_medium=bookingwidget">Restaurant booking system by resOS</a></div><script type="text/javascript">(function() {const scr=document.createElement("script");scr.src="https://board.resos.com/embed/booking/widget.js?ts="+new Date().getTime();document.getElementById("resos-booking-script-3").appendChild(scr);})()</script>
<!-- resOS Booking widget v3 script END -->
*/}

function ResosBookingWidget() {
  useEffect(() => {
    const scriptContainer = document.getElementById('resos-booking-script-3');

    if (!scriptContainer) {
      return undefined;
    }

    const existingScript = scriptContainer.querySelector('script[data-resos-booking-widget="true"]');

    if (existingScript) {
      return undefined;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://' + RESOS_DOMAIN + '/embed/booking/widget.js?ts=' + new Date().getTime();
    script.dataset.resosBookingWidget = 'true';

    scriptContainer.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="text-center">
      <a
        className="resos-booking-widget inline-flex items-center justify-center bg-stone-900 text-white px-8 py-3.5 rounded-full text-base font-medium hover:bg-stone-700 transition-colors shadow-sm"
        href={RESOS_BOOKING_URL}
        data-lang="en"
        data-restaurant-id={RESOS_RESTAURANT_ID}
        data-domain={RESOS_DOMAIN}
      >
        Book a table
      </a>

      <div
        id="resos-booking-script-3"
        className="text-center opacity-60 text-[70%] mt-3"
      >
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://resos.com/?utm_source=restaurantsite&utm_medium=bookingwidget"
          className="text-stone-500 underline underline-offset-4 hover:text-stone-700"
        >
          Restaurant booking system by resOS
        </a>
      </div>

      <p className="mt-4 text-xs text-stone-500 leading-relaxed max-w-xl mx-auto">
        Reservations are handled securely through resOS. If the widget does not load, use the button above to open the booking page directly.
      </p>
    </div>
  );
}

export default function App() {
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
  const [externalWineItems, setExternalWineItems] = useState([]);
  const [externalCheeseItems, setExternalCheeseItems] = useState([]);
  const [externalSwagItems, setExternalSwagItems] = useState([]);
  const [selectedShopItems, setSelectedShopItems] = useState([]);
  const [externalBusinessHours, setExternalBusinessHours] = useState([]);
  const [externalHappyHourHours, setExternalHappyHourHours] = useState([]);
  const [externalFeaturedEvents, setExternalFeaturedEvents] = useState([]);
  const [externalFaqItems, setExternalFaqItems] = useState([]);
  const [externalMenuItems, setExternalMenuItems] = useState([]);
  const [externalFullMenuRows, setExternalFullMenuRows] = useState([]);
  const [externalHeroRows, setExternalHeroRows] = useState([]);
  const [externalHomeRows, setExternalHomeRows] = useState([]);
  const [reviewScrollPaused, setReviewScrollPaused] = useState(false);
  const [expandedMenuCategories, setExpandedMenuCategories] = useState({});
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const reviewSliderRef = useRef(null);


  const HERO_VIDEO_URL = 'https://res.cloudinary.com/boardwineandcheese/video/upload/v1783267164/hero/board-hero.mp4';
  const HERO_POSTER_URL = '/images/wine-bottle.jpg';
  const activeHero = externalHeroRows[0] || {};
  const heroTitle = activeHero.title || 'Board Wine & Cheese in Kittery, Maine';
  const heroSubtitle = activeHero.subtitle || activeHero.subTitle || 'A relaxed neighborhood wine bar for thoughtfully selected wines, craft beer, artisan cheeses, charcuterie boards, wine flights, seasonal dishes, private events, catering, and live music near Portsmouth, New Hampshire.';
  const heroMediaUrl = activeHero.mediaURL || activeHero.cloudinaryURL || '';
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const heroVideoUrl = cloudinaryVideoUrl(HERO_VIDEO_URL);
  const heroPosterUrl = HERO_POSTER_URL;

  const [venueSlides, setVenueSlides] = useState([
    {
      title: 'Wide Interior',
      subtitle: 'Designed for conversation and lingering.',
      image: '/images/interior/interior-wide.jpg',
    },
    {
      title: 'Seating Area',
      subtitle: 'Cozy corners and shared boards.',
      image: '/images/interior/seating.jpg',
    },
    {
      title: 'The Bar',
      subtitle: 'Curated pours and rotating flights.',
      image: '/images/interior/bar.jpg',
    },
    {
      title: 'Live Music',
      subtitle: 'Local artists and community nights.',
      image: '/images/interior/music.jpg',
    },
  ]);
  const [activeVenueSlide, setActiveVenueSlide] = useState(0);

  useEffect(() => {
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

  const fallbackToastUrl = 'https://www.toasttab.com/local/order/maine-cheese-board-5-shapleigh-road-suite-108/r-3675ebdf-fcc5-43fb-a265-99af7ccdd2e3?diningOption=takeout';
  const orderOnlineUrl = import.meta.env.VITE_CHOWNOW_URL || fallbackToastUrl;
  const wineClubUrl = import.meta.env.VITE_WINEVIEW_URL || 'https://www.wineviewclubs.com/toast';
  const giftCardUrl = import.meta.env.VITE_GIFT_CARD_URL || 'https://order.toasttab.com/egiftcards/maine-cheese-board-5-shapleigh-road-suite-108';
  const directionsUrl = 'https://maps.google.com/?q=5+Shapleigh+Road+Kittery+ME+03904';
  const swagOrderUrl = import.meta.env.VITE_SWAG_ORDER_URL || import.meta.env.VITE_MERCH_URL || giftCardUrl;
  const externalPurchaseBaseUrl = swagOrderUrl;
  const navItems = ['Home', 'Menu', 'Happy Hour', 'Events', 'Shop', 'Order Online'];

  const fallbackBusinessHours = [
    { days: 'Mon-Thu', hours: '4PM-10PM' },
    { days: 'Fri-Sat', hours: '12PM-11PM' },
    { days: 'Sunday', hours: '12PM-8PM' },
  ];

  const fallbackHappyHourHours = [{ days: 'Mon-Fri', hours: '4PM-6PM' }];
  const businessHours = externalBusinessHours.length ? externalBusinessHours : fallbackBusinessHours;
  const happyHourHours = externalHappyHourHours.length ? externalHappyHourHours : fallbackHappyHourHours;

  const fallbackMenuItems = [
    { category: 'Signature Boards', item: 'Classic Charcuterie', description: 'A curated selection of meats, cheeses, seasonal accompaniments, and house pairings.', price: '$28', image: LOCAL_IMAGES.happyHourBoard },
    { category: 'Signature Boards', item: 'Local Cheese Board', description: 'A rotating board featuring regional cheeses and seasonal pairings.', price: '$24', image: LOCAL_IMAGES.cheeseDisplay },
    { category: 'Signature Boards', item: 'Seasonal Pairings', description: 'Chef-selected bites built around what is fresh, local, and pairing well right now.', price: 'MP', image: LOCAL_IMAGES.happyHourBoard },
    { category: 'By the Glass & Flights', item: 'Red Wine Flight', description: 'Three rotating red pours selected for contrast and discovery.', price: '$18', image: LOCAL_IMAGES.happyHourWine },
    { category: 'By the Glass & Flights', item: 'White Wine Flight', description: 'A bright rotating flight featuring crisp, aromatic, and textured whites.', price: '$18', image: LOCAL_IMAGES.happyHourWine },
    { category: 'By the Glass & Flights', item: 'Craft Beer Selection', description: 'A rotating selection of craft beers chosen to complement the board menu.', price: '$8+', image: LOCAL_IMAGES.happyHourBeer },
    { category: 'Small Plates', item: 'Warm Olives', description: 'Warm marinated olives with citrus, herbs, and spices.', price: '$10', image: LOCAL_IMAGES.cheeseDisplay },
    { category: 'Small Plates', item: 'Flatbread', description: 'Seasonal flatbread designed for sharing.', price: '$16', image: LOCAL_IMAGES.happyHourBoard },
    { category: 'Small Plates', item: 'Dessert Pairing', description: 'A sweet finish paired with wine or bubbles.', price: '$12', image: LOCAL_IMAGES.cheeseDisplay },
  ];

  const menuItems = externalMenuItems.length ? externalMenuItems : fallbackMenuItems;
  const fullMenuRow = externalFullMenuRows[0] || {};
  const fullMenuTitle = fullMenuRow.title || 'View Full Menu';
  const fullMenuPdfUrl = fullMenuRow.mediaURL || fullMenuRow.cloudinaryURL || fullMenuRow.pdfURL || '/pdf/current-menu.pdf';
  const fullMenuEmbedUrl = fullMenuPdfUrl.includes('#')
    ? fullMenuPdfUrl
    : fullMenuPdfUrl + '#toolbar=0&navpanes=0&scrollbar=0';
  const menuCategories = Array.from(new Set(menuItems.map((item) => item.category)));
  const signaturePreviewCategories = menuCategories.slice(0, 3);

  const toggleMenuCategory = (category) => {
    setExpandedMenuCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const fallbackReviews = [
    { quote: 'One of the best wine bar experiences on the Seacoast - cozy, welcoming, and beautifully curated.', author: 'Sarah M.' },
    { quote: 'The charcuterie boards are incredible and the atmosphere feels elevated without being pretentious.', author: 'Michael T.' },
    { quote: 'Perfect for date night, girls night, or just a glass of wine after work.', author: 'Jenna R.' },
    { quote: 'A warm, inviting place to share wine, cheese, and a relaxed evening with friends.', author: 'Amanda K.' },
    { quote: 'Thoughtful wine selections, friendly staff, and a setting that feels both casual and special.', author: 'David P.' },
  ];

  const reviews = externalReviews.length ? externalReviews : fallbackReviews;

  const fallbackMusicEvents = [
    { title: 'The Seacoast Ramblers', date: 'June 6 - 7PM', url: '#', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop' },
    { title: 'Emma James Trio', date: 'June 8 - 6PM', url: '#', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop' },
    { title: 'Vinyl Night with DJ Luca', date: 'June 12 - 8PM', url: '#', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=800&auto=format&fit=crop' },
    { title: 'Jazz on the Patio', date: 'June 15 - 5PM', url: '#', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800&auto=format&fit=crop' },
    { title: 'Acoustic Sunday Sessions', date: 'June 18 - 4PM', url: '#', image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop' },
    { title: 'Bluegrass and Bubbles', date: 'June 21 - 7PM', url: '#', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=800&auto=format&fit=crop' },
  ];

  const musicEvents = externalMusicEvents.length ? externalMusicEvents : fallbackMusicEvents;

  const fallbackFeaturedEvents = [
    { title: 'Fathers Day Wine Pairings', date: 'June 16', time: '6PM', description: 'Seasonal wine pairings curated for Father’s Day gatherings and celebrations.' },
    { title: 'National Cheese Day Celebration', date: 'June 4', time: '5PM', description: 'Featured regional cheeses, pairings, and special tasting boards all evening.' },
    { title: 'National Prosecco Day', date: 'August 13', time: '7PM', description: 'Sparkling flights, seasonal bites, and prosecco-focused specials.' },
    { title: 'Rose All Day Weekend', date: 'July 20', time: '12PM', description: 'Summer rosé features, charcuterie pairings, and patio specials.' },
  ];

  const featuredEvents = externalFeaturedEvents.length ? externalFeaturedEvents : fallbackFeaturedEvents;

  const fallbackFaqItems = [
    {
      question: 'Do I need a reservation?',
      answer: 'Reservations are recommended, but walk-ins are welcome when space is available.',
      sortOrder: 1,
      active: 'yes',
    },
    {
      question: 'Do you offer catering?',
      answer: 'Yes. Board offers charcuterie boards, cheese displays, wine pairings, and custom catering packages for gatherings of many sizes.',
      sortOrder: 2,
      active: 'yes',
    },
    {
      question: 'Can I host a private event at Board?',
      answer: 'Yes. Board can host private parties, corporate gatherings, showers, birthdays, and other special celebrations.',
      sortOrder: 3,
      active: 'yes',
    },
    {
      question: 'Do you have live music?',
      answer: 'Yes. Board regularly hosts live music, wine tastings, and community events. Check the Events section for upcoming dates.',
      sortOrder: 4,
      active: 'yes',
    },
    {
      question: 'Do you accommodate dietary restrictions?',
      answer: 'Board is happy to accommodate dietary restrictions whenever possible. Please include details when making an inquiry.',
      sortOrder: 5,
      active: 'yes',
    },
    {
      question: 'Do you sell gift cards?',
      answer: 'Yes. Digital gift cards are available online year-round.',
      sortOrder: 6,
      active: 'yes',
    },
  ];

  const faqItems = externalFaqItems.length ? externalFaqItems : fallbackFaqItems;

  const calendarEvents = useMemo(
    () => [
      ...musicEvents.map((event) => ({ ...event, type: 'Music' })),
      ...featuredEvents.map((event) => ({ ...event, type: 'Featured' })),
    ],
    [musicEvents, featuredEvents]
  );

  const calendarMonths = useMemo(
    () => buildCalendarMonths(calendarEvents, 3),
    [calendarEvents]
  );

  const homeRowsByCategory = useMemo(() => {
    const rows = {};

    externalHomeRows.forEach((row) => {
      const category = String(row.category || '').trim();
      if (category && !rows[category]) {
        rows[category] = row;
      }
    });

    return rows;
  }, [externalHomeRows]);

  const getHomeSection = (category, fallback) => {
    const row = homeRowsByCategory[category] || {};
    const images = [row.mediaURL, row.mediaURL2, row.mediaURL3]
      .map((url) => String(url || '').trim())
      .filter(Boolean);

    return {
      eyebrow: fallback.eyebrow,
      title: row.title || fallback.title,
      subtitle: row.subtitle || row.subTitle || fallback.subtitle,
      images: images.length ? images : fallback.images,
    };
  };

  const happyHourSection = getHomeSection('HappyHour', {
    eyebrow: 'Happy Hour',
    title: 'Wine flights, rotating pours, craft beers, and charcuterie boards.',
    subtitle: 'Join us weekdays for curated wine specials, a rotating selection of craft beers, featured charcuterie boards, and a relaxed social atmosphere designed around conversation and discovery.',
    images: [LOCAL_IMAGES.happyHourWine, LOCAL_IMAGES.happyHourBoard, LOCAL_IMAGES.happyHourBeer],
  });

  const privatePartiesSection = getHomeSection('PrivateParties', {
    eyebrow: 'Private Parties',
    title: 'We can host your private gatherings.',
    subtitle: 'Whether you are planning a birthday celebration, bridal shower, rehearsal dinner, corporate event, or intimate gathering, Board offers a warm and elevated setting with curated food and wine experiences.',
    images: [LOCAL_IMAGES.privateEvents],
  });

  const cateringSection = getHomeSection('Catering', {
    eyebrow: 'Catering',
    title: 'Charcuterie catering and wine experiences for gatherings of all sizes.',
    subtitle: 'From intimate celebrations to corporate events, Board offers curated catering packages featuring artisan cheeses, charcuterie, wine pairings, and elevated presentation.',
    images: [LOCAL_IMAGES.catering],
  });

  const renderHomeImageCarousel = (section, altText, heightClass = 'h-[500px]') => (
    <div className={`relative overflow-hidden rounded-3xl shadow-lg ${heightClass}`}>
      {section.images.map((src, index) => (
        <CloudImage
          key={src + index}
          src={src}
          alt={altText}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === happyHourImageIndex % section.images.length ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {section.images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {section.images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setHappyHourImageIndex(index)}
              aria-label={'Show image ' + (index + 1)}
              className={`h-2.5 rounded-full transition-all ${index === happyHourImageIndex % section.images.length ? 'bg-white w-6' : 'bg-white/50 w-2.5 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  const shopItems = [
    { category: 'wine', title: 'Wine by the Bottle', description: 'Take home a rotating selection of thoughtfully chosen bottles from the Board wine program.', image: LOCAL_IMAGES.wineBottle, action: 'Browse Bottles' },
    { category: 'cheese', title: 'Cheese & Pantry', description: 'Bring home featured cheeses, pairing essentials, and seasonal favorites for your own board.', image: LOCAL_IMAGES.cheeseDisplay, action: 'Shop Cheese' },
    { category: 'swag', title: 'Board Swag', description: 'Tote bags, t-shirts, hats, and other Board goods are coming soon.', image: LOCAL_IMAGES.swagDisplay, action: 'Browse Swag' },
  ];

  const fallbackWineItems = [
    { name: 'House Red Selection', price: '$24', photo: LOCAL_IMAGES.wineBottle },
    { name: 'Crisp White Selection', price: '$22', photo: LOCAL_IMAGES.happyHourWine },
    { name: 'Seasonal Sparkling Bottle', price: '$28', photo: LOCAL_IMAGES.wineBottle },
  ];

  const fallbackCheeseItems = [
    { name: 'Local Cheddar', price: '$12', photo: LOCAL_IMAGES.cheeseDisplay },
    { name: 'Triple Cream Brie', price: '$14', photo: LOCAL_IMAGES.cheeseDisplay },
    { name: 'Seasonal Goat Cheese', price: '$13', photo: LOCAL_IMAGES.cheeseDisplay },
  ];

  const fallbackSwagItems = [
    { name: 'Board Tote Bag', photo: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&auto=format&fit=crop', price: '$28' },
    { name: 'Board T-Shirt', photo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop', price: '$32' },
    { name: 'Board Hat', photo: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?q=80&w=800&auto=format&fit=crop', price: '$26' },
  ];

  const shopData = useMemo(() => ({
    wine: externalWineItems.length ? externalWineItems : fallbackWineItems,
    cheese: externalCheeseItems.length ? externalCheeseItems : fallbackCheeseItems,
    swag: externalSwagItems.length ? externalSwagItems : fallbackSwagItems,
  }), [externalWineItems, externalCheeseItems, externalSwagItems]);

  const activeShopTitle = activeShopCategory === 'wine' ? 'Wine by the Bottle' : activeShopCategory === 'cheese' ? 'Cheese & Pantry' : 'Board Swag';

  useEffect(() => {
    const interval = setInterval(() => {
      setHappyHourImageIndex((current) => current + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    let cancelled = false;

    const applyIfMounted = (setter, value) => {
      if (!cancelled) {
        setter(value);
      }
    };

    const tableMediaUrl = (row) => row.mediaURL || row.cloudinaryURL || row.image || row.photo || '';

    loadTable(TABLES.Hero)
      .then((rows) => applyIfMounted(setExternalHeroRows, visibleRows(rows)))
      .catch(() => applyIfMounted(setExternalHeroRows, []));

    loadTable(TABLES.Home)
      .then((rows) => {
        const homeRows = visibleRows(rows)
          .map((row) => ({
            category: row.category || '',
            title: row.title || '',
            subtitle: row.subtitle || row.subTitle || '',
            sortOrder: Number(row.sortOrder || 999),
            mediaURL: tableMediaUrl(row),
            mediaURL2: row.mediaURL2 || row.cloudinaryURL2 || row.image2 || row.photo2 || '',
            mediaURL3: row.mediaURL3 || row.cloudinaryURL3 || row.image3 || row.photo3 || '',
          }))
          .filter((row) => row.category)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        applyIfMounted(setExternalHomeRows, homeRows);
      })
      .catch(() => applyIfMounted(setExternalHomeRows, []));

    loadTable(TABLES.Venue)
      .then((rows) => {
        const slides = visibleRows(rows).map((row) => ({
          title: row.title || '',
          subtitle: row.subtitle || row.subTitle || '',
          image: tableMediaUrl(row),
        })).filter((slide) => slide.title && slide.image);

        if (slides.length) {
          applyIfMounted(setVenueSlides, slides);
        }
      })
      .catch(() => {});

    loadTable(TABLES.Menu)
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
      .catch(() => applyIfMounted(setExternalMenuItems, []));

    loadTable(TABLES.FullMenu)
      .then((rows) => {
        const fullMenuRows = visibleRows(rows).map((row) => ({
          title: row.title || '',
          mediaURL: row.mediaURL || row.cloudinaryURL || row.pdfURL || '',
        })).filter((row) => row.title || row.mediaURL);

        applyIfMounted(setExternalFullMenuRows, fullMenuRows);
      })
      .catch(() => applyIfMounted(setExternalFullMenuRows, []));

    loadTable(TABLES.LiveArtists)
      .then((rows) => {
        const artistRows = visibleRows(rows).map((row) => ({
          title: row.title || '',
          date: row.time ? `${row.date || ''} - ${row.time}` : row.date || '',
          url: row.artistURL || '#',
          image: tableMediaUrl(row) || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop',
        })).filter((event) => event.title && event.date);

        applyIfMounted(setExternalMusicEvents, artistRows);
      })
      .catch(() => applyIfMounted(setExternalMusicEvents, []));

    loadTable(TABLES.FeaturedEvents)
      .then((rows) => {
        const featuredRows = visibleRows(rows).map((row) => ({
          title: row.title || '',
          date: row.date || '',
          time: row.time || '',
          description: row.subtitle || row.subTitle || row.description || '',
        })).filter((event) => event.title && event.date);

        applyIfMounted(setExternalFeaturedEvents, featuredRows);
      })
      .catch(() => applyIfMounted(setExternalFeaturedEvents, []));

    loadTable(TABLES.Hours)
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
      .catch(() => {
        applyIfMounted(setExternalBusinessHours, []);
        applyIfMounted(setExternalHappyHourHours, []);
      });

    loadTable(TABLES.FAQs)
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
      .catch(() => applyIfMounted(setExternalFaqItems, []));

    loadTable(TABLES.Reviews)
      .then((rows) => {
        const reviewRows = visibleRows(rows).map((row) => ({
          quote: row.review || row.quote || '',
          author: row.reviewer || row.author || '',
          stars: Number(row.stars || 5),
        })).filter((review) => review.quote && review.author);

        applyIfMounted(setExternalReviews, reviewRows);
      })
      .catch(() => applyIfMounted(setExternalReviews, []));

    loadTable(TABLES.Shopping)
      .then((rows) => {
        const shoppingRows = visibleRows(rows).map((row) => ({
          category: row.category || '',
          name: row.item || row.name || '',
          price: row.price || '',
          photo: tableMediaUrl(row),
        })).filter((item) => item.category && item.name && item.price);

        const byCategory = (category) => shoppingRows.filter((item) => String(item.category).toLowerCase() === category);

        applyIfMounted(setExternalWineItems, byCategory('wine'));
        applyIfMounted(setExternalCheeseItems, byCategory('cheese'));
        applyIfMounted(setExternalSwagItems, byCategory('swag'));
      })
      .catch(() => {
        applyIfMounted(setExternalWineItems, []);
        applyIfMounted(setExternalCheeseItems, []);
        applyIfMounted(setExternalSwagItems, []);
      });

    setHeroVideoFailed(false);

    return () => {
      cancelled = true;
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
    const items = selectedShopItems.map((item) => ({ category: item.category, name: item.name, price: item.price }));
    return externalPurchaseBaseUrl + '?items=' + encodeURIComponent(JSON.stringify(items));
  };

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

      <main id="main-content">
      <section id="home" aria-labelledby="home-heading" className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <CloudImage
          src={heroPosterUrl}
          alt="Board Wine and Cheese wine bar atmosphere in Kittery Maine"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!heroVideoFailed && (
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
            {/* Replace HERO_VIDEO_URL and HERO_POSTER_URL near the top of this file with your own local assets. */}
            <source src={heroVideoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <h1 id="home-heading" className="text-5xl md:text-7xl font-serif mb-6 leading-tight">{heroTitle}</h1>
          <p className="text-lg md:text-xl text-stone-100 mb-8 leading-relaxed">{heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#menu" className="bg-white text-stone-900 px-8 py-3 rounded-full font-medium hover:bg-stone-200 transition-colors">View Menu</a>
            {/* Order Pickup hero CTA hidden for now. Uncomment if you decide you want it back.
            <a href={orderOnlineUrl} target="_blank" rel="noopener noreferrer" className="border border-white px-8 py-3 rounded-full hover:bg-white/10 transition-colors">Order Pickup</a>
            */}
            <a href="#events" className="border border-white px-8 py-3 rounded-full hover:bg-white/10 transition-colors">Upcoming Events</a>
          </div>
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
              const previewImage = categoryItems[0]?.image || LOCAL_IMAGES.happyHourBoard;

              return (
                <div key={category} className="group bg-stone-50 rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <CloudImage src={previewImage} alt={category} className="h-56 w-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
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
            <button
              type="button"
              onClick={() => setShowMenuPdfModal(true)}
              className="inline-flex items-center justify-center bg-stone-900 text-white px-10 py-4 rounded-full text-lg hover:bg-stone-700 transition-colors shadow-sm"
            >
              {fullMenuTitle}
            </button>
            
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
            <CloudImage
              src={activeMenuItem.image || LOCAL_IMAGES.happyHourBoard}
              alt={activeMenuItem.item}
              className="h-64 w-full object-cover"
            />

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

      {showMenuPdfModal && (
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
                <h3 className="text-2xl sm:text-3xl font-serif text-stone-900">{fullMenuTitle}</h3>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={fullMenuPdfUrl}
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

            <iframe
              src={fullMenuEmbedUrl}
              title="Current Board menu PDF"
              className="h-full w-full bg-white"
            />
          </div>
        </div>
      )}

      <section id="happy-hour" aria-labelledby="happy-hour-heading" className="bg-stone-100 py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">{happyHourSection.eyebrow}</p>
            <h2 id="happy-hour-heading" className="text-4xl font-serif mb-6 leading-tight">{happyHourSection.title}</h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8">{happyHourSection.subtitle}</p>
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm inline-block">
              <p className="text-sm uppercase tracking-[0.2em] text-stone-500 mb-2">Hours</p>
              {happyHourHours.map((row) => (
                <p key={row.days} className="text-2xl font-serif">{row.days} - {row.hours}</p>
              ))}
            </div>
          </div>
          {renderHomeImageCarousel(happyHourSection, 'Happy hour wine, beer, and charcuterie at Board Wine and Cheese', 'h-[500px]')}
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
                  <CloudImage src={event.image} alt={`${event.title} live music event at Board Wine and Cheese`} className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <p className="text-stone-400 text-xs uppercase tracking-wide mb-2">{event.date}</p>
                    <h3 className="text-lg font-serif leading-snug text-white">{event.title}</h3>
                    {event.url && event.url !== '#' && (
                      <a href={event.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm text-stone-300 underline underline-offset-4 hover:text-white">Website</a>
                    )}
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
              {featuredEvents.map((event) => (
                <article key={event.title} className="bg-stone-800 border border-stone-700 rounded-2xl p-6">
                  <h3 className="text-xl font-serif text-white mb-2">{event.title}</h3>
                  <p className="text-stone-400 text-sm mb-3">
                    {event.date}{event.time ? ' • ' + event.time : ''}
                  </p>
                  {event.description && (
                    <p className="text-stone-300 leading-relaxed text-sm">
                      {event.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="bg-stone-800 border border-stone-700 rounded-3xl p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="uppercase tracking-[0.3em] text-sm text-stone-400 mb-4">{privatePartiesSection.eyebrow}</p>
              <h4 className="text-4xl font-serif mb-6 leading-tight">{privatePartiesSection.title}</h4>
              <p className="text-stone-300 text-lg leading-relaxed mb-8">{privatePartiesSection.subtitle}</p>
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
            {renderHomeImageCarousel(privatePartiesSection, 'Private wine and charcuterie event at Board Wine and Cheese', 'h-[400px]')}
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
                                  key={event.title + event.date}
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
          {renderHomeImageCarousel(cateringSection, 'Charcuterie catering boards with artisan cheese and wine pairings', 'h-[500px]')}
          <div>
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">{cateringSection.eyebrow}</p>
            <h2 id="catering-heading" className="text-4xl font-serif mb-6 leading-tight">{cateringSection.title}</h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-8">{cateringSection.subtitle}</p>
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

      <section id="shop" aria-labelledby="shop-heading" className="bg-white py-24 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="uppercase tracking-[0.3em] text-sm text-stone-500 mb-4">Shop</p>
            <h2 id="shop-heading" className="text-4xl md:text-5xl font-serif mb-6 leading-tight">Take a piece of Board home.</h2>
            <p className="text-lg text-stone-600 leading-relaxed max-w-3xl mx-auto">In addition to dining in, Board offers select wines by the bottle, cheese to take home, and eventually a small collection of branded goods and gifts.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {shopItems.map((item) => (
              <div key={item.title} className="bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
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
                <div key={item.name} className={`flex items-center justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors ${activeShopCategory === 'swag' ? 'cursor-pointer hover:border-stone-400' : ''}`}>
                  <div className="flex items-center gap-4">
                    {activeShopCategory === 'swag' && (
                      <input type="checkbox" checked={isShopItemSelected(item)} onChange={() => toggleShopItem(item)} className="h-5 w-5 rounded border-stone-300" />
                    )}
                    {item.photo && <CloudImage src={item.photo} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />}
                    <div>
                      <h4 className="text-xl font-serif">{item.name}</h4>
                      <p className="text-sm text-stone-500">{activeShopCategory === 'wine' ? 'Available in store only' : activeShopCategory === 'cheese' ? 'Available in store only' : 'Board merchandise'}</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium whitespace-nowrap">{item.price}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end border-t border-stone-200 pt-6">
              <button type="button" onClick={() => setActiveShopCategory(null)} className="border border-stone-300 px-8 py-4 rounded-full hover:bg-white transition-colors">Close</button>
              {activeShopCategory === 'swag' && (
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
          <h2 id="wine-club-heading" className="text-4xl md:text-5xl font-serif mb-8 leading-tight">Wine Club & Gift Cards.</h2>
          <p className="text-lg text-stone-600 leading-relaxed mb-10 max-w-3xl mx-auto">Receive updates on curated tastings, featured pours, seasonal pairings, member-only events, and special releases—or give someone the Board experience with a gift card.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={wineClubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-stone-900 text-white px-8 py-4 rounded-full hover:bg-stone-700 transition-colors">Join Wine Club</a>
            <a href={giftCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center border border-stone-400 px-8 py-4 rounded-full hover:bg-stone-100 transition-colors">Buy Gift Cards</a>
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

          <details className="group bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
              <span className="text-xl font-serif text-stone-900">
                View FAQs
              </span>
              <span className="text-stone-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                ⌄
              </span>
            </summary>

            <div className="mt-6 space-y-4">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group/item border border-stone-200 rounded-2xl bg-stone-50 p-5"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                    <h3 className="text-lg font-serif text-stone-900">
                      {item.question}
                    </h3>
                    <span className="text-stone-500 group-open/item:rotate-180 transition-transform" aria-hidden="true">
                      ⌄
                    </span>
                  </summary>

                  <p className="mt-4 text-stone-600 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </details>
        </div>
      </section>


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
                <a href="tel:16035551212" className="hover:text-white transition-colors">
                  (207) 436-0300
                </a>
              </li>
              <li className="flex items-center gap-3 pt-4 hover:text-white transition-colors cursor-pointer">
                <InstagramIcon size={18} />
                <span>Instagram</span>
              </li>
              <li className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer">
                <FacebookIcon size={18} />
                <span>Facebook</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-12 pt-8 text-center text-sm text-stone-500">2026 Board Wine & Cheese - Curated hospitality experience.</div>
      </footer>
    </div>
  );
}
