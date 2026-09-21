/**
 * CSP / HSTS header builders for next.config.ts.
 * Keep free of Prisma / app runtime imports.
 */

export type HeaderEnv = {
  NODE_ENV?: string;
  SITE_URL?: string;
  NEXT_PUBLIC_GA_ID?: string;
  NEXT_PUBLIC_GTM_ID?: string;
};

export function isProductionEnv(env: HeaderEnv = process.env) {
  return env.NODE_ENV === "production";
}

export function siteUrlIsHttps(env: HeaderEnv = process.env) {
  const site = (env.SITE_URL || "").trim().toLowerCase();
  return site.startsWith("https://");
}

function siteHostIsLocalhost(env: HeaderEnv = process.env) {
  try {
    const site = (env.SITE_URL || "").trim();
    if (!site) return true;
    const host = new URL(site).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return true;
  }
}

/** HSTS only for production HTTPS — never localhost / non-HTTPS. */
export function shouldSendHsts(env: HeaderEnv = process.env) {
  return isProductionEnv(env) && siteUrlIsHttps(env) && !siteHostIsLocalhost(env);
}

export function hstsHeaderValue() {
  return "max-age=31536000; includeSubDomains";
}

function googleMeasurementConfigured(env: HeaderEnv) {
  const ga = (env.NEXT_PUBLIC_GA_ID || "").trim();
  const gtm = (env.NEXT_PUBLIC_GTM_ID || "").trim();
  return Boolean(ga || gtm);
}

/** Hosts required when GTM and/or GA4 measurement is enabled via env. */
function optionalAnalyticsHosts(env: HeaderEnv) {
  if (!googleMeasurementConfigured(env)) {
    return {
      script: [] as string[],
      connect: [] as string[],
      img: [] as string[],
      frame: [] as string[],
    };
  }
  return {
    script: [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.googleadservices.com",
      "https://www.google.com",
    ],
    connect: [
      "https://www.google-analytics.com",
      "https://analytics.google.com",
      "https://www.googletagmanager.com",
      "https://www.google.com",
      "https://www.googleadservices.com",
      "https://stats.g.doubleclick.net",
    ],
    img: [
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://www.google.com",
      "https://www.googleadservices.com",
      "https://googleads.g.doubleclick.net",
    ],
    frame: ["https://www.googletagmanager.com"],
  };
}

/** Pragmatic CSP — no * wildcards; fonts self-hosted via next/font. */
export function buildContentSecurityPolicy(env: HeaderEnv = process.env) {
  const analytics = optionalAnalyticsHosts(env);
  const scriptSrc = ["'self'", "'unsafe-inline'", ...analytics.script];
  const styleSrc = ["'self'", "'unsafe-inline'"];
  const imgSrc = ["'self'", "data:", "blob:", ...analytics.img];
  const connectSrc = ["'self'", ...analytics.connect];
  const fontSrc = ["'self'"];
  const frameSrc = ["'self'", ...analytics.frame];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
  ].join("; ");
}

/** Enforce in production; Report-Only in development. */
export function cspHeaderName(env: HeaderEnv = process.env) {
  return isProductionEnv(env) ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}

export function securityHeadersList(env: HeaderEnv = process.env) {
  const headers: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: cspHeaderName(env), value: buildContentSecurityPolicy(env) },
  ];
  if (shouldSendHsts(env)) {
    headers.push({ key: "Strict-Transport-Security", value: hstsHeaderValue() });
  }
  return headers;
}
