// @ts-nocheck
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PPTX = '/Users/marcoantoniolourencocarvalho/Desktop/MWC/Mockup Design_v1a.pptx';
const OUTPUT_PATH = path.resolve('src/layout/mockup.caseStudy1.json');

const TARGET_CANVAS = { width: 1920, height: 1080 };

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[match[1]] = decodeEntities(match[2]);
  }
  return attrs;
}

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function localName(name: string): string {
  const idx = name.indexOf(':');
  return idx >= 0 ? name.slice(idx + 1) : name;
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: '__root__', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  const tokenRe = /<[^>]+>|[^<]+/g;
  let tokenMatch: RegExpExecArray | null;

  while ((tokenMatch = tokenRe.exec(xml))) {
    const token = tokenMatch[0];

    if (token.startsWith('<?') || token.startsWith('<!')) continue;

    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    if (token.startsWith('<')) {
      const selfClose = token.endsWith('/>');
      const body = token.slice(1, token.length - (selfClose ? 2 : 1)).trim();
      const spaceIdx = body.search(/\s/);
      const name = spaceIdx === -1 ? body : body.slice(0, spaceIdx);
      const attrsRaw = spaceIdx === -1 ? '' : body.slice(spaceIdx + 1);
      const node: XmlNode = {
        name,
        attrs: parseAttrs(attrsRaw),
        children: [],
        text: '',
      };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
      continue;
    }

    const text = decodeEntities(token);
    if (text.trim().length > 0) {
      stack[stack.length - 1].text += text;
    }
  }

  return root;
}

function allNodes(node: XmlNode): XmlNode[] {
  const out: XmlNode[] = [node];
  for (const child of node.children) out.push(...allNodes(child));
  return out;
}

function findFirst(node: XmlNode, pred: (n: XmlNode) => boolean): XmlNode | null {
  if (pred(node)) return node;
  for (const child of node.children) {
    const hit = findFirst(child, pred);
    if (hit) return hit;
  }
  return null;
}

function findChild(node: XmlNode, name: string): XmlNode | null {
  return node.children.find((child) => localName(child.name) === name) ?? null;
}

function findChildren(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((child) => localName(child.name) === name);
}

function textContent(node: XmlNode): string {
  const parts: string[] = [];
  const walk = (n: XmlNode) => {
    if (n.text) parts.push(n.text);
    for (const c of n.children) walk(c);
  };
  walk(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function numberAttr(node: XmlNode | null, key: string, fallback = 0): number {
  if (!node) return fallback;
  const raw = node.attrs[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface Xfrm {
  offX: number;
  offY: number;
  extX: number;
  extY: number;
  chOffX: number;
  chOffY: number;
  chExtX: number;
  chExtY: number;
}

function readXfrm(node: XmlNode | null): Xfrm {
  const xfrm = node ? findFirst(node, (n) => localName(n.name) === 'xfrm') : null;
  const off = xfrm ? findChild(xfrm, 'off') : null;
  const ext = xfrm ? findChild(xfrm, 'ext') : null;
  const chOff = xfrm ? findChild(xfrm, 'chOff') : null;
  const chExt = xfrm ? findChild(xfrm, 'chExt') : null;

  return {
    offX: numberAttr(off, 'x', 0),
    offY: numberAttr(off, 'y', 0),
    extX: numberAttr(ext, 'cx', 0),
    extY: numberAttr(ext, 'cy', 0),
    chOffX: numberAttr(chOff, 'x', 0),
    chOffY: numberAttr(chOff, 'y', 0),
    chExtX: numberAttr(chExt, 'cx', 0),
    chExtY: numberAttr(chExt, 'cy', 0),
  };
}

interface Affine {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

function composeGroup(parent: Affine, group: Xfrm): Affine {
  const sx = group.chExtX !== 0 ? group.extX / group.chExtX : 1;
  const sy = group.chExtY !== 0 ? group.extY / group.chExtY : 1;

  return {
    scaleX: parent.scaleX * sx,
    scaleY: parent.scaleY * sy,
    offsetX: parent.offsetX + parent.scaleX * (group.offX - sx * group.chOffX),
    offsetY: parent.offsetY + parent.scaleY * (group.offY - sy * group.chOffY),
  };
}

function applyAffine(parent: Affine, xfrm: Xfrm) {
  return {
    x: parent.offsetX + parent.scaleX * xfrm.offX,
    y: parent.offsetY + parent.scaleY * xfrm.offY,
    w: parent.scaleX * xfrm.extX,
    h: parent.scaleY * xfrm.extY,
  };
}

function parseColor(node: XmlNode | null): string | null {
  if (!node) return null;
  const solidFill = findFirst(node, (n) => localName(n.name) === 'solidFill');
  if (!solidFill) return null;
  const srgb = findChild(solidFill, 'srgbClr');
  if (srgb?.attrs.val) return `#${srgb.attrs.val}`;
  const scheme = findChild(solidFill, 'schemeClr');
  if (scheme?.attrs.val) return `scheme:${scheme.attrs.val}`;
  return null;
}

function parseTextInfo(shape: XmlNode) {
  const txBody = findChild(shape, 'txBody');
  if (!txBody) {
    return {
      text: '',
      fontSizePt: null,
      fontWeight: null,
      color: null,
      align: null,
    };
  }

  const paragraphs = findChildren(txBody, 'p');
  const lines: string[] = [];
  let fontSizePt: number | null = null;
  let fontWeight: number | null = null;
  let color: string | null = null;
  let align: string | null = null;

  for (const p of paragraphs) {
    const pPr = findChild(p, 'pPr');
    if (!align && pPr?.attrs.algn) align = pPr.attrs.algn;

    const runs = findChildren(p, 'r');
    const lineParts: string[] = [];

    for (const run of runs) {
      const rPr = findChild(run, 'rPr');
      const t = findChild(run, 't');
      if (t?.text) lineParts.push(t.text);

      if (rPr && fontSizePt === null && rPr.attrs.sz) {
        const sz = Number(rPr.attrs.sz);
        if (Number.isFinite(sz)) fontSizePt = sz / 100;
      }
      if (rPr && fontWeight === null && rPr.attrs.b !== undefined) {
        fontWeight = rPr.attrs.b === '1' ? 700 : 400;
      }
      if (rPr && !color) color = parseColor(rPr);
    }

    if (lineParts.length === 0) {
      const pText = textContent(p);
      if (pText) lineParts.push(pText);
    }

    lines.push(lineParts.join(''));

    if (fontSizePt === null || fontWeight === null || !color) {
      const endPara = findChild(p, 'endParaRPr');
      if (endPara && fontSizePt === null && endPara.attrs.sz) {
        const sz = Number(endPara.attrs.sz);
        if (Number.isFinite(sz)) fontSizePt = sz / 100;
      }
      if (endPara && fontWeight === null && endPara.attrs.b !== undefined) {
        fontWeight = endPara.attrs.b === '1' ? 700 : 400;
      }
      if (endPara && !color) color = parseColor(endPara);
    }
  }

  return {
    text: lines.join('\n').replace(/\n+/g, '\n').trim(),
    fontSizePt,
    fontWeight,
    color,
    align,
  };
}

function readPptxEntry(pptxPath: string, entry: string): string {
  return execFileSync('unzip', ['-p', pptxPath, entry], { encoding: 'utf8' });
}

function emuToStageFactory(slideCx: number, slideCy: number) {
  const emuPerPxX = slideCx / TARGET_CANVAS.width;
  const emuPerPxY = slideCy / TARGET_CANVAS.height;
  return {
    x: (emu: number) => Number((emu / emuPerPxX).toFixed(3)),
    y: (emu: number) => Number((emu / emuPerPxY).toFixed(3)),
  };
}

interface ExtractedItem {
  kind: 'shape' | 'picture' | 'connector';
  id: string;
  name: string;
  geom: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  cornerAdj: number | null;
  text: string;
  fontSizePx: number | null;
  fontWeight: number | null;
  textColor: string | null;
  textAlign: string | null;
  fill: string | null;
  stroke: string | null;
  imageRid: string | null;
  imageTarget: string | null;
}

function contains(region: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
}

function area(r: { w: number; h: number }): number {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

function pickContainerForLabel(items: ExtractedItem[], labelPattern: RegExp): ExtractedItem | null {
  const label = items.find((item) => item.text && labelPattern.test(item.text));
  if (!label) return null;

  const cx = label.x + label.w / 2;
  const cy = label.y + label.h / 2;

  const candidates = items
    .filter((item) => item.kind === 'shape' && item.geom && contains(item, cx, cy) && area(item) >= area(label) * 1.15)
    .sort((a, b) => area(a) - area(b));

  return candidates[0] ?? null;
}

function closestShapeContainingPoint(items: ExtractedItem[], point: { x: number; y: number }, minArea = 1): ExtractedItem | null {
  const candidates = items
    .filter((item) => item.kind === 'shape' && contains(item, point.x, point.y) && area(item) >= minArea)
    .sort((a, b) => area(a) - area(b));
  return candidates[0] ?? null;
}

function normalizeRegion(item: ExtractedItem | null, fallback: { x: number; y: number; w: number; h: number }) {
  if (!item) return fallback;
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

function clampRect(rect: { x: number; y: number; w: number; h: number }) {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const right = Math.min(TARGET_CANVAS.width, rect.x + rect.w);
  const bottom = Math.min(TARGET_CANVAS.height, rect.y + rect.h);
  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    w: Number(Math.max(0, right - x).toFixed(3)),
    h: Number(Math.max(0, bottom - y).toFixed(3)),
  };
}

function pickPanelNearBadge(items: ExtractedItem[], badgePattern: RegExp): ExtractedItem | null {
  const badge = items.find((item) => item.text && badgePattern.test(item.text));
  if (!badge) return null;

  const overlapWidth = (a: ExtractedItem, b: ExtractedItem) => {
    const left = Math.max(a.x, b.x);
    const right = Math.min(a.x + a.w, b.x + b.w);
    return Math.max(0, right - left);
  };

  const candidates = items
    .filter((item) => {
      if (item.kind !== 'shape') return false;
      if (item.id === badge.id) return false;
      if (item.y >= badge.y + 20) return false;
      const gap = badge.y - (item.y + item.h);
      if (gap < -16 || gap > 120) return false;
      if (overlapWidth(item, badge) < Math.min(item.w, badge.w) * 0.35) return false;
      return area(item) > area(badge) * 2;
    })
    .sort((a, b) => {
      const gapA = Math.abs(badge.y - (a.y + a.h));
      const gapB = Math.abs(badge.y - (b.y + b.h));
      if (gapA !== gapB) return gapA - gapB;
      return area(a) - area(b);
    });

  return candidates[0] ?? null;
}

function toRect(item: ExtractedItem) {
  return {
    id: item.id,
    name: item.name,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    cornerRadiusAdj: item.cornerAdj,
  };
}

function main() {
  const pptxPath = process.argv[2] ?? DEFAULT_PPTX;
  if (!fs.existsSync(pptxPath)) {
    throw new Error(`PPTX not found: ${pptxPath}`);
  }

  const presentationXml = readPptxEntry(pptxPath, 'ppt/presentation.xml');
  const slideXml = readPptxEntry(pptxPath, 'ppt/slides/slide1.xml');
  const relsXml = readPptxEntry(pptxPath, 'ppt/slides/_rels/slide1.xml.rels');

  const presentationRoot = parseXml(presentationXml);
  const slideRoot = parseXml(slideXml);
  const relsRoot = parseXml(relsXml);

  const sldSz = findFirst(presentationRoot, (n) => localName(n.name) === 'sldSz');
  const slideCx = numberAttr(sldSz, 'cx', 12192000);
  const slideCy = numberAttr(sldSz, 'cy', 6858000);
  const emuToStage = emuToStageFactory(slideCx, slideCy);

  const relMap: Record<string, string> = {};
  for (const rel of allNodes(relsRoot).filter((n) => localName(n.name) === 'Relationship')) {
    if (rel.attrs.Id && rel.attrs.Target) relMap[rel.attrs.Id] = rel.attrs.Target;
  }

  const spTree = findFirst(slideRoot, (n) => localName(n.name) === 'spTree');
  if (!spTree) throw new Error('Could not find spTree in slide');

  const extracted: ExtractedItem[] = [];

  function visit(container: XmlNode, parentAffine: Affine) {
    for (const child of container.children) {
      const kind = localName(child.name);

      if (kind === 'grpSp') {
        const grpPr = findChild(child, 'grpSpPr');
        const gxf = readXfrm(grpPr);
        const nextAffine = composeGroup(parentAffine, gxf);
        visit(child, nextAffine);
        continue;
      }

      if (kind !== 'sp' && kind !== 'pic' && kind !== 'cxnSp') continue;

      const nv = findFirst(child, (n) => {
        const ln = localName(n.name);
        return ln === 'cNvPr';
      });

      const id = nv?.attrs.id ?? '';
      const name = nv?.attrs.name ?? '';

      const spPr = findChild(child, 'spPr');
      const xfrm = readXfrm(spPr);
      const boundsEmu = applyAffine(parentAffine, xfrm);

      const geomNode = findFirst(spPr ?? child, (n) => localName(n.name) === 'prstGeom');
      const geom = geomNode?.attrs.prst ?? null;
      const gd = findFirst(geomNode ?? child, (n) => localName(n.name) === 'gd' && n.attrs.name === 'adj');
      const cornerAdj = gd?.attrs.fmla?.startsWith('val ') ? Number(gd.attrs.fmla.slice(4)) : null;

      const fill = parseColor(spPr);
      const ln = findFirst(spPr ?? child, (n) => localName(n.name) === 'ln');
      const stroke = parseColor(ln);

      const textInfo = kind === 'sp' ? parseTextInfo(child) : {
        text: '',
        fontSizePt: null,
        fontWeight: null,
        color: null,
        align: null,
      };

      let imageRid: string | null = null;
      let imageTarget: string | null = null;
      if (kind === 'pic') {
        const blip = findFirst(child, (n) => localName(n.name) === 'blip');
        imageRid = blip?.attrs['r:embed'] ?? null;
        if (imageRid) imageTarget = relMap[imageRid] ?? null;
      }

      extracted.push({
        kind: kind === 'sp' ? 'shape' : kind === 'pic' ? 'picture' : 'connector',
        id,
        name,
        geom,
        x: emuToStage.x(boundsEmu.x),
        y: emuToStage.y(boundsEmu.y),
        w: emuToStage.x(boundsEmu.w),
        h: emuToStage.y(boundsEmu.h),
        cornerAdj: Number.isFinite(cornerAdj) ? cornerAdj : null,
        text: textInfo.text,
        fontSizePx: textInfo.fontSizePt ? Number(((textInfo.fontSizePt * 96) / 72).toFixed(2)) : null,
        fontWeight: textInfo.fontWeight,
        textColor: textInfo.color,
        textAlign: textInfo.align,
        fill,
        stroke,
        imageRid,
        imageTarget,
      });
    }
  }

  visit(spTree, { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 });

  const titleShape = pickContainerForLabel(extracted, /Case Study 1: Anomaly Detection & Resolution rApp/i);
  const commandShape = pickContainerForLabel(extracted, /Control Pannel|Control Panel/i);
  const tabsLeft = pickContainerForLabel(extracted, /Case Study 1 ADR/i);
  const tabsRight = pickContainerForLabel(extracted, /Case Study 2 XYZ/i);
  const leftTopologyShape = extracted
    .filter((item) => item.kind === 'shape' && item.x < 200 && item.y > 90 && item.w > 800 && item.h > 500)
    .sort((a, b) => area(b) - area(a))[0] ?? null;
  const narrativeShape = pickContainerForLabel(extracted, /Case Study Narrative/i);
  const livePerfShape = pickContainerForLabel(extracted, /Live Performance/i);
  const stageFlowShape = pickContainerForLabel(extracted, /Stage Flow Pane/i);
  const eventsShape = pickContainerForLabel(extracted, /Event\/Signalling Pane/i);
  const footerShape = pickContainerForLabel(extracted, /Collaborating Partners/i);

  const tabsRegion = (() => {
    if (!tabsLeft || !tabsRight) return { x: 0, y: 0, w: 420, h: 38 };
    const x = Math.min(tabsLeft.x, tabsRight.x);
    const y = Math.min(tabsLeft.y, tabsRight.y);
    const right = Math.max(tabsLeft.x + tabsLeft.w, tabsRight.x + tabsRight.w);
    const bottom = Math.max(tabsLeft.y + tabsLeft.h, tabsRight.y + tabsRight.h);
    return clampRect({ x, y, w: Number((right - x).toFixed(3)), h: Number((bottom - y).toFixed(3)) });
  })();

  const topologyRegion = normalizeRegion(leftTopologyShape, { x: 6, y: 123, w: 914, h: 920 });

  const topologyItems = extracted.filter((item) => {
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    return contains(topologyRegion, cx, cy);
  });

  const topologyComponents = {
    ricsmo: pickContainerForLabel(topologyItems, /NOC\/RIC\/NIC|SMO/i),
    gnb: pickContainerForLabel(topologyItems, /gNB/i),
    core: pickContainerForLabel(topologyItems, /^CORE$/i),
    oru1: pickContainerForLabel(topologyItems, /ORU-1/i),
    oru2: pickContainerForLabel(topologyItems, /ORU-2/i),
    vismonAi: pickPanelNearBadge(topologyItems, /AI CO-WORKER/i) ?? pickContainerForLabel(topologyItems, /VISMON AI Prompt|VISMON AI/i),
    vismonEnergy: pickPanelNearBadge(topologyItems, /ENERGY/i) ?? pickContainerForLabel(topologyItems, /ENERGY/i),
    coverageEllipses: topologyItems
      .filter((item) => item.kind === 'shape' && item.geom === 'ellipse' && item.w > 250 && item.y > topologyRegion.y + topologyRegion.h * 0.5)
      .map(toRect),
    ueTextBoxes: topologyItems
      .filter((item) => item.kind === 'shape' && /\bUE\b|UE\n[12]/i.test(item.text) && item.w < 120)
      .map(toRect),
    cpeIcons: topologyItems
      .filter((item) => item.kind === 'picture' && item.w > 60 && item.w < 180 && item.h > 40 && item.h < 120 && item.y > topologyRegion.y + topologyRegion.h * 0.65)
      .map((item) => ({ ...toRect(item), image: item.imageTarget })),
  };

  const textBoxes = extracted
    .filter((item) => item.text.length > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      text: item.text,
      fontSizePx: item.fontSizePx,
      fontWeight: item.fontWeight,
      color: item.textColor,
      align: item.textAlign,
    }));

  const images = extracted
    .filter((item) => item.kind === 'picture')
    .map((item) => ({
      id: item.id,
      name: item.name,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      rid: item.imageRid,
      target: item.imageTarget,
    }));

  const layout = {
    source: {
      pptxPath,
      slideIndex: 1,
      extractedAt: new Date().toISOString(),
      slideSizeEmu: { cx: slideCx, cy: slideCy },
      slideSizePx: {
        width: Number((slideCx / 9525).toFixed(3)),
        height: Number((slideCy / 9525).toFixed(3)),
      },
    },
    canvas: {
      width: TARGET_CANVAS.width,
      height: TARGET_CANVAS.height,
    },
    regions: {
      header: clampRect(normalizeRegion(titleShape, { x: 8.884, y: 15.0, w: 1902.0, h: 97.9 })),
      tabs: tabsRegion,
      leftTopology: clampRect(topologyRegion),
      rightNarrative: clampRect(normalizeRegion(narrativeShape, { x: 931.0, y: 124.0, w: 979.0, h: 122.0 })),
      rightPanes: {
        metrics: clampRect(normalizeRegion(livePerfShape, { x: 931.0, y: 253.0, w: 249.0, h: 791.0 })),
        workflow: clampRect(normalizeRegion(stageFlowShape, { x: 1195.0, y: 253.0, w: 374.0, h: 791.0 })),
        events: clampRect(normalizeRegion(eventsShape, { x: 1584.0, y: 253.0, w: 326.0, h: 791.0 })),
      },
      footer: clampRect(normalizeRegion(footerShape, { x: 8.0, y: 1038.0, w: 1902.0, h: 36.0 })),
      demoCommands: clampRect(normalizeRegion(commandShape, { x: 1108.0, y: 24.0, w: 795.0, h: 83.0 })),
    },
    topology: {
      bounds: topologyRegion,
      components: {
        ricsmo: topologyComponents.ricsmo ? toRect(topologyComponents.ricsmo) : null,
        gnb: topologyComponents.gnb ? toRect(topologyComponents.gnb) : null,
        core: topologyComponents.core ? toRect(topologyComponents.core) : null,
        oru1: topologyComponents.oru1 ? toRect(topologyComponents.oru1) : null,
        oru2: topologyComponents.oru2 ? toRect(topologyComponents.oru2) : null,
        vismonAi: topologyComponents.vismonAi ? toRect(topologyComponents.vismonAi) : null,
        vismonEnergy: topologyComponents.vismonEnergy ? toRect(topologyComponents.vismonEnergy) : null,
        coverageEllipses: topologyComponents.coverageEllipses,
        ueIcons: topologyComponents.ueTextBoxes,
        cpeIcons: topologyComponents.cpeIcons,
      },
    },
    textBoxes,
    images,
    raw: extracted,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(layout, null, 2)}\n`, 'utf8');

  console.log(`Wrote layout JSON to ${OUTPUT_PATH}`);
}

main();
