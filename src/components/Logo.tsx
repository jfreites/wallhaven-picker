import { useId } from "react";

// Isotipo de Wallflow: dos arcos neutros y las dos líneas que forman la W en el color de acento.
const ARCS =
  "M20 0C9.50659 0 1 8.50659 1 19V20.1719L4 23.1719V19C4 10.1634 11.1634 3 20 3C28.8366 3 36 10.1634 36 19V23.1719L39 20.1719V19C39 8.50659 30.4934 0 20 0Z" +
  "M20 5C12.268 5 6 11.268 6 19V25.1719L9 28.1719V19C9 12.9249 13.9249 8 20 8C26.0751 8 31 12.9249 31 19V28.1719L34 25.1719V19C34 11.268 27.732 5 20 5Z";

const W_LINES =
  "M20 10C15.0294 10 11 14.0294 11 19V31.0498C11 31.5743 10.5743 32 10.0498 32C9.7981 31.9999 9.55691 31.8997 9.37891 31.7217L0 22.3428V26.585L7.25781 33.8428C7.99842 34.5834 9.00245 34.9999 10.0498 35C12.2312 35 14 33.2312 14 31.0498V19C14 15.6863 16.6863 13 20 13C23.3137 13 26 15.6863 26 19V31.0498C26 33.2312 27.7688 35 29.9502 35C30.9976 34.9999 32.0016 34.5834 32.7422 33.8428L40 26.585V22.3428L30.6211 31.7217C30.4431 31.8997 30.2019 31.9999 29.9502 32C29.4257 32 29 31.5743 29 31.0498V19C29 14.0294 24.9706 10 20 10Z" +
  "M20 15C17.7909 15 16 16.7909 16 19V31.0498C16 34.3358 13.3358 37 10.0498 37C8.47201 36.9999 6.95846 36.3735 5.84277 35.2578L0 29.4141V33.6562L3.72168 37.3789C5.39997 39.0572 7.67636 39.9999 10.0498 40C14.9926 40 19 35.9926 19 31.0498V19C19 18.4477 19.4477 18 20 18C20.5523 18 21 18.4477 21 19V31.0498C21 35.9926 25.0074 40 29.9502 40C32.3236 39.9999 34.6 39.0572 36.2783 37.3789L40 33.6562V29.4141L34.1572 35.2578C33.0415 36.3735 31.528 36.9999 29.9502 37C26.6642 37 24 34.3358 24 31.0498V19C24 16.7909 22.2091 15 20 15Z";

export function LogoMark({ size = 22 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo__mark">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="10" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-w-start)" />
          <stop offset="1" stopColor="var(--logo-w-end)" />
        </linearGradient>
      </defs>
      <path d={ARCS} fill="var(--logo-arcs)" />
      <path d={W_LINES} fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <LogoMark />
      <span className="logo__name">Wallflow</span>
    </div>
  );
}
