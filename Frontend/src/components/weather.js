// src/lib/weatherbitClient.js
// Frontend-only Weatherbit history client + feature builder.
// NOTE: API key is hardcoded here intentionally (no env). Replace API_KEY below.

const WEATHERBIT_API_URL = "https://api.weatherbit.io/v2.0/history/hourly";
const API_KEY = "777628119ce049d484833355dbeca175"; // <-- replace if needed
const TIMEZONE = "Asia/Kolkata";

function pad(n) { return String(n).padStart(2, "0"); }
function formatWBDateUTC(dt) {
  // Weatherbit expects "YYYY-MM-DD:HH" in UTC
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}:${pad(dt.getUTCHours())}`;
}
function toISTDate(utcDate) {
  // convert a UTC Date to an IST Date object by formatting and re-parsing in local
  const s = utcDate.toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace(" ", "T");
  return new Date(s);
}
function toISTString(utcDate) {
  return toISTDate(utcDate).toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace("T", " ");
}

function computeTOA_forDates(datesIST, lat) {
  const solar_constant = 1367.0;
  const latRad = (lat * Math.PI) / 180;
  return datesIST.map((dt) => {
    // day of year
    const start = new Date(dt.getFullYear(), 0, 0);
    const diff = dt - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const decl = 23.45 * Math.sin(((360 * (284 + dayOfYear)) / 365) * Math.PI / 180);
    const declRad = (decl * Math.PI) / 180;
    const hour = dt.getHours();
    const hourAngle = ((hour - 12) * 15) * Math.PI / 180;
    let cosZ = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
    if (cosZ < 0) cosZ = 0;
    return solar_constant * cosZ;
  });
}

function computeQV2M(Tarr, RHarr, Parr) {
  return Tarr.map((T, i) => {
    const RH = Math.max(0, Math.min(100, RHarr[i] ?? 50)) / 100.0;
    const P = Parr[i] ?? 1013.25; // hPa fallback
    const es = 6.112 * Math.exp((17.67 * T) / (T + 243.5)); // hPa
    const e = RH * es;
    const qv = (0.622 * e) / (P - (1 - 0.622) * e);
    return qv * 1000.0; // g/kg
  });
}

function computeLWdown(Tarr, RHarr) {
  const sigma = 5.67e-8;
  return Tarr.map((T, i) => {
    const RH = Math.max(0, Math.min(1, (RHarr[i] ?? 50) / 100));
    const emissivity = 0.7 + 0.2 * Math.pow(RH, 1/7);
    const Tk = (T ?? 0) + 273.15;
    return emissivity * sigma * Math.pow(Tk, 4);
  });
}

async function fetchWeatherbitHistory(lat, lon, startUTC, endUTC) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    key: API_KEY,
    start_date: formatWBDateUTC(startUTC),
    end_date: formatWBDateUTC(endUTC)
  });
  const url = `${WEATHERBIT_API_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Weatherbit error ${res.status}: ${txt}`);
  }
  const payload = await res.json();
  return payload.data || [];
}

/**
 * Build weather state for frontend usage (current_weather, hourly, daily)
 * hours: how many hours to fetch back (default 168 = 7 days)
 */
export async function buildWeatherStateClient(lat, lon, hours = 168) {
  const endUtc = new Date();
  const startUtc = new Date(endUtc.getTime() - hours * 3600 * 1000);

  const raw = await fetchWeatherbitHistory(lat, lon, startUtc, endUtc);
  if (!raw || raw.length === 0) throw new Error("No data returned from Weatherbit");

  const timesUTC = raw.map(r => new Date(r.timestamp_utc));
  const timesIST = timesUTC.map(d => toISTDate(d));

  // core arrays
  const temp = raw.map(r => Number(r.temp ?? NaN));
  const rh = raw.map(r => Number(r.rh ?? NaN));
  const pres = raw.map(r => Number(r.pres ?? NaN));
  const wind_spd = raw.map(r => Number(r.wind_spd ?? NaN));
  const clouds = raw.map(r => Number(r.clouds ?? NaN));
  const ghi = raw.map(r => Number(r.ghi ?? NaN));
  const dni = raw.map(r => Number(r.dni ?? NaN));
  const dhi = raw.map(r => Number(r.dhi ?? NaN));
  const shortwave = ghi.map(v => v); // fallback

  // cyclic features
  const hoursArr = timesIST.map(d => d.getHours());
  const monthsArr = timesIST.map(d => d.getMonth() + 1);
  const hour_sin = hoursArr.map(h => Math.sin(2 * Math.PI * h / 24));
  const hour_cos = hoursArr.map(h => Math.cos(2 * Math.PI * h / 24));
  const month_sin = monthsArr.map(m => Math.sin(2 * Math.PI * m / 12));
  const month_cos = monthsArr.map(m => Math.cos(2 * Math.PI * m / 12));

  const TOA = computeTOA_forDates(timesIST, lat);
  const QV2M = computeQV2M(temp, rh, pres);
  const LW = computeLWdown(temp, rh);

  // compose hourly object (parallel arrays)
  const hourly = {
    time: timesIST.map(d => d.toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace("T"," ")),
    temperature_2m: temp,
    direct_radiation: dni,
    diffuse_radiation: dhi,
    shortwave_radiation_instant: shortwave,
    direct_normal_irradiance: dni,
    ghi: ghi,
    clouds: clouds,
    wind_spd: wind_spd,
    // model feature names (matching dataset)
    ALLSKY_SFC_SW_DIFF: dhi,
    ALLSKY_SFC_SW_DNI: dni,
    ALLSKY_SFC_SW_DWN: ghi,
    RH2M: rh,
    PS: pres,
    T2M: temp,
    WS2M: wind_spd,
    CLOUD_AMT: clouds,
    TOA_SW_DWN: TOA,
    QV2M: QV2M,
    ALLSKY_SFC_LW_DWN: LW,
    hour_sin, hour_cos, month_sin, month_cos
  };

  // current: last row
  const last = hourly.time.length - 1;
  const current_weather = {
    time: hourly.time[last],
    temperature: hourly.temperature_2m[last],
    windspeed: hourly.wind_spd[last],
    cloudcover: hourly.clouds[last],
    ghi: hourly.ghi[last]
  };

  // daily aggregate (IST day)
  const dailyMap = {};
  for (let i = 0; i < hourly.time.length; i++) {
    const dateKey = hourly.time[i].slice(0,10);
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { tempMax: -Infinity, swSum: 0, ghiSum:0, cloudsSum:0, cnt:0 };
    const vtemp = hourly.temperature_2m[i] ?? -Infinity;
    dailyMap[dateKey].tempMax = Math.max(dailyMap[dateKey].tempMax, vtemp);
    dailyMap[dateKey].swSum += hourly.shortwave_radiation_instant[i] ?? 0;
    dailyMap[dateKey].ghiSum += hourly.ghi[i] ?? 0;
    dailyMap[dateKey].cloudsSum += hourly.clouds[i] ?? 0;
    dailyMap[dateKey].cnt += 1;
  }
  const dailyDates = Object.keys(dailyMap).sort();
  const daily = {
    time: dailyDates,
    temperature_2m_max: dailyDates.map(d => (dailyMap[d].tempMax === -Infinity ? 0 : dailyMap[d].tempMax)),
    shortwave_radiation_sum: dailyDates.map(d => dailyMap[d].swSum),
    ghi_sum: dailyDates.map(d => dailyMap[d].ghiSum),
    cloudcover: dailyDates.map(d => Math.round(dailyMap[d].cloudsSum / Math.max(1,dailyMap[d].cnt)))
  };

  return { current_weather, hourly, daily };
}
