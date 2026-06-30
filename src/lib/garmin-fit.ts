// Garmin FIT Workout binary file generator.
// Spec: Flexible and Interoperable Data Transfer (FIT) Protocol.
// Implements only what's needed for workout files — no external dependencies.

// CRC-16 table from Garmin FIT SDK
const CRC_TABLE: readonly number[] = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

function fitCrc(bytes: number[], from = 0, to = bytes.length): number {
  let crc = 0;
  for (let i = from; i < to; i++) {
    const b = bytes[i] & 0xff;
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ CRC_TABLE[b & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ CRC_TABLE[(b >> 4) & 0xf];
  }
  return crc;
}

// FIT epoch: Dec 31, 1989 00:00:00 UTC (= Unix timestamp 631065600 s)
const FIT_EPOCH_MS = 631065600000;

// FIT base type codes
const T_ENUM   = 0x00;
const T_UINT16 = 0x84;
const T_UINT32 = 0x86;
const T_STRING = 0x07;

// ── Public duration type constants ────────────────────────────────────────────
export const DUR_TIME     = 0; // duration_value in milliseconds
export const DUR_DISTANCE = 1; // duration_value in centimeters (meters × 100)
export const DUR_OPEN     = 5; // open-ended step
export const DUR_REPEAT   = 6; // repeat: duration_value = step_idx to return to, target_value = reps

// ── Public target type constants ──────────────────────────────────────────────
export const TGT_OPEN = 2; // no specific target

// ── Public intensity constants ────────────────────────────────────────────────
export const INT_ACTIVE   = 0;
export const INT_REST     = 1;
export const INT_WARMUP   = 2;
export const INT_COOLDOWN = 3;

// ── Public types ──────────────────────────────────────────────────────────────

export type FitWorkoutStep = {
  /** Step name, max 15 visible chars (stored in 16-byte null-terminated field). */
  name: string;
  durationType: number;
  durationValue: number;
  targetType: number;
  /** For open target: 0. For repeat steps: number of repetitions. */
  targetValue: number;
  intensity: number;
};

export type FitWorkout = {
  /** Workout name, max 15 visible chars. */
  name: string;
  steps: FitWorkoutStep[];
};

// ── Binary generator ──────────────────────────────────────────────────────────

export function generateFitWorkout(wkt: FitWorkout): Uint8Array {
  const b: number[] = [];

  const b1 = (v: number) => b.push(v & 0xff);
  const b2 = (v: number) => { b1(v); b1(v >> 8); };
  const b4 = (v: number) => { b1(v); b1(v >> 8); b1(v >> 16); b1(v >> 24); };
  const bStr = (s: string, len: number) => {
    const enc = new TextEncoder().encode(s.slice(0, len - 1));
    for (let i = 0; i < len; i++) b1(i < enc.length ? enc[i] : 0);
  };

  // Local message type IDs (0–15 allowed; we use 0, 1, 2)
  const LM_FILE_ID  = 0;
  const LM_WORKOUT  = 1;
  const LM_WKT_STEP = 2;

  // ── Definition message: file_id (global mesg 0) ───────────────────────────
  b1(0x40 | LM_FILE_ID); b1(0); b1(0); b2(0); b1(4);
  b1(0); b1(1); b1(T_ENUM);   // type (field 0)
  b1(1); b1(2); b1(T_UINT16); // manufacturer (field 1)
  b1(2); b1(2); b1(T_UINT16); // product (field 2)
  b1(4); b1(4); b1(T_UINT32); // time_created (field 4)

  // ── Data message: file_id ─────────────────────────────────────────────────
  b1(LM_FILE_ID);
  b1(6);                  // type = 6 (workout)
  b2(255);                // manufacturer = 255 (development/unknown)
  b2(0);                  // product = 0
  b4(Math.floor((Date.now() - FIT_EPOCH_MS) / 1000)); // time_created

  // ── Definition message: workout (global mesg 26) ──────────────────────────
  b1(0x40 | LM_WORKOUT); b1(0); b1(0); b2(26); b1(3);
  b1(0); b1(1);  b1(T_ENUM);   // sport (field 0)
  b1(2); b1(2);  b1(T_UINT16); // num_valid_steps (field 2)
  b1(3); b1(16); b1(T_STRING); // wkt_name (field 3)

  // ── Data message: workout ─────────────────────────────────────────────────
  b1(LM_WORKOUT);
  b1(1);                  // sport = 1 (running)
  b2(wkt.steps.length);   // num_valid_steps
  bStr(wkt.name, 16);     // wkt_name

  // ── Definition message: workout_step (global mesg 27) ────────────────────
  b1(0x40 | LM_WKT_STEP); b1(0); b1(0); b2(27); b1(7);
  b1(254); b1(2);  b1(T_UINT16); // message_index (field 254)
  b1(0);   b1(16); b1(T_STRING); // wkt_step_name (field 0)
  b1(2);   b1(1);  b1(T_ENUM);   // duration_type (field 2)
  b1(3);   b1(4);  b1(T_UINT32); // duration_value (field 3)
  b1(4);   b1(1);  b1(T_ENUM);   // target_type (field 4)
  b1(5);   b1(4);  b1(T_UINT32); // target_value (field 5)
  b1(8);   b1(1);  b1(T_ENUM);   // intensity (field 8)

  // ── Data messages: workout_step (one per step) ────────────────────────────
  for (let i = 0; i < wkt.steps.length; i++) {
    const s = wkt.steps[i];
    b1(LM_WKT_STEP);
    b2(i);               // message_index
    bStr(s.name, 16);    // wkt_step_name
    b1(s.durationType);  // duration_type
    b4(s.durationValue); // duration_value
    b1(s.targetType);    // target_type
    b4(s.targetValue);   // target_value
    b1(s.intensity);     // intensity
  }

  // ── Assemble file: header + data records + CRC ────────────────────────────
  const dataSize = b.length;
  const dataCrc  = fitCrc(b);

  // 14-byte FIT header
  const hdr: number[] = [
    14,                                                   // header_size
    0x20,                                                 // protocol_version 2.0
    0x54, 0x08,                                           // profile_version 2132 (LE)
    dataSize & 0xff, (dataSize >> 8) & 0xff,
    (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff,    // data_size (LE)
    0x2e, 0x46, 0x49, 0x54,                              // ".FIT"
    0x00, 0x00,                                           // header CRC placeholder
  ];
  const hdrCrc = fitCrc(hdr, 0, 12);
  hdr[12] = hdrCrc & 0xff;
  hdr[13] = (hdrCrc >> 8) & 0xff;

  return new Uint8Array([
    ...hdr,
    ...b,
    dataCrc & 0xff,
    (dataCrc >> 8) & 0xff,
  ]);
}
