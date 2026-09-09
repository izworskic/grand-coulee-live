export type DataKind = 'measured' | 'reported' | 'calculated' | 'estimated';
export type Freshness = 'current' | 'delayed' | 'stale' | 'unavailable';
export type Confidence = 'high' | 'medium' | 'low';

export interface SourceProvenance {
  id: string;
  label: string;
  url: string;
  kind: DataKind;
  observedAt?: string | null;
  retrievedAt: string;
  freshness: Freshness;
  note?: string;
}

export interface HourlyObservation {
  observedAt: string;
  hour: number;
  totalOutflowKcfs: number | null;
  generationFlowKcfs: number | null;
  spillKcfs: number | null;
  forebayFt: number | null;
  tailwaterFt: number | null;
  headFt: number | null;
}

export interface DailyObservation {
  date: string;
  generationMWh: number | null;
  averageGenerationMW: number | null;
  stationUseMWh: number | null;
  inflowKcfs: number | null;
  totalOutflowKcfs: number | null;
  generationFlowKcfs: number | null;
  spillKcfs: number | null;
  reservoirElevationFt: number | null;
  forebayFt: number | null;
  tailwaterFt: number | null;
  headFt: number | null;
  banksLakePumpKcfs: number | null;
  banksLakePumpMWh: number | null;
  banksLakeElevationFt: number | null;
}

export interface VisitorStatus {
  scheduleYearVerified: boolean;
  visitorCenterStatus: 'open' | 'closed' | 'unknown';
  visitorCenterDetail: string;
  toursToday: string[];
  nextTour: string | null;
  nextTourDetail: string;
  laserStatus: 'tonight' | 'completed' | 'off-season' | 'unknown';
  laserTime: string | null;
  laserDetail: string;
  sourcesHealthy: boolean;
}

export interface WeatherStatus {
  temperatureF: number | null;
  shortForecast: string;
  precipitationProbability: number | null;
  windSpeed: string;
  windDirection: string;
  forecastAt: string | null;
  eveningSummary: string | null;
}

export interface AstronomyStatus {
  sunrise: string;
  sunset: string;
  civilDusk: string;
}

export interface GrandCouleeStatus {
  observedAt: string | null;
  retrievedAt: string;
  freshness: Freshness;
  reservoir: {
    forebayFt: number | null;
    fullPoolFt: number;
    change1hFt: number | null;
    change6hFt: number | null;
    change24hFt: number | null;
    belowFullPoolFt: number | null;
  };
  flow: {
    totalOutflowKcfs: number | null;
    generationFlowKcfs: number | null;
    spillKcfs: number | null;
  };
  hydraulic: {
    tailwaterFt: number | null;
    headFt: number | null;
  };
  generation: {
    currentEstimatedMW: number | null;
    estimateConfidence: Confidence | null;
    calibrationEfficiency: number | null;
    calibrationDays: number;
    latestReportedAverageMW: number | null;
    latestReportedDate: string | null;
    installedCapacityMW: number;
  };
  pumping: {
    banksLakePumpKcfs: number | null;
    pumpMWh: number | null;
    banksLakeElevationFt: number | null;
  };
  visitor: VisitorStatus;
  weather: WeatherStatus | null;
  astronomy: AstronomyStatus;
  decision: {
    headline: string;
    detail: string;
  };
  sources: SourceProvenance[];
}
