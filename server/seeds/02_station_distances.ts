import type { Knex } from 'knex';

const distanceData: { from: string; to: string; distance_km: number }[] = [
  // 淡水信義線
  { from: 'R28', to: 'R27', distance_km: 2.09 },
  { from: 'R27', to: 'R26', distance_km: 1.91 },
  { from: 'R26', to: 'R25', distance_km: 2.14 },
  { from: 'R25', to: 'R24', distance_km: 0.87 },
  { from: 'R24', to: 'R23', distance_km: 1.45 },
  { from: 'R23', to: 'R22', distance_km: 1.61 },
  { from: 'R22', to: 'R21', distance_km: 0.76 },
  { from: 'R21', to: 'R20', distance_km: 0.83 },
  { from: 'R20', to: 'R19', distance_km: 1.26 },
  { from: 'R19', to: 'R18', distance_km: 0.60 },
  { from: 'R18', to: 'R17', distance_km: 0.88 },
  { from: 'R17', to: 'R16', distance_km: 1.10 },
  { from: 'R16', to: 'R15', distance_km: 1.09 },
  { from: 'R15', to: 'R14', distance_km: 1.52 },
  { from: 'R14', to: 'R13', distance_km: 1.03 },
  { from: 'R13', to: 'R12', distance_km: 0.53 },
  { from: 'R12', to: 'R11', distance_km: 0.55 },
  { from: 'R11', to: 'R10', distance_km: 0.66 },
  { from: 'R10', to: 'R09', distance_km: 0.63 },
  { from: 'R09', to: 'R08', distance_km: 0.99 },
  { from: 'R08', to: 'R07', distance_km: 1.56 },
  { from: 'R07', to: 'R06', distance_km: 0.67 },
  { from: 'R06', to: 'R05', distance_km: 0.79 },
  { from: 'R05', to: 'R04', distance_km: 0.99 },
  { from: 'R04', to: 'R03', distance_km: 0.99 },
  { from: 'R03', to: 'R02', distance_km: 0.74 },
  // 新北投支線
  { from: 'R22', to: 'R22A', distance_km: 1.03 },

  // 板南線
  { from: 'BL01', to: 'BL02', distance_km: 1.95 },
  { from: 'BL02', to: 'BL03', distance_km: 1.11 },
  { from: 'BL03', to: 'BL04', distance_km: 1.47 },
  { from: 'BL04', to: 'BL05', distance_km: 1.64 },
  { from: 'BL05', to: 'BL06', distance_km: 1.45 },
  { from: 'BL06', to: 'BL07', distance_km: 0.65 },
  { from: 'BL07', to: 'BL08', distance_km: 1.28 },
  { from: 'BL08', to: 'BL09', distance_km: 0.87 },
  { from: 'BL09', to: 'BL10', distance_km: 3.08 },
  { from: 'BL10', to: 'BL11', distance_km: 1.31 },
  { from: 'BL11', to: 'BL12', distance_km: 1.35 },
  { from: 'BL12', to: 'BL13', distance_km: 0.68 },
  { from: 'BL13', to: 'BL14', distance_km: 0.94 },
  { from: 'BL14', to: 'BL15', distance_km: 1.12 },
  { from: 'BL15', to: 'BL16', distance_km: 0.67 },
  { from: 'BL16', to: 'BL17', distance_km: 0.73 },
  { from: 'BL17', to: 'BL18', distance_km: 0.84 },
  { from: 'BL18', to: 'BL19', distance_km: 0.99 },
  { from: 'BL19', to: 'BL20', distance_km: 0.82 },
  { from: 'BL20', to: 'BL21', distance_km: 1.36 },
  { from: 'BL21', to: 'BL22', distance_km: 1.42 },
  { from: 'BL22', to: 'BL23', distance_km: 1.09 },

  // 松山新店線
  { from: 'G19', to: 'G18', distance_km: 1.35 },
  { from: 'G18', to: 'G17', distance_km: 1.20 },
  { from: 'G17', to: 'G16', distance_km: 0.94 },
  { from: 'G16', to: 'G15', distance_km: 0.99 },
  { from: 'G15', to: 'G14', distance_km: 1.30 },
  { from: 'G14', to: 'G13', distance_km: 1.26 },
  { from: 'G13', to: 'G12', distance_km: 0.81 },
  { from: 'G12', to: 'G11', distance_km: 0.82 },
  { from: 'G11', to: 'G10', distance_km: 0.76 },
  { from: 'G10', to: 'G09', distance_km: 0.93 },
  { from: 'G09', to: 'G08', distance_km: 0.88 },
  { from: 'G08', to: 'G07', distance_km: 0.90 },
  { from: 'G07', to: 'G06', distance_km: 1.56 },
  { from: 'G06', to: 'G05', distance_km: 1.06 },
  { from: 'G05', to: 'G04', distance_km: 1.15 },
  { from: 'G04', to: 'G03', distance_km: 0.85 },
  { from: 'G03', to: 'G02', distance_km: 0.90 },
  { from: 'G02', to: 'G01', distance_km: 1.11 },
  // 小碧潭支線
  { from: 'G03', to: 'G03A', distance_km: 1.94 },

  // 中和新蘆線
  { from: 'O01', to: 'O02', distance_km: 0.81 },
  { from: 'O02', to: 'O03', distance_km: 1.08 },
  { from: 'O03', to: 'O04', distance_km: 1.33 },
  { from: 'O04', to: 'O05', distance_km: 2.14 },
  { from: 'O05', to: 'O06', distance_km: 1.58 },
  { from: 'O06', to: 'O07', distance_km: 1.20 },
  { from: 'O07', to: 'O08', distance_km: 1.14 },
  { from: 'O08', to: 'O09', distance_km: 0.80 },
  { from: 'O09', to: 'O10', distance_km: 0.95 },
  { from: 'O10', to: 'O11', distance_km: 0.71 },
  { from: 'O11', to: 'O12', distance_km: 0.66 },
  { from: 'O12', to: 'O13', distance_km: 1.33 },
  { from: 'O13', to: 'O14', distance_km: 0.99 },
  { from: 'O14', to: 'O15', distance_km: 0.87 },
  { from: 'O15', to: 'O16', distance_km: 1.72 },
  { from: 'O16', to: 'O17', distance_km: 1.27 },
  { from: 'O17', to: 'O18', distance_km: 1.02 },
  { from: 'O18', to: 'O19', distance_km: 1.74 },
  { from: 'O19', to: 'O20', distance_km: 1.37 },
  { from: 'O20', to: 'O21', distance_km: 1.40 },
  // 蘆洲支線
  { from: 'O12', to: 'O50', distance_km: 1.88 },
  { from: 'O50', to: 'O51', distance_km: 1.23 },
  { from: 'O51', to: 'O52', distance_km: 0.83 },
  { from: 'O52', to: 'O53', distance_km: 0.90 },
  { from: 'O53', to: 'O54', distance_km: 1.17 },

  // 文湖線
  { from: 'BR01', to: 'BR02', distance_km: 0.68 },
  { from: 'BR02', to: 'BR03', distance_km: 0.51 },
  { from: 'BR03', to: 'BR04', distance_km: 1.14 },
  { from: 'BR04', to: 'BR05', distance_km: 0.76 },
  { from: 'BR05', to: 'BR06', distance_km: 1.60 },
  { from: 'BR06', to: 'BR07', distance_km: 0.82 },
  { from: 'BR07', to: 'BR08', distance_km: 1.14 },
  { from: 'BR08', to: 'BR09', distance_km: 0.75 },
  { from: 'BR09', to: 'BR10', distance_km: 0.89 },
  { from: 'BR10', to: 'BR11', distance_km: 1.27 },
  { from: 'BR11', to: 'BR12', distance_km: 0.93 },
  { from: 'BR12', to: 'BR13', distance_km: 1.48 },
  { from: 'BR13', to: 'BR14', distance_km: 2.59 },
  { from: 'BR14', to: 'BR15', distance_km: 1.33 },
  { from: 'BR15', to: 'BR16', distance_km: 1.28 },
  { from: 'BR16', to: 'BR17', distance_km: 0.83 },
  { from: 'BR17', to: 'BR18', distance_km: 1.01 },
  { from: 'BR18', to: 'BR19', distance_km: 1.13 },
  { from: 'BR19', to: 'BR20', distance_km: 0.87 },
  { from: 'BR20', to: 'BR21', distance_km: 1.63 },
  { from: 'BR21', to: 'BR22', distance_km: 0.85 },
  { from: 'BR22', to: 'BR23', distance_km: 1.01 },
  { from: 'BR23', to: 'BR24', distance_km: 0.65 },

  // 環狀線第一階段／西環段
  { from: 'Y07', to: 'Y08', distance_km: 1.56 },
  { from: 'Y08', to: 'Y09', distance_km: 1.12 },
  { from: 'Y09', to: 'Y10', distance_km: 0.85 },
  { from: 'Y10', to: 'Y11', distance_km: 1.16 },
  { from: 'Y11', to: 'Y12', distance_km: 1.44 },
  { from: 'Y12', to: 'Y13', distance_km: 0.64 },
  { from: 'Y13', to: 'Y14', distance_km: 0.73 },
  { from: 'Y14', to: 'Y15', distance_km: 1.39 },
  { from: 'Y15', to: 'Y16', distance_km: 0.95 },
  { from: 'Y16', to: 'Y17', distance_km: 1.42 },
  { from: 'Y17', to: 'Y18', distance_km: 1.80 },
  { from: 'Y18', to: 'Y19', distance_km: 0.62 },
  { from: 'Y19', to: 'Y20', distance_km: 1.56 },
];

export async function seed(knex: Knex): Promise<void> {
  const rows = await knex('stations').select('id', 'code');
  const codeToId = new Map<string, number>();
  for (const row of rows) {
    for (const c of row.code.split(',')) {
      codeToId.set(c, row.id);
    }
  }

  const distances = distanceData.map(({ from, to, distance_km }) => ({
    from_station_id: codeToId.get(from),
    to_station_id: codeToId.get(to),
    distance_km,
  }));

  await knex('station_distances')
    .insert(distances)
    .onConflict(['from_station_id', 'to_station_id'])
    .ignore();
}
