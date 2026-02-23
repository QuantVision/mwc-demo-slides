import type { TopologyNode } from '../types';

export const VIEWBOX_W = 1260;
export const VIEWBOX_H = 900;

export const TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: 'nonrt-ric',
    label: 'SMO + Non-RT RIC',
    sublabel: 'Control Cluster',
    x: 340,
    y: 126,
    width: 300,
    height: 96,
    shape: 'server',
    layer: 'management',
  },
  {
    id: 'vismon-ai',
    label: 'VISMON AI',
    sublabel: 'Prompt / Insight Engine',
    x: 780,
    y: 138,
    width: 340,
    height: 190,
    shape: 'cloud',
    layer: 'management',
  },
  {
    id: 'cu',
    label: 'O-CU',
    sublabel: 'CP/UP Manager',
    x: 560,
    y: 310,
    width: 240,
    height: 84,
    shape: 'server',
    layer: 'ran',
  },
  {
    id: 'core',
    label: '5G Core',
    sublabel: 'Virtualized Core Server',
    x: 900,
    y: 310,
    width: 220,
    height: 76,
    shape: 'server',
    layer: 'ran',
  },
  {
    id: 'du-a',
    label: 'O-DU A',
    sublabel: 'Cell A DU',
    x: 430,
    y: 470,
    width: 200,
    height: 82,
    shape: 'server',
    layer: 'ran',
  },
  {
    id: 'du-b',
    label: 'O-DU B',
    sublabel: 'Cell B DU',
    x: 700,
    y: 470,
    width: 200,
    height: 82,
    shape: 'server',
    layer: 'ran',
  },
  {
    id: 'ru-a',
    label: 'RU-A',
    sublabel: 'Benetel 650 · Cell A',
    x: 430,
    y: 640,
    width: 190,
    height: 84,
    shape: 'radio',
    layer: 'ran',
  },
  {
    id: 'ru-b',
    label: 'RU-B',
    sublabel: 'Benetel 550 · Cell B',
    x: 700,
    y: 640,
    width: 190,
    height: 84,
    shape: 'radio',
    layer: 'ran',
  },
  {
    id: 'ue-1',
    label: 'UE1',
    x: 326,
    y: 798,
    width: 42,
    height: 70,
    shape: 'device',
    layer: 'ue',
  },
  {
    id: 'ue-2',
    label: 'UE2',
    x: 810,
    y: 798,
    width: 42,
    height: 70,
    shape: 'device',
    layer: 'ue',
  },
  {
    id: 'cpe-1',
    label: 'CPE',
    x: 560,
    y: 802,
    width: 76,
    height: 50,
    shape: 'cpe',
    layer: 'ue',
  },
  {
    id: 'noc-prompt',
    label: 'NOC Prompt',
    sublabel: 'Engineer interaction',
    x: 1080,
    y: 258,
    width: 188,
    height: 104,
    shape: 'prompt',
    layer: 'noc',
  },
];

export const NODE_MAP: Record<string, TopologyNode> = Object.fromEntries(
  TOPOLOGY_NODES.map((n) => [n.id, n])
);

export const CELL_A = { cx: 430, cy: 760, rx: 190, ry: 116 };
export const CELL_B = { cx: 700, cy: 760, rx: 190, ry: 116 };

export type LinkKind = 'midhaul' | 'fronthaul' | 'telemetry' | 'api' | 'backhaul' | 'noc';

export interface SchematicLink {
  id: string;
  d: string;
  kind: LinkKind;
  label: string;
  labelX: number;
  labelY: number;
}

export const SCHEMATIC_LINKS: SchematicLink[] = [
  {
    id: 'midhaul-a',
    d: 'M 560 352 V 392 H 430 V 429',
    kind: 'midhaul',
    label: 'Midhaul',
    labelX: 468,
    labelY: 388,
  },
  {
    id: 'midhaul-b',
    d: 'M 560 352 V 392 H 700 V 429',
    kind: 'midhaul',
    label: 'Midhaul',
    labelX: 614,
    labelY: 388,
  },
  {
    id: 'fronthaul-a',
    d: 'M 430 511 V 598',
    kind: 'fronthaul',
    label: 'Fronthaul / Split 7.2x',
    labelX: 232,
    labelY: 560,
  },
  {
    id: 'fronthaul-b',
    d: 'M 700 511 V 598',
    kind: 'fronthaul',
    label: 'Fronthaul / Split 7.2x',
    labelX: 508,
    labelY: 560,
  },
  {
    id: 'backhaul-cu-core',
    d: 'M 680 310 H 790',
    kind: 'backhaul',
    label: 'Backhaul',
    labelX: 718,
    labelY: 292,
  },
  {
    id: 'mgmt-cu-ric',
    d: 'M 560 268 V 220 H 340 V 174',
    kind: 'telemetry',
    label: 'Management (O1)',
    labelX: 436,
    labelY: 232,
  },
  {
    id: 'telemetry-du-a',
    d: 'M 430 429 V 220 H 340 V 174',
    kind: 'telemetry',
    label: 'O1/E2 KPI Telemetry',
    labelX: 218,
    labelY: 250,
  },
  {
    id: 'telemetry-du-b',
    d: 'M 700 429 V 200 H 340 V 174',
    kind: 'telemetry',
    label: 'O1/E2 KPI Telemetry',
    labelX: 510,
    labelY: 214,
  },
  {
    id: 'api-ric-vismon',
    d: 'M 490 126 H 610',
    kind: 'api',
    label: 'REST/gRPC',
    labelX: 534,
    labelY: 108,
  },
  {
    id: 'vismon-noc-notify',
    d: 'M 950 170 H 1060 V 208',
    kind: 'noc',
    label: 'Notify',
    labelX: 972,
    labelY: 154,
  },
  {
    id: 'noc-vismon-query',
    d: 'M 1060 258 H 950',
    kind: 'noc',
    label: 'NOC Query',
    labelX: 986,
    labelY: 282,
  },
];

export const LAYER_COLORS: Record<string, string> = {
  management: '#00A6A6',
  ran: '#5BA9D7',
  ue: '#A5D8FF',
  noc: '#E05050',
};
