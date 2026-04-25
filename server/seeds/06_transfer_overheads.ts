import type { Knex } from 'knex';

const rows = [
  { transfer_station_sid: 9,   station_codes: 'BR11/G16',  station_name: '南京復興',   sample_count: 254, avg_transfer_time_min: 4.4 },
  { transfer_station_sid: 10,  station_codes: 'BR10/BL15', station_name: '忠孝復興',   sample_count: 392, avg_transfer_time_min: 4.5 },
  { transfer_station_sid: 11,  station_codes: 'BR09/R05',  station_name: '大安',       sample_count: 287, avg_transfer_time_min: 4.6 },
  { transfer_station_sid: 31,  station_codes: 'BR24/BL23', station_name: '南港展覽館', sample_count: 98,  avg_transfer_time_min: 4.3 },
  { transfer_station_sid: 35,  station_codes: 'G03',       station_name: '七張',       sample_count: 17,  avg_transfer_time_min: 2.2 },
  { transfer_station_sid: 36,  station_codes: 'G04/Y07',   station_name: '大坪林',     sample_count: 106, avg_transfer_time_min: 2.5 },
  { transfer_station_sid: 41,  station_codes: 'G09/O05',   station_name: '古亭',       sample_count: 201, avg_transfer_time_min: 1.3 },
  { transfer_station_sid: 42,  station_codes: 'R08/G10',   station_name: '中正紀念堂', sample_count: 258, avg_transfer_time_min: 1.4 },
  { transfer_station_sid: 47,  station_codes: 'O02/Y11',   station_name: '景安',       sample_count: 112, avg_transfer_time_min: 5.3 },
  { transfer_station_sid: 51,  station_codes: 'R10/BL12',  station_name: '台北車站',   sample_count: 424, avg_transfer_time_min: 3.3 },
  { transfer_station_sid: 53,  station_codes: 'R11/G14',   station_name: '中山',       sample_count: 126, avg_transfer_time_min: 2.8 },
  { transfer_station_sid: 55,  station_codes: 'R13/O11',   station_name: '民權西路',   sample_count: 352, avg_transfer_time_min: 2.5 },
  { transfer_station_sid: 64,  station_codes: 'R22',       station_name: '北投',       sample_count: 11,  avg_transfer_time_min: 2.3 },
  { transfer_station_sid: 86,  station_codes: 'G12/BL11',  station_name: '西門',       sample_count: 300, avg_transfer_time_min: 1.3 },
  { transfer_station_sid: 89,  station_codes: 'O07/BL14',  station_name: '忠孝新生',   sample_count: 351, avg_transfer_time_min: 1.5 },
  { transfer_station_sid: 123, station_codes: 'O17/Y18',   station_name: '頭前庄',     sample_count: 124, avg_transfer_time_min: 5.5 },
  { transfer_station_sid: 128, station_codes: 'O12',       station_name: '大橋頭',     sample_count: 45,  avg_transfer_time_min: 0.7 },
  { transfer_station_sid: 132, station_codes: 'G15/O08',   station_name: '松江南京',   sample_count: 133, avg_transfer_time_min: 1.4 },
  { transfer_station_sid: 134, station_codes: 'R07/O06',   station_name: '東門',       sample_count: 198, avg_transfer_time_min: 1.2 },
  { transfer_station_sid: 209, station_codes: 'Y16',       station_name: '板橋',       sample_count: 23,  avg_transfer_time_min: 0.0 },
  { transfer_station_sid: 210, station_codes: 'Y17',       station_name: '新埔民生',   sample_count: 47,  avg_transfer_time_min: 0.0 },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('transfer_overheads').del();
  await knex('transfer_overheads').insert(rows);
}

